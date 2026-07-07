export type RateSource = "cbr" | "market" | "moex";

export interface Settings {
  enabled: boolean;
  rateSource: RateSource;
  blacklist: string[];
}

export interface CurrencyRate {
  code: string;
  /** RUB per 1 unit of foreign currency */
  rubPerUnit: number;
  nominal: number;
  source: RateSource;
  /** True when source fell back to CBR for this currency */
  fallback?: boolean;
}

export interface RateMap {
  [currencyCode: string]: CurrencyRate;
}

export interface RatesCache {
  source: RateSource;
  rates: RateMap;
  fetchedAt: number;
}

export interface ParsedPrice {
  amount: number;
  currencyCode: string;
  fullMatch: string;
  start: number;
  end: number;
}

export const DEFAULT_SETTINGS: Settings = {
  enabled: true,
  rateSource: "cbr",
  blacklist: [],
};

export const RATE_SOURCE_LABELS: Record<RateSource, string> = {
  cbr: "ЦБ РФ",
  market: "Рыночный курс",
  moex: "Московская биржа",
};

export const RATE_SOURCE_HINTS: Record<RateSource, string> = {
  cbr: "Официальный курс Центрального банка России",
  market: "Агрегированный рыночный курс (open.er-api.com)",
  moex: "Котировки валютного рынка MOEX, для остальных валют — ЦБ РФ",
};

export const LEGACY_RATE_SOURCES = ["sber", "tinkoff"] as const;

export const CACHE_TTL_MS = 45 * 60 * 1000;

export const MESSAGE = {
  GET_SETTINGS: "GET_SETTINGS",
  SET_SETTINGS: "SET_SETTINGS",
  GET_RATES: "GET_RATES",
  REFRESH_RATES: "REFRESH_RATES",
  SETTINGS_CHANGED: "SETTINGS_CHANGED",
  RESCAN_PAGE: "RESCAN_PAGE",
} as const;
