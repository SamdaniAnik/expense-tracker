import Link from "next/link";
import { getAccounts, getUsedCategories } from "@/lib/data";
import { categorySuggestions } from "@/lib/categories";
import { createTx } from "../transactions/actions";
import TxForm from "@/components/TxForm";
import { Empty } from "@/components/ui";

export default async function AddPage({
  searchParams,
}: {
  searchParams: Promise<{ m?: string; date?: string }>;
}) {
  const sp = await searchParams;
  const [accounts, used] = await Promise.all([getAccounts(), getUsedCategories()]);
  const active = accounts.filter((a) => !a.archived);

  const month = sp.m;
  const defaultDate =
    sp.date ??
    (month
      ? (() => {
          const now = new Date();
          const current = `${now.getFullYear()}-${String(now.getMonth() + 1).padStart(2, "0")}`;
          return month === current ? now.toISOString().slice(0, 10) : `${month}-01`;
        })()
      : undefined);

  const returnTo = month ? `/months?m=${month}` : undefined;
  const title = month
    ? `Add — ${new Date(month + "-01T00:00:00").toLocaleDateString("en-GB", {
        month: "long",
        year: "numeric",
      })}`
    : "Add transaction";

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">{title}</h1>
      {active.length === 0 ? (
        <Empty>
          You need an account first.{" "}
          <Link href="/accounts" className="font-semibold text-[var(--primary)]">
            Create one
          </Link>
          .
        </Empty>
      ) : (
        <TxForm
          accounts={active}
          categories={categorySuggestions(used)}
          defaultDate={defaultDate}
          returnTo={returnTo}
          onSubmit={createTx}
          submitLabel="Add"
        />
      )}
    </div>
  );
}
