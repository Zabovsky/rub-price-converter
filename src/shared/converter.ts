import type { CurrencyRate, RateMap } from "./types";

export function convertToRub(
  amount: number,
  currencyCode: string,
  rates: RateMap,
): { rub: number; rate: CurrencyRate } | null {
  const rate = rates[currencyCode];
  if (!rate) return null;

  const rubPerUnit = rate.rubPerUnit;
  if (!Number.isFinite(rubPerUnit) || rubPerUnit <= 0) return null;

  return { rub: amount * rubPerUnit, rate };
}

export function formatRub(amount: number): string {
  if (amount >= 1000) {
    return amount.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 0,
    });
  }
  if (amount >= 100) {
    return amount.toLocaleString("ru-RU", {
      minimumFractionDigits: 0,
      maximumFractionDigits: 1,
    });
  }
  return amount.toLocaleString("ru-RU", {
    minimumFractionDigits: 2,
    maximumFractionDigits: 2,
  });
}
