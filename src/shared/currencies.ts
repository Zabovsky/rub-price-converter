export interface CurrencyDefinition {
  code: string;
  symbols: string[];
  names: string[];
}

/** Major currencies supported by bank APIs + exotic via CBR fallback */
export const CURRENCIES: CurrencyDefinition[] = [
  { code: "USD", symbols: ["$", "US$"], names: ["доллар", "dollar", "usd"] },
  { code: "EUR", symbols: ["€"], names: ["евро", "euro", "eur"] },
  { code: "GBP", symbols: ["£"], names: ["фунт", "pound", "gbp"] },
  { code: "CNY", symbols: ["¥", "元", "CN¥"], names: ["юан", "yuan", "cny", "rmb"] },
  { code: "JPY", symbols: ["¥", "JP¥", "円"], names: ["йен", "yen", "jpy"] },
  { code: "HKD", symbols: ["HK$", "HKD$"], names: ["гонконг", "hkd", "hong kong"] },
  { code: "VND", symbols: ["₫", "đ", "Đ"], names: ["донг", "dong", "vnd"] },
  { code: "KRW", symbols: ["₩"], names: ["вон", "won", "krw"] },
  { code: "THB", symbols: ["฿"], names: ["бат", "baht", "thb"] },
  { code: "CHF", symbols: ["CHF", "Fr."], names: ["франк", "swiss", "chf"] },
  { code: "TRY", symbols: ["₺"], names: ["лир", "lira", "try"] },
  { code: "AED", symbols: ["د.إ", "AED"], names: ["дирхам", "aed"] },
  { code: "SGD", symbols: ["S$"], names: ["сингапур", "sgd"] },
  { code: "AUD", symbols: ["A$", "AU$"], names: ["австрал", "aud"] },
  { code: "CAD", symbols: ["C$", "CA$"], names: ["канад", "cad"] },
  { code: "INR", symbols: ["₹"], names: ["рупи", "rupee", "inr"] },
  { code: "BYN", symbols: ["Br"], names: ["белорус", "byn"] },
  { code: "KZT", symbols: ["₸"], names: ["тенге", "kzt"] },
];

/** Currencies commonly available on MOEX and market APIs */
export const BANK_CURRENCY_CODES = [
  "USD",
  "EUR",
  "GBP",
  "CNY",
  "JPY",
  "HKD",
  "CHF",
  "TRY",
  "AED",
  "SGD",
  "AUD",
  "CAD",
  "KZT",
  "BYN",
];

export const RUBLE_MARKERS = /(?:₽|руб(?:\.|лей|ля)?|RUB)/i;

function escapeRegex(value: string): string {
  return value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
}

function buildCurrencyPattern(def: CurrencyDefinition): string {
  const tokens = [
    ...def.symbols.map(escapeRegex),
    def.code,
    ...def.names.map(escapeRegex),
  ];
  return `(?:${tokens.join("|")})`;
}

const numberPattern = String.raw`(?:\d{1,3}(?:[ \u00A0\u202F.,]\d{3})+|\d{1,3}(?:\.\d{3})+|\d+)(?:[.,]\d{1,2})?`;

export function buildPriceRegexes(): RegExp[] {
  const currencyGroup = CURRENCIES.map(buildCurrencyPattern).join("|");

  return [
    new RegExp(`(?<amount>${numberPattern})\\s*(?<currency>${currencyGroup})(?!\\w)`, "giu"),
    new RegExp(`(?<currency>${currencyGroup})\\s*(?<amount>${numberPattern})(?!\\d)`, "giu"),
  ];
}

const CODE_ALIASES: Record<string, string> = {
  $: "USD",
  "US$": "USD",
  "€": "EUR",
  "£": "GBP",
  "¥": "CNY",
  "元": "CNY",
  "CN¥": "CNY",
  "JP¥": "JPY",
  "円": "JPY",
  "HK$": "HKD",
  "HKD$": "HKD",
  "₫": "VND",
  đ: "VND",
  Đ: "VND",
  "₩": "KRW",
  "฿": "THB",
  "₺": "TRY",
  "د.إ": "AED",
  "S$": "SGD",
  "A$": "AUD",
  "AU$": "AUD",
  "C$": "CAD",
  "CA$": "CAD",
  "₹": "INR",
  Br: "BYN",
  "₸": "KZT",
};

export function resolveCurrencyCode(raw: string): string | null {
  const token = raw.trim();
  const upper = token.toUpperCase();

  if (CODE_ALIASES[token]) return CODE_ALIASES[token];
  if (/^[A-Z]{3}$/.test(upper)) return upper;

  const lower = token.toLowerCase();
  for (const def of CURRENCIES) {
    if (def.code === upper) return def.code;
    if (def.symbols.some((s) => s.toLowerCase() === lower)) return def.code;
    if (def.names.some((n) => lower.includes(n))) return def.code;
  }
  return null;
}

function isDotThousandsFormat(parts: string[]): boolean {
  if (parts.length < 2) return false;
  if (parts.some((part) => !/^\d+$/.test(part))) return false;

  const groups = parts.slice(1);
  return groups.every((part) => part.length === 3);
}

export function parseAmount(raw: string, currencyCode?: string): number {
  let value = raw.replace(/[\u00A0\u202F\s]/g, "");

  const lastComma = value.lastIndexOf(",");
  const lastDot = value.lastIndexOf(".");

  if (lastComma > -1 && lastDot > -1) {
    if (lastComma > lastDot) {
      value = value.replace(/\./g, "").replace(",", ".");
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (lastComma > -1) {
    const parts = value.split(",");
    if (parts.length === 2 && parts[1].length <= 2) {
      value = `${parts[0].replace(/\./g, "")}.${parts[1]}`;
    } else {
      value = value.replace(/,/g, "");
    }
  } else if (lastDot > -1) {
    const parts = value.split(".");
    if (isDotThousandsFormat(parts)) {
      value = parts.join("");
    } else if (parts.length === 2 && parts[1].length === 3 && currencyCode === "VND") {
      // 20.990đ → 20990
      value = parts.join("");
    } else if (parts.length > 2) {
      const decimal = parts.pop()!;
      value = `${parts.join("")}.${decimal}`;
    }
  }

  const amount = Number.parseFloat(value);
  return Number.isFinite(amount) ? amount : NaN;
}
