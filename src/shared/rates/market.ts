import { buildRate, type RateProvider } from "./provider";
import { fetchJson, mergeWithCbrFallback } from "./utils";
import type { RateMap } from "../types";

interface MarketResponse {
  base_code: string;
  rates: Record<string, number>;
}

const MARKET_URL = "https://open.er-api.com/v6/latest/USD";

export const marketProvider: RateProvider = {
  id: "market",
  name: "Рыночный курс",

  async fetchRates(): Promise<RateMap> {
    const data = await fetchJson<MarketResponse>(MARKET_URL);
    const rubPerUsd = data.rates.RUB;
    if (!rubPerUsd) {
      throw new Error("Рыночный API не вернул курс RUB");
    }

    const rates: RateMap = {};
    for (const [code, value] of Object.entries(data.rates)) {
      if (!value || value <= 0) continue;

      const rubPerUnit = code === "USD" ? rubPerUsd : rubPerUsd / value;
      rates[code] = buildRate(code, rubPerUnit, "market");
    }

    return mergeWithCbrFallback(rates, "market");
  },
};

export async function fetchMarketRates(): Promise<RateMap> {
  return marketProvider.fetchRates();
}
