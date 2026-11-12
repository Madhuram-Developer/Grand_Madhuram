import type { Metadata } from "next";
import Link from "next/link";
import { Suspense } from "react";
import { AdminNav } from "@/components/admin/Nav";
import Loading from "./loading";
import { Html, Logo } from "@/components/Chrome";
import { Button, ButtonLink } from "@/components/kit";
import { logout } from "@/lib/actions";
import { navFor } from "@/lib/admin";
import { getUser } from "@/lib/auth";

export const metadata: Metadata = { title: "Admin · Madhuram", robots: { index: false, follow: false } };

async function TopBar() {
  const u = await getUser();
  return (
    <div className="flex items-center gap-3">
      <ButtonLink href="/en" external variant="ghost" size="sm">View site ↗</ButtonLink>
      {u && (
        <>
          <span className="text-sm text-muted max-sm:hidden">{u.username}</span>
          <form action={logout}><Button type="submit" variant="ghost" size="sm">Sign out</Button></form>
        </>
      )}
    </div>
  );
}

async function Sidebar() {
  const u = await getUser();
  return u ? <AdminNav groups={navFor(u)} /> : null;
}

// Every admin page reads the session cookie → request-time. Each request-time piece has its own <Suspense>;
// page-level boundaries live in loading.tsx so client navigations between admin screens show a skeleton instantly.
export default function AdminLayout({ children }: LayoutProps<"/admin">) {
  return (
    <Html lang="en">
      <header className="sticky top-0 z-30 border-b border-line bg-bg">
        <div className="flex h-14 items-center justify-between gap-3 px-4 lg:px-6">
          <Link href="/admin" className="flex items-center gap-3">
            <Logo className="h-9 w-auto" />
            <span className="text-xs font-bold uppercase tracking-[0.25em] text-muted">Admin</span>
          </Link>
          <Suspense fallback={null}><TopBar /></Suspense>
        </div>
      </header>
      {/* phones: collapsible menu bar above content. desktop: full-height sidebar pinned left, under the header */}
      <aside className="px-4 pt-4 lg:fixed lg:bottom-0 lg:left-0 lg:top-14 lg:w-64 lg:overflow-y-auto lg:border-r lg:border-line lg:bg-surface lg:p-0">
        <Suspense fallback={<div className="h-12 animate-pulse rounded-xl bg-surface lg:h-full lg:rounded-none" />}><Sidebar /></Suspense>
      </aside>
      <main className="min-w-0 p-4 lg:ml-64 lg:p-6">
        <div className="mx-auto max-w-[1280px]">
          <Suspense fallback={<Loading />}>{children}</Suspense>
        </div>
      </main>
    </Html>
  );
}

