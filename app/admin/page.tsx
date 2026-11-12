import Link from "next/link";
import { ENTITIES } from "@/lib/admin";
import { can, requireUser } from "@/lib/auth";

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const u = await requireUser();
  const denied = (await searchParams).denied;
  const cards = [
    ...Object.entries(ENTITIES).filter(([, e]) => can(u, e.perm)).map(([k, e]) => ({ href: `/admin/${k}`, label: e.title })),
    ...(can(u, "landing") ? [{ href: "/admin/landing", label: "Landing page editor" }] : []),
    ...(can(u, "users") ? [{ href: "/admin/users", label: "Users" }] : []),
  ];
  return (
    <div className="grid gap-4">
      <h1 className="text-xl font-bold">Hello, {u.username}</h1>
      {denied && <p className="rounded-md border border-danger p-2 text-sm text-danger">You don&apos;t have access to that area.</p>}
      {!cards.length && <p className="text-sm text-muted">No areas assigned yet. Ask a superadmin.</p>}
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
        {cards.map((c) => <Link key={c.href} href={c.href} className="rounded-md border border-line bg-surface p-4 font-medium">{c.label}</Link>)}
      </div>
    </div>
  );
}
