import { buildRate, type RateProvider } from "./provider";
import { fetchJson, mergeWithCbrFallback } from "./utils";
import type { RateMap } from "../types";

interface MoexTable {
  columns: string[];
  data: Array<Array<string | number>>;
}

interface MoexResponse {
  cbrf: MoexTable;
}

const MOEX_URL =
  "https://iss.moex.com/iss/statistics/engines/currency/markets/selt/rates.json?iss.meta=off";

const MOEX_COLUMNS: Record<string, string> = {
  CBRF_USD_LAST: "USD",
  CBRF_EUR_LAST: "EUR",
};

export const moexProvider: RateProvider = {
  id: "moex",
  name: "Московская биржа",

  async fetchRates(): Promise<RateMap> {
    const data = await fetchJson<MoexResponse>(MOEX_URL);
    const row = data.cbrf?.data?.[0];
    const columns = data.cbrf?.columns ?? [];

    if (!row || columns.length === 0) {
      throw new Error("MOEX не вернул курсы");
    }

    const rates: RateMap = {};
    for (const [column, code] of Object.entries(MOEX_COLUMNS)) {
      const index = columns.indexOf(column);
      if (index === -1) continue;

      const value = Number(row[index]);
      if (!Number.isFinite(value) || value <= 0) continue;

      rates[code] = buildRate(code, value, "moex");
    }

    if (Object.keys(rates).length === 0) {
      throw new Error("MOEX не содержит курсов USD/EUR");
    }

    return mergeWithCbrFallback(rates, "moex");
  },
};

export async function fetchMoexRates(): Promise<RateMap> {
  return moexProvider.fetchRates();
}
