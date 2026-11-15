/** Starter categories + keyword-based guessing, shared by the form's
 * suggestions and the history import. */

export const DEFAULT_CATEGORIES = [
  "Salary",
  "Bonus",
  "Family",
  "Cash out",
  "Transfer",
  "Food",
  "Groceries",
  "Medicine",
  "Transport",
  "Shopping",
  "Bills",
  "Mobile recharge",
  "Rent",
  "Gift",
  "Health",
  "Travel",
  "Entertainment",
  "Fees",
  "Other",
] as const;

const RULES: [RegExp, string][] = [
  [/salary/i, "Salary"],
  [/bonus|eid bonus|peon bonus/i, "Bonus"],
  [/cash ?out|cashout|cash in/i, "Cash out"],
  [/transfer|send money|scb transfer|bkash transfer/i, "Transfer"],
  [/salary bkash/i, "Salary"],
  [/medicine|doctor|hospital|medical|pharma|arogga|test|ultra|usg|scan|health/i, "Medicine"],
  [/recharge|flexi|flexiload|mobile recharge|sim/i, "Mobile recharge"],
  [/internet|wifi|net bill|desco|cylinder|gas|electric/i, "Bills"],
  [/credit card|card bill|card payment|vat|tax|excise|annual fee/i, "Bills"],
  [/train|bus|uber|pathao|cng|rickshaw|ticket|metro|air ?fare|flight|auto/i, "Transport"],
  [/food|restaurant|khabar|dinner|lunch|breakfast|chillox|madchef|foodpanda|kacchi|pizza|coffee|snacks|nasta|cake|khanas|sultan/i, "Food"],
  [/csd|bazar|grocery|groceries|milk|egg|murgi|fish|shobji|oil|rice/i, "Groceries"],
  [/shopping|shirt|pant|panjabi|saree|shari|dress|shoe|juta|borka|hijab|tailor|aarong|gentle ?park|blazer/i, "Shopping"],
  [/gift|salami|wedding|biye|donation|hadiah/i, "Gift"],
  [/abbu|ammu|nirjon|sabbir|mamun|akib|sumaiya|nanu|pritom|hasan|shehab|koushik|khala|fupu|mama|kaka|dada/i, "Family"],
  [/rent|house/i, "Rent"],
  [/spotify|youtube|netflix|game|khela|football|fpl|epl/i, "Entertainment"],
];

export function guessCategory(description: string): string {
  const d = description ?? "";
  for (const [re, cat] of RULES) {
    if (re.test(d)) return cat;
  }
  return "Other";
}

/** Merge defaults with the user's own used categories, de-duped. */
export function categorySuggestions(used: string[]): string[] {
  const set = new Set<string>([...used, ...DEFAULT_CATEGORIES]);
  return [...set];
}
