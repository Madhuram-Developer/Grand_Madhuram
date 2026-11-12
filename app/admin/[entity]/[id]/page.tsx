import { notFound } from "next/navigation";
import { connection } from "next/server";
import { DocForm } from "@/components/admin/Form";
import { getEntity, loadDoc } from "@/lib/admin";
import { requirePerm } from "@/lib/auth";

export default async function EntityEdit({ params }: PageProps<"/admin/[entity]/[id]">) {
  await connection(); // per-request page: lets auth + data load in parallel below
  const { entity, id } = await params;
  const e = getEntity(entity);
  if (!e || e.singleton) notFound();
  // auth + data in parallel saves a DB round trip; requirePerm's redirect rejects the whole Promise.all
  const [, doc, tabs] = await Promise.all([requirePerm(e.perm), loadDoc(entity, id), e.tabs()]);
  if (!doc) notFound();
  const isNew = id === "new";
  const viewUrl = entity === "projects" && doc.slug && doc.status === "published" ? `/en/projects/${doc.slug}` : undefined;
  return (
    <div className="max-w-4xl">
      <DocForm
        key={id}
        entity={entity}
        id={isNew ? null : id}
        initial={doc}
        tabs={tabs}
        title={isNew ? `New ${e.title.toLowerCase().replace(/s$/, "")}` : e.label(doc) || "(untitled)"}
        back={{ href: `/admin/${entity}`, label: e.title }}
        viewUrl={viewUrl}
      />
    </div>
  );
}
