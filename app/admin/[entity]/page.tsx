import Link from "next/link";
import { connection } from "next/server";
import { notFound } from "next/navigation";
import { ActionBar } from "@/components/admin/ActionBar";
import { DeleteButton } from "@/components/admin/DeleteButton";
import { DocForm } from "@/components/admin/Form";
import { ButtonLink, Card } from "@/components/kit";
import { getEntity, listDocs, loadDoc } from "@/lib/admin";
import { requirePerm } from "@/lib/auth";

export default async function EntityList({ params }: PageProps<"/admin/[entity]">) {
  await connection(); // per-request page: lets auth + data load in parallel below
  const { entity } = await params;
  const e = getEntity(entity);
  if (!e) notFound();

  if (e.singleton) {
    const [, doc, tabs] = await Promise.all([requirePerm(e.perm), loadDoc(entity), e.tabs()]);
    return (
      <div className="max-w-4xl">
        <DocForm entity={entity} id={doc?._id ?? null} initial={doc} tabs={tabs} title={e.title} />
      </div>
    );
  }

  const [, rows] = await Promise.all([requirePerm(e.perm), listDocs(entity)]);
  return (
    <div className="grid max-w-4xl gap-4">
      <ActionBar title={e.title}>
        <ButtonLink href={`/admin/${entity}/new`}>+ New {e.title.toLowerCase().replace(/s$/, "")}</ButtonLink>
      </ActionBar>
      <Card className="overflow-hidden">
        <ul className="divide-y divide-line">
        {rows.map((r) => (
          <li key={r.id} className="flex items-center gap-2 pr-3 hover:bg-surface-2">
            <Link href={`/admin/${entity}/${r.id}`} className="flex min-w-0 flex-1 items-center justify-between gap-3 px-4 py-3 text-sm">
              <span className="truncate font-medium">{r.label}</span> <span className="shrink-0 text-muted">{r.sub}</span>
            </Link>
            <DeleteButton entity={entity} id={r.id} label={r.label} />
          </li>
        ))}
        {!rows.length && <li className="px-4 py-3 text-sm text-muted">Nothing yet.</li>}
        </ul>
      </Card>
    </div>
  );
}
