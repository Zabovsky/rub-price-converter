import {
  buildPriceRegexes,
  parseAmount,
  resolveCurrencyCode,
  RUBLE_MARKERS,
} from "./currencies";
import type { ParsedPrice } from "./types";

function overlaps(existing: ParsedPrice[], start: number, end: number): boolean {
  return existing.some((item) => start < item.end && end > item.start);
}

export function findPricesInText(text: string): ParsedPrice[] {
  if (!text?.trim()) return [];

  const results: ParsedPrice[] = [];

  for (const regex of buildPriceRegexes()) {
    const pattern = new RegExp(regex.source, regex.flags);
    let match: RegExpExecArray | null;

    while ((match = pattern.exec(text)) !== null) {
      const amountRaw = match.groups?.amount;
      const currencyRaw = match.groups?.currency;
      if (!amountRaw || !currencyRaw) continue;

      const currencyCode = resolveCurrencyCode(currencyRaw);
      if (!currencyCode) continue;

      const amount = parseAmount(amountRaw, currencyCode);
      if (!Number.isFinite(amount) || amount <= 0) continue;

      const start = match.index;
      const end = start + match[0].length;
      if (overlaps(results, start, end)) continue;

      const context = text.slice(Math.max(0, start - 8), Math.min(text.length, end + 16));
      if (RUBLE_MARKERS.test(context)) continue;

      results.push({
        amount,
        currencyCode,
        fullMatch: match[0],
        start,
        end,
      });
    }
  }

  return results.sort((a, b) => a.start - b.start);
}
