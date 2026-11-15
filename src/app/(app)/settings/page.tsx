import { getProfile } from "@/lib/profiles";
import { SUPPORTED_CURRENCIES, convert, formatMoney } from "@/lib/fx";
import { updateSettings } from "./actions";

export default async function SettingsPage() {
  const profile = await getProfile();
  const currency = profile?.display_currency || "BDT";

  const samples = await Promise.all(
    [
      { amount: 100, from: "USD" },
      { amount: 100, from: "EUR" },
      { amount: 1000, from: "INR" },
    ].map(async (s) => ({
      ...s,
      converted: await convert(s.amount, s.from, currency),
    })),
  );

  return (
    <div>
      <div className="mb-5">
        <h1 className="font-display text-2xl font-extrabold tracking-tight">Settings</h1>
        <p className="text-sm text-[var(--muted)]">Profile and display currency</p>
      </div>

      <form action={updateSettings} className="card mb-6 max-w-lg space-y-4 p-5">
        <div>
          <label className="label">Display name</label>
          <input
            name="display_name"
            className="input"
            defaultValue={profile?.display_name ?? ""}
            required
          />
        </div>
        <div>
          <label className="label">Display currency</label>
          <select
            name="display_currency"
            className="input"
            defaultValue={currency}
          >
            {SUPPORTED_CURRENCIES.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-[var(--muted)]">
            Totals and tour balances can be shown in this currency (ECB/Frankfurter rates; BDT via USD peg).
          </p>
        </div>
        <button className="btn btn-primary w-full">Save settings</button>
      </form>

      <div className="card max-w-lg p-5">
        <p className="text-xs font-bold uppercase tracking-wide text-[var(--muted)]">
          FX preview → {currency}
        </p>
        <ul className="mt-3 space-y-2 text-sm">
          {samples.map((s) => (
            <li key={s.from} className="flex justify-between">
              <span>
                {formatMoney(s.amount, s.from)}
              </span>
              <span className="font-semibold tabular-nums">
                {formatMoney(s.converted, currency)}
              </span>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
