import browser from "webextension-polyfill";
import { getRateProvider } from "../shared/rates";
import { getSettings, setSettings } from "../shared/storage";
import {
  CACHE_TTL_MS,
  MESSAGE,
  type RatesCache,
  type RateSource,
  type Settings,
} from "../shared/types";

const RATES_CACHE_KEY = "ratesCache";

async function readCache(source: RateSource): Promise<RatesCache | null> {
  const result = await browser.storage.local.get(RATES_CACHE_KEY);
  const cache = result[RATES_CACHE_KEY] as RatesCache | undefined;
  if (!cache || cache.source !== source) return null;
  if (Date.now() - cache.fetchedAt > CACHE_TTL_MS) return null;
  return cache;
}

async function writeCache(cache: RatesCache): Promise<void> {
  await browser.storage.local.set({ [RATES_CACHE_KEY]: cache });
}

export async function fetchRatesForSource(
  source: RateSource,
  force = false,
): Promise<RatesCache> {
  if (!force) {
    const cached = await readCache(source);
    if (cached) return cached;
  }

  const provider = getRateProvider(source);
  const rates = await provider.fetchRates();
  const cache: RatesCache = {
    source,
    rates,
    fetchedAt: Date.now(),
  };
  await writeCache(cache);
  return cache;
}

async function broadcastRescan(): Promise<void> {
  const tabs = await browser.tabs.query({});
  await Promise.all(
    tabs.map(async (tab) => {
      if (tab.id == null) return;
      try {
        await browser.tabs.sendMessage(tab.id, { type: MESSAGE.RESCAN_PAGE });
      } catch {
        // Content script may not be injected on this tab.
      }
    }),
  );
}

browser.runtime.onMessage.addListener((message: unknown) => {
  const payload = message as {
    type?: string;
    settings?: Settings;
    source?: RateSource;
  };
  const type = payload.type;

  if (type === MESSAGE.GET_SETTINGS) {
    return getSettings();
  }

  if (type === MESSAGE.SET_SETTINGS) {
    const settings = payload.settings;
    if (!settings) return undefined;
    return setSettings(settings).then(async () => {
      await fetchRatesForSource(settings.rateSource, true);
      await broadcastRescan();
      return settings;
    });
  }

  if (type === MESSAGE.GET_RATES) {
    const source = payload.source;
    return getSettings().then((settings) =>
      fetchRatesForSource(source ?? settings.rateSource),
    );
  }

  if (type === MESSAGE.REFRESH_RATES) {
    const source = payload.source;
    return getSettings().then((settings) =>
      fetchRatesForSource(source ?? settings.rateSource, true),
    );
  }

  return undefined;
});

getSettings().then((settings) => {
  if (settings.enabled) {
    fetchRatesForSource(settings.rateSource).catch(() => {
      // Warm cache on startup; errors are surfaced in popup.
    });
  }
});
