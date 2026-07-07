import browser from "webextension-polyfill";
import { DEFAULT_SETTINGS, LEGACY_RATE_SOURCES, type Settings } from "./types";

const SETTINGS_KEY = "settings";

function normalizeSettings(raw: Partial<Settings> | undefined): Settings {
  const merged = { ...DEFAULT_SETTINGS, ...raw };
  if (
    raw?.rateSource &&
    (LEGACY_RATE_SOURCES as readonly string[]).includes(raw.rateSource)
  ) {
    merged.rateSource = "cbr";
  }
  return merged;
}

export async function getSettings(): Promise<Settings> {
  const result = await browser.storage.sync.get(SETTINGS_KEY);
  return normalizeSettings(result[SETTINGS_KEY] as Partial<Settings> | undefined);
}

export async function setSettings(settings: Settings): Promise<void> {
  await browser.storage.sync.set({ [SETTINGS_KEY]: settings });
}

export async function updateSettings(patch: Partial<Settings>): Promise<Settings> {
  const current = await getSettings();
  const next = { ...current, ...patch };
  await setSettings(next);
  return next;
}

export function isDomainBlacklisted(hostname: string, blacklist: string[]): boolean {
  const host = hostname.toLowerCase();
  return blacklist.some((entry) => {
    const normalized = entry.toLowerCase().replace(/^\./, "");
    return host === normalized || host.endsWith(`.${normalized}`);
  });
}
