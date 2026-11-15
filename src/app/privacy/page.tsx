import Link from "next/link";
import type { Metadata } from "next";

export const metadata: Metadata = {
  title: "Privacy Policy — Ledger",
  description: "How Ledger handles your financial data.",
};

export default function PrivacyPage() {
  return (
    <main className="mx-auto min-h-dvh max-w-2xl px-5 py-10 text-[var(--text)]">
      <p className="text-xs font-semibold uppercase tracking-wide text-[var(--muted)]">Ledger</p>
      <h1 className="font-display mt-1 text-3xl font-extrabold tracking-tight">Privacy Policy</h1>
      <p className="mt-2 text-sm text-[var(--muted)]">Last updated: 15 November 2026</p>

      <div className="prose-sm mt-8 space-y-5 text-sm leading-relaxed text-[var(--text)]">
        <p>
          Ledger (“the App”) is a personal finance and tour-expense tracker. This policy explains what
          data we store and how it is used.
        </p>

        <h2 className="font-display text-lg font-bold">Data we collect</h2>
        <ul className="list-disc space-y-1 pl-5">
          <li>Account email and authentication credentials (handled by Supabase Auth).</li>
          <li>
            Financial records you enter: accounts, transactions, budgets, debts, gifts, tour groups,
            contributions, and settlements.
          </li>
          <li>Optional profile settings such as display currency and household membership.</li>
        </ul>

        <h2 className="font-display text-lg font-bold">How we use data</h2>
        <p>
          Data is used only to provide the App’s features to you (and household or tour members you
          invite). We do not sell personal data. We do not show third-party advertising.
        </p>

        <h2 className="font-display text-lg font-bold">Storage and security</h2>
        <p>
          Data is stored in a Supabase (Postgres) project with Row Level Security so each user can
          only access their own rows, plus records explicitly shared via household or tour invites.
          Connections use HTTPS.
        </p>

        <h2 className="font-display text-lg font-bold">Sharing</h2>
        <p>
          You may invite others into a household or tour. Those people can see the shared data for
          that group. Admins of the deployment may manage accounts for support when you contact them.
        </p>

        <h2 className="font-display text-lg font-bold">Retention and deletion</h2>
        <p>
          You can delete transactions and related records inside the App. To delete your entire
          account and associated data, contact the operator at the email used for your Play Store /
          support listing.
        </p>

        <h2 className="font-display text-lg font-bold">Children</h2>
        <p>The App is not directed at children under 13.</p>

        <h2 className="font-display text-lg font-bold">Contact</h2>
        <p>
          Questions about this policy: use the support email on the Google Play listing for Ledger.
        </p>
      </div>

      <p className="mt-10">
        <Link href="/login" className="text-sm font-semibold text-[var(--primary)]">
          ← Back to Ledger
        </Link>
      </p>
    </main>
  );
}
