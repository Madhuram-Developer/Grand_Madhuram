import Link from "next/link";
import { notFound } from "next/navigation";
import { DocForm } from "@/components/admin/Form";
import { getEntity, loadDoc } from "@/lib/admin";
import { requirePerm } from "@/lib/auth";

export default async function EntityEdit({ params }: PageProps<"/admin/[entity]/[id]">) {
  const { entity, id } = await params;
  const e = getEntity(entity);
  if (!e || e.singleton) notFound();
  await requirePerm(e.perm);
  const [doc, tabs] = await Promise.all([loadDoc(entity, id), e.tabs()]);
  if (!doc) notFound();
  const isNew = id === "new";
  const viewUrl = entity === "projects" && doc.slug && doc.status === "published" ? `/en/projects/${doc.slug}` : undefined;
  return (
    <div className="grid max-w-4xl gap-4">
      <div>
        <Link href={`/admin/${entity}`} className="text-sm text-muted">← {e.title}</Link>
        <h1 className="text-xl font-bold">{isNew ? `New ${e.title.toLowerCase().replace(/s$/, "")}` : e.label(doc) || "(untitled)"}</h1>
      </div>
      <DocForm key={id} entity={entity} id={isNew ? null : id} initial={doc} tabs={tabs} back={`/admin/${entity}`} viewUrl={viewUrl} />
    </div>
  );
}
