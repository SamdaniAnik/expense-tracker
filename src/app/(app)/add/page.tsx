import Link from "next/link";
import { getAccounts, getUsedCategories } from "@/lib/data";
import { categorySuggestions } from "@/lib/categories";
import { createTx } from "../transactions/actions";
import TxForm from "@/components/TxForm";
import { Empty } from "@/components/ui";

export default async function AddPage() {
  const [accounts, used] = await Promise.all([getAccounts(), getUsedCategories()]);
  const active = accounts.filter((a) => !a.archived);

  return (
    <div>
      <h1 className="mb-4 text-xl font-bold">Add transaction</h1>
      {active.length === 0 ? (
        <Empty>
          You need an account first.{" "}
          <Link href="/accounts" className="font-semibold text-[var(--primary)]">Create one</Link>.
        </Empty>
      ) : (
        <TxForm
          accounts={active}
          categories={categorySuggestions(used)}
          onSubmit={createTx}
          submitLabel="Add"
        />
      )}
    </div>
  );
}
