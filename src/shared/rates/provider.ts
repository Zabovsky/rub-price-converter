import type { CurrencyRate, RateMap, RateSource } from "../types";

export interface RateProvider {
  id: RateSource;
  name: string;
  fetchRates(): Promise<RateMap>;
}

export function buildRate(
  code: string,
  rubPerUnit: number,
  source: RateSource,
  options: Partial<CurrencyRate> = {},
): CurrencyRate {
  return {
    code,
    rubPerUnit,
    nominal: options.nominal ?? 1,
    source,
    fallback: options.fallback,
  };
}
