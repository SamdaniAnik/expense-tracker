/** Money helpers. Amounts are stored as decimal BDT but summed via integer
 * paisa (1/100) to avoid floating-point drift. */

export function toPaisa(amount: number): number {
  return Math.round(amount * 100);
}

export function fromPaisa(paisa: number): number {
  return paisa / 100;
}

/** Sum a list of decimal amounts without float drift. */
export function sumAmounts(amounts: number[]): number {
  const total = amounts.reduce((acc, n) => acc + toPaisa(n), 0);
  return fromPaisa(total);
}

const bdt = new Intl.NumberFormat("en-US", {
  minimumFractionDigits: 2,
  maximumFractionDigits: 2,
});

/** Format a number as BDT, e.g. 63960.36 -> "৳63,960.36", -500 -> "-৳500.00". */
export function formatBDT(amount: number): string {
  const sign = amount < 0 ? "-" : "";
  return `${sign}৳${bdt.format(Math.abs(amount))}`;
}

/** Compact form for charts/cards, e.g. 263210 -> "৳263.2k". */
export function formatBDTCompact(amount: number): string {
  const abs = Math.abs(amount);
  const sign = amount < 0 ? "-" : "";
  if (abs >= 1_000_000) return `${sign}৳${(abs / 1_000_000).toFixed(1)}M`;
  if (abs >= 1_000) return `${sign}৳${(abs / 1_000).toFixed(1)}k`;
  return `${sign}৳${abs.toFixed(0)}`;
}

/** Parse a user/sheet string like "63,960.36" or "৳1,000" into a number.
 * Returns NaN when there is no numeric content. */
export function parseAmount(input: string | number | null | undefined): number {
  if (input === null || input === undefined) return NaN;
  if (typeof input === "number") return input;
  const cleaned = input.replace(/[^0-9.-]/g, "");
  if (cleaned === "" || cleaned === "-" || cleaned === "." || cleaned === "-.") {
    return NaN;
  }
  return Number(cleaned);
}
