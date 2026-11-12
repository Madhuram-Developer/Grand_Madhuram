import Link from "next/link";
import { notFound } from "next/navigation";
import { DocForm } from "@/components/admin/Form";
import { getEntity, listDocs, loadDoc } from "@/lib/admin";
import { requirePerm } from "@/lib/auth";

export default async function EntityList({ params }: PageProps<"/admin/[entity]">) {
  const { entity } = await params;
  const e = getEntity(entity);
  if (!e) notFound();
  await requirePerm(e.perm);

  if (e.singleton) {
    const [doc, tabs] = await Promise.all([loadDoc(entity), e.tabs()]);
    return (
      <div className="grid max-w-4xl gap-4">
        <h1 className="text-xl font-bold">{e.title}</h1>
        <DocForm entity={entity} id={doc?._id ?? null} initial={doc} tabs={tabs} />
      </div>
    );
  }

  const rows = await listDocs(entity);
  return (
    <div className="grid max-w-4xl gap-4">
      <div className="flex items-center justify-between">
        <h1 className="text-xl font-bold">{e.title}</h1>
        <Link href={`/admin/${entity}/new`} className="rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink">+ New</Link>
      </div>
      <ul className="divide-y divide-line rounded-md border border-line bg-surface">
        {rows.map((r) => (
          <li key={r.id}>
            <Link href={`/admin/${entity}/${r.id}`} className="flex justify-between px-3 py-2 text-sm hover:bg-bg">
              <span className="font-medium">{r.label}</span> <span className="text-muted">{r.sub}</span>
            </Link>
          </li>
        ))}
        {!rows.length && <li className="px-3 py-2 text-sm text-muted">Nothing yet.</li>}
      </ul>
    </div>
  );
}
