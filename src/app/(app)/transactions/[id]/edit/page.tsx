import { notFound } from "next/navigation";
import { getAccounts, getUsedCategories, getTransaction } from "@/lib/data";
import { categorySuggestions } from "@/lib/categories";
import { updateTx, deleteTx } from "../../actions";
import TxForm from "@/components/TxForm";

export default async function EditTxPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [tx, accounts, used] = await Promise.all([
    getTransaction(id),
    getAccounts(),
    getUsedCategories(),
  ]);
  if (!tx) notFound();

  return (
    <div>
      <div className="mb-5 rise">
        <p className="text-xs font-bold uppercase tracking-[0.18em] text-[var(--primary)]">Edit</p>
        <h1 className="mt-1 text-2xl font-extrabold tracking-tight sm:text-3xl">Edit transaction</h1>
      </div>
      <TxForm
        accounts={accounts}
        categories={categorySuggestions(used)}
        initial={tx}
        onSubmit={updateTx.bind(null, id)}
        onDelete={deleteTx.bind(null, id)}
        submitLabel="Save changes"
      />
    </div>
  );
}
