import { unstable_cache } from "next/cache";

export const SUPPORTED_CURRENCIES = [
  "BDT",
  "USD",
  "EUR",
  "GBP",
  "INR",
  "AED",
  "SAR",
  "CAD",
  "AUD",
  "SGD",
  "JPY",
  "CNY",
] as const;

export type CurrencyCode = (typeof SUPPORTED_CURRENCIES)[number];

const SYMBOLS: Record<string, string> = {
  BDT: "৳",
  USD: "$",
  EUR: "€",
  GBP: "£",
  INR: "₹",
  AED: "د.إ",
  SAR: "﷼",
  CAD: "C$",
  AUD: "A$",
  SGD: "S$",
  JPY: "¥",
  CNY: "¥",
};

/** Frankfurter (ECB) does not include BDT — we pin a reasonable BDT per USD fallback and
 * derive other pairs via EUR/USD cross when needed. */
const BDT_PER_USD_FALLBACK = 122;

type RateMap = Record<string, number>;

async function fetchFrankfurter(): Promise<{ base: string; rates: RateMap }> {
  const res = await fetch("https://api.frankfurter.app/latest?from=EUR", {
    next: { revalidate: 43200 },
  });
  if (!res.ok) throw new Error(`FX fetch failed: ${res.status}`);
  const json = (await res.json()) as { base: string; rates: RateMap };
  return { base: json.base || "EUR", rates: json.rates || {} };
}

const getCachedRates = unstable_cache(
  async () => {
    try {
      return await fetchFrankfurter();
    } catch {
      return {
        base: "EUR",
        rates: {
          USD: 1.08,
          GBP: 0.86,
          INR: 90,
          CAD: 1.47,
          AUD: 1.65,
          SGD: 1.45,
          JPY: 163,
          CNY: 7.8,
          AED: 3.97,
          SAR: 4.05,
        } as RateMap,
      };
    }
  },
  ["fx-rates-eur"],
  { revalidate: 43200 },
);

/** Convert amount from one currency to another using EUR-cross + BDT peg. */
export async function convert(
  amount: number,
  from: string,
  to: string,
): Promise<number> {
  const f = from.toUpperCase();
  const t = to.toUpperCase();
  if (!Number.isFinite(amount) || f === t) return amount;

  const { rates } = await getCachedRates();
  // rates are EUR-based: 1 EUR = rates[X] X
  const eurTo: RateMap = { EUR: 1, ...rates };

  // Inject BDT via USD peg
  const usd = eurTo.USD || 1.08;
  eurTo.BDT = usd * BDT_PER_USD_FALLBACK;

  const fromRate = eurTo[f];
  const toRate = eurTo[t];
  if (!fromRate || !toRate) return amount;

  // amount_in_eur = amount / fromRate; result = amount_in_eur * toRate
  return Math.round(((amount / fromRate) * toRate) * 100) / 100;
}

export function formatMoney(amount: number, currency = "BDT"): string {
  const c = currency.toUpperCase();
  const sign = amount < 0 ? "-" : "";
  const abs = Math.abs(amount);
  const formatted = new Intl.NumberFormat("en-US", {
    minimumFractionDigits: c === "JPY" ? 0 : 2,
    maximumFractionDigits: c === "JPY" ? 0 : 2,
  }).format(abs);
  const sym = SYMBOLS[c] ?? `${c} `;
  return `${sign}${sym}${formatted}`;
}

export function formatMoneyCompact(amount: number, currency = "BDT"): string {
  const c = currency.toUpperCase();
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  const sym = SYMBOLS[c] ?? `${c} `;
  if (abs >= 1_000_000) return `${sign}${sym}${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}${sym}${(abs / 1_000).toFixed(1)}k`;
  return formatMoney(amount, c);
}
