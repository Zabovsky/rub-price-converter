import type { RateMap, RateSource } from "../types";

export async function fetchJson<T>(url: string, init?: RequestInit): Promise<T> {
  const response = await fetch(url, init);
  const text = await response.text();

  if (!response.ok) {
    throw new Error(`HTTP ${response.status} для ${url}`);
  }

  const trimmed = text.trim();
  if (trimmed.startsWith("<") || trimmed.startsWith("<!")) {
    throw new Error("Сервер вернул HTML вместо JSON");
  }

  try {
    return JSON.parse(text) as T;
  } catch {
    throw new Error("Не удалось разобрать ответ как JSON");
  }
}

export async function mergeWithCbrFallback(
  bankRates: RateMap,
  source: RateSource,
): Promise<RateMap> {
  const { fetchCbrRates } = await import("./cbr");
  const cbrRates = await fetchCbrRates();
  const merged: RateMap = { ...cbrRates };

  for (const [code, rate] of Object.entries(bankRates)) {
    merged[code] = { ...rate, source, fallback: false };
  }

  for (const [code, rate] of Object.entries(merged)) {
    if (!bankRates[code] && rate.source === "cbr") {
      merged[code] = { ...rate, fallback: true };
    }
  }

  return merged;
}
