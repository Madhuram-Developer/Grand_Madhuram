import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { Html } from "@/components/Chrome";
import { logout } from "@/lib/actions";
import { ENTITIES } from "@/lib/admin";
import { can, getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Madhuram", robots: { index: false, follow: false } };

async function Nav() {
  const u = await getUser();
  if (!u) return null;
  const links = [
    ...Object.entries(ENTITIES).filter(([, e]) => can(u, e.perm)).map(([k, e]) => ({ href: `/admin/${k}`, label: e.title })),
    ...(can(u, "landing") ? [{ href: "/admin/landing", label: "Landing page" }] : []),
    ...(can(u, "users") ? [{ href: "/admin/users", label: "Users" }] : []),
  ];
  return (
    <nav className="flex flex-wrap items-center gap-x-4 gap-y-1 border-b border-line bg-surface px-4 py-2 text-sm">
      <Link href="/admin" className="font-bold text-brand">Madhuram admin</Link>
      {links.map((l) => <Link key={l.href} href={l.href}>{l.label}</Link>)}
      <span className="ml-auto text-muted">{u.username}</span>
      <form action={logout}><button className="underline">Sign out</button></form>
    </nav>
  );
}

// Every admin page reads the session cookie → request-time; Suspense keeps cacheComponents happy.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Html lang="en">
      <Suspense fallback={<div className="h-10 border-b border-line" />}>
        <Nav />
      </Suspense>
      <div className="mx-auto max-w-[1400px] p-4">
        <Suspense fallback={<p className="text-sm text-muted">Loading…</p>}>{children}</Suspense>
      </div>
    </Html>
  );
}
