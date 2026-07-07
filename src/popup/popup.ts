import browser from "webextension-polyfill";
import { getSettings, setSettings } from "../shared/storage";
import {
  MESSAGE,
  RATE_SOURCE_HINTS,
  RATE_SOURCE_LABELS,
  type RatesCache,
  type Settings,
} from "../shared/types";

const enabledInput = document.getElementById("enabled") as HTMLInputElement;
const rateSourceSelect = document.getElementById("rateSource") as HTMLSelectElement;
const rateSourceHint = document.getElementById("rateSourceHint") as HTMLParagraphElement;
const updatedAt = document.getElementById("updatedAt") as HTMLParagraphElement;
const refreshButton = document.getElementById("refreshRates") as HTMLButtonElement;
const blacklistButton = document.getElementById("blacklistSite") as HTMLButtonElement;
const status = document.getElementById("status") as HTMLParagraphElement;

let currentSettings: Settings;

function setStatus(message: string, isError = false): void {
  status.textContent = message;
  status.style.color = isError ? "#dc2626" : "#16a34a";
}

function updateRateSourceHint(): void {
  const source = rateSourceSelect.value as Settings["rateSource"];
  rateSourceHint.textContent = RATE_SOURCE_HINTS[source];
}

function formatUpdatedAt(cache: RatesCache): string {
  const date = new Date(cache.fetchedAt);
  return `Обновлено: ${date.toLocaleString("ru-RU")} (${RATE_SOURCE_LABELS[cache.source]})`;
}

async function loadRates(force = false): Promise<void> {
  try {
    const cache = (await browser.runtime.sendMessage({
      type: force ? MESSAGE.REFRESH_RATES : MESSAGE.GET_RATES,
      source: currentSettings.rateSource,
    })) as RatesCache;

    updatedAt.textContent = formatUpdatedAt(cache);
    setStatus("");
  } catch (error) {
    updatedAt.textContent = "Курс не загружен";
    setStatus(error instanceof Error ? error.message : "Ошибка загрузки курса", true);
  }
}

async function saveSettings(): Promise<void> {
  currentSettings = {
    ...currentSettings,
    enabled: enabledInput.checked,
    rateSource: rateSourceSelect.value as Settings["rateSource"],
  };

  await browser.runtime.sendMessage({
    type: MESSAGE.SET_SETTINGS,
    settings: currentSettings,
  });

  updateRateSourceHint();
  await loadRates(true);
  setStatus("Настройки сохранены");
}

async function blacklistCurrentSite(): Promise<void> {
  const [tab] = await browser.tabs.query({ active: true, currentWindow: true });
  if (!tab?.url) {
    setStatus("Не удалось определить сайт", true);
    return;
  }

  const hostname = new URL(tab.url).hostname;
  if (!hostname) {
    setStatus("Не удалось определить сайт", true);
    return;
  }

  if (!currentSettings.blacklist.includes(hostname)) {
    currentSettings = {
      ...currentSettings,
      blacklist: [...currentSettings.blacklist, hostname],
    };
    await setSettings(currentSettings);
    await browser.runtime.sendMessage({
      type: MESSAGE.SET_SETTINGS,
      settings: currentSettings,
    });
  }

  setStatus(`Сайт ${hostname} добавлен в исключения`);
}

async function init(): Promise<void> {
  currentSettings = await getSettings();

  enabledInput.checked = currentSettings.enabled;
  rateSourceSelect.value = currentSettings.rateSource;
  updateRateSourceHint();

  await loadRates();

  enabledInput.addEventListener("change", () => {
    saveSettings().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Ошибка сохранения", true);
    });
  });

  rateSourceSelect.addEventListener("change", () => {
    saveSettings().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Ошибка сохранения", true);
    });
  });

  refreshButton.addEventListener("click", () => {
    loadRates(true).catch((error) => {
      setStatus(error instanceof Error ? error.message : "Ошибка обновления", true);
    });
  });

  blacklistButton.addEventListener("click", () => {
    blacklistCurrentSite().catch((error) => {
      setStatus(error instanceof Error ? error.message : "Ошибка", true);
    });
  });
}

init().catch((error) => {
  setStatus(error instanceof Error ? error.message : "Ошибка инициализации", true);
});
