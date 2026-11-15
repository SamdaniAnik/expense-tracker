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
      <h1 className="mb-4 text-xl font-bold">Edit transaction</h1>
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
