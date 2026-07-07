import browser from "webextension-polyfill";
import { convertToRub, formatRub } from "../shared/converter";
import { findPricesInText } from "../shared/parser";
import { isDomainBlacklisted } from "../shared/storage";
import {
  MESSAGE,
  RATE_SOURCE_LABELS,
  type RatesCache,
  type Settings,
} from "../shared/types";

const PROCESSED_NODES = new WeakSet<Text>();
const SKIP_TAGS = new Set([
  "SCRIPT",
  "STYLE",
  "NOSCRIPT",
  "TEXTAREA",
  "INPUT",
  "SELECT",
  "OPTION",
  "CODE",
  "PRE",
  "SVG",
]);

let settings: Settings | null = null;
let ratesCache: RatesCache | null = null;
let scanScheduled = false;
let scanTarget: Node | null = null;
let observer: MutationObserver | null = null;

async function loadState(): Promise<void> {
  settings = (await browser.runtime.sendMessage({ type: MESSAGE.GET_SETTINGS })) as Settings;
  ratesCache = (await browser.runtime.sendMessage({
    type: MESSAGE.GET_RATES,
    source: settings.rateSource,
  })) as RatesCache;
}

function shouldSkipNode(node: Node): boolean {
  let current: Node | null = node;

  while (current) {
    if (current.nodeType === Node.ELEMENT_NODE) {
      const element = current as Element;
      if (SKIP_TAGS.has(element.tagName)) return true;
      if (element.classList.contains("rub-converter-price")) return true;
      if (element.closest(`.rub-converter-price`)) return true;
    }
    if (current.nodeType === Node.TEXT_NODE && PROCESSED_NODES.has(current as Text)) {
      return true;
    }
    current = current.parentNode;
  }

  return false;
}

function buildTooltip(rateLabel: string, fallback?: boolean): string {
  if (fallback) {
    return `Курс ЦБ РФ (нет в ${rateLabel})`;
  }
  return `Курс: ${rateLabel}`;
}

function insertConversion(textNode: Text, price: ReturnType<typeof findPricesInText>[number]): void {
  if (!settings?.enabled || !ratesCache) return;

  const converted = convertToRub(
    price.amount,
    price.currencyCode,
    ratesCache.rates,
  );
  if (!converted) return;

  const parent = textNode.parentElement;
  if (!parent || shouldSkipNode(textNode)) return;

  const fullText = textNode.data;
  const before = fullText.slice(0, price.start);
  const matchText = fullText.slice(price.start, price.end);
  const after = fullText.slice(price.end);

  const beforeNode = before ? document.createTextNode(before) : null;
  const matchNode = document.createTextNode(matchText);
  const afterNode = after ? document.createTextNode(after) : null;

  const span = document.createElement("span");
  span.className = "rub-converter-price";
  span.textContent = ` (~${formatRub(converted.rub)} ₽)`;
  span.title = buildTooltip(
    RATE_SOURCE_LABELS[settings.rateSource],
    converted.rate.fallback,
  );

  const fragment = document.createDocumentFragment();
  if (beforeNode) fragment.appendChild(beforeNode);
  fragment.appendChild(matchNode);
  fragment.appendChild(span);
  if (afterNode) fragment.appendChild(afterNode);

  parent.replaceChild(fragment, textNode);
  PROCESSED_NODES.add(matchNode);

  if (afterNode) {
    processTextNode(afterNode);
  }
}

function processTextNode(textNode: Text): void {
  if (!settings?.enabled || !ratesCache) return;
  if (shouldSkipNode(textNode)) return;

  const prices = findPricesInText(textNode.data);
  if (prices.length === 0) return;

  for (let i = prices.length - 1; i >= 0; i -= 1) {
    insertConversion(textNode, prices[i]);
  }
}

function scanRoot(root: Node): void {
  if (!settings?.enabled || !ratesCache) return;
  if (isDomainBlacklisted(location.hostname, settings.blacklist)) return;

  const walker = document.createTreeWalker(root, NodeFilter.SHOW_TEXT, {
    acceptNode(node) {
      if (!(node instanceof Text)) return NodeFilter.FILTER_REJECT;
      if (!node.data.trim()) return NodeFilter.FILTER_REJECT;
      if (shouldSkipNode(node)) return NodeFilter.FILTER_REJECT;
      return NodeFilter.FILTER_ACCEPT;
    },
  });

  const nodes: Text[] = [];
  let current = walker.nextNode();
  while (current) {
    nodes.push(current as Text);
    current = walker.nextNode();
  }

  for (const node of nodes) {
    if (node.isConnected) {
      processTextNode(node);
    }
  }
}

function scheduleScan(root: Node = document.body): void {
  if (!root) return;

  if (root === document.body) {
    scanTarget = document.body;
  } else if (!scanTarget) {
    scanTarget = root;
  } else if (scanTarget !== document.body) {
    // Multiple unrelated subtrees changed in one frame — scan the whole page.
    scanTarget = document.body;
  }

  if (scanScheduled) return;
  scanScheduled = true;

  requestAnimationFrame(() => {
    scanScheduled = false;
    const target = scanTarget ?? document.body;
    scanTarget = null;
    scanRoot(target);
  });
}

function startObserver(): void {
  if (observer || !document.body) return;

  observer = new MutationObserver((mutations) => {
    for (const mutation of mutations) {
      if (mutation.type === "characterData") {
        if (mutation.target instanceof Text) {
          processTextNode(mutation.target);
        }
        continue;
      }

      for (const node of mutation.addedNodes) {
        if (node.nodeType === Node.TEXT_NODE) {
          processTextNode(node as Text);
        } else if (node.nodeType === Node.ELEMENT_NODE) {
          scheduleScan(node);
        }
      }
    }
  });

  observer.observe(document.body, {
    childList: true,
    characterData: true,
    subtree: true,
  });
}

async function init(): Promise<void> {
  await loadState();
  if (!settings?.enabled) return;
  if (isDomainBlacklisted(location.hostname, settings.blacklist)) return;

  if (document.body) {
    scheduleScan(document.body);
    startObserver();
  } else {
    document.addEventListener(
      "DOMContentLoaded",
      () => {
        scheduleScan(document.body);
        startObserver();
      },
      { once: true },
    );
  }
}

browser.runtime.onMessage.addListener(async (message: unknown) => {
  const type = (message as { type?: string }).type;
  if (type !== MESSAGE.RESCAN_PAGE) return;

  await loadState();
  scheduleScan(document.body);
});

init().catch(() => {
  // Silent fail on pages where extension context is unavailable.
});
