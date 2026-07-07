import { buildRate, type RateProvider } from "./provider";
import { fetchJson } from "./utils";
import type { RateMap } from "../types";

interface CbrValute {
  CharCode: string;
  Nominal: number;
  Value: number;
}

interface CbrResponse {
  Valute: Record<string, CbrValute>;
}

const CBR_URL = "https://www.cbr-xml-daily.ru/daily_json.js";

export const cbrProvider: RateProvider = {
  id: "cbr",
  name: "ЦБ РФ",

  async fetchRates(): Promise<RateMap> {
    const data = await fetchJson<CbrResponse>(CBR_URL);
    const rates: RateMap = {};

    for (const valute of Object.values(data.Valute)) {
      const rubPerUnit = valute.Value / valute.Nominal;
      rates[valute.CharCode] = buildRate(valute.CharCode, rubPerUnit, "cbr", {
        nominal: valute.Nominal,
      });
    }

    return rates;
  },
};

export async function fetchCbrRates(): Promise<RateMap> {
  return cbrProvider.fetchRates();
}
