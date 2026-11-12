"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useState } from "react";

type Group = { group: string; items: { label: string; href: string }[] };

const Chevron = ({ open }: { open: boolean }) => (
  <svg viewBox="0 0 20 20" aria-hidden fill="currentColor" className={`size-4 text-brand transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
    <path d="M5.2 7.5 10 12.3l4.8-4.8 1.1 1.1L10 14.5 4.1 8.6z" />
  </svg>
);

/**
 * Grouped admin sidebar. Each group is a collapsible header; the group holding the current page starts open.
 * Single-item groups (Dashboard) render as a plain link. Phones: whole panel collapses behind a "Menu" bar.
 */
export function AdminNav({ groups }: { groups: Group[] }) {
  const path = usePathname();
  const active = (href: string) => (href === "/admin" ? path === href : path === href || path.startsWith(`${href}/`));
  const current = groups.find((g) => g.items.some((i) => active(i.href)))?.group;
  const [openGroups, setOpenGroups] = useState<Set<string>>(() => new Set(current ? [current] : []));
  const [mobileOpen, setMobileOpen] = useState(false);
  const toggle = (g: string) => setOpenGroups((s) => { const n = new Set(s); if (n.has(g)) n.delete(g); else n.add(g); return n; });
  const currentLabel = groups.flatMap((g) => g.items).find((i) => active(i.href))?.label ?? "Menu";

  const link = (i: Group["items"][number], nested: boolean) => (
    <Link key={i.href} href={i.href} aria-current={active(i.href) ? "page" : undefined}
      className={`block rounded-lg border-l-2 py-2 text-sm transition-colors ${nested ? "pl-6 pr-3" : "px-3 font-medium"} ${active(i.href) ? "border-brand bg-surface-2 font-medium text-brand" : "border-transparent hover:bg-surface-2 hover:text-accent"}`}>
      {i.label}
    </Link>
  );

  return (
    <nav aria-label="Admin" className="rounded-xl border border-line bg-surface lg:min-h-full lg:rounded-none lg:border-0">
      <button type="button" aria-expanded={mobileOpen} onClick={() => setMobileOpen((o) => !o)} className="flex w-full items-center justify-between px-4 py-3 text-sm font-medium lg:hidden">
        {currentLabel}
        <Chevron open={mobileOpen} />
      </button>
      <div className={`${mobileOpen ? "grid" : "hidden"} gap-1 border-t border-line p-2 lg:grid lg:border-0 lg:px-3 lg:py-4`} onClick={(e) => (e.target as HTMLElement).closest("a") && setMobileOpen(false)}>
        {groups.map((g) => {
          if (g.items.length === 1) return link(g.items[0], false);
          const open = openGroups.has(g.group);
          const id = `nav-${g.group.replace(/\W+/g, "-")}`;
          return (
            <div key={g.group}>
              <button type="button" aria-expanded={open} aria-controls={id} onClick={() => toggle(g.group)}
                className={`flex w-full items-center justify-between rounded-lg px-3 py-2 text-sm font-medium transition-colors hover:bg-surface-2 ${g.group === current ? "text-brand" : ""}`}>
                {g.group}
                <Chevron open={open} />
              </button>
              {/* 0fr → 1fr grid rows = smooth height animation without measuring */}
              <div id={id} inert={!open} className={`grid transition-[grid-template-rows,opacity] duration-200 ease-out motion-reduce:transition-none ${open ? "grid-rows-[1fr] opacity-100" : "grid-rows-[0fr] opacity-0"}`}>
                <div className="overflow-hidden">
                  <div className="grid gap-0.5 pb-1 pt-0.5">{g.items.map((i) => link(i, true))}</div>
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </nav>
  );
}
