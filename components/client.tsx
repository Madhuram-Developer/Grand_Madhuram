"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useEffect, useMemo, useState } from "react";
import { BUDGETS, formatBudget, matches, type Query, type Slim, type Taxon } from "@/lib/filter";
import { t, type Dict, type Lang } from "@/lib/i18n";

export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const path = usePathname() ?? `/${lang}`;
  const other = lang === "en" ? "hi" : "en";
  const href = path.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  return (
    <Link href={href} hrefLang={other} className="rounded-full border border-line px-3 py-1 text-sm">
      {label}
    </Link>
  );
}

type Suggestion = { label: string; sub: string; href: string };
export function SearchBar({ lang, dict, initial = "" }: { lang: Lang; dict: Dict; initial?: string }) {
  const [q, setQ] = useState(initial);
  const [items, setItems] = useState<Suggestion[]>([]);
  useEffect(() => {
    if (q.trim().length < 2) return;
    const ctrl = new AbortController();
    const id = setTimeout(() => {
      fetch(`/api/search?lang=${lang}&q=${encodeURIComponent(q)}`, { signal: ctrl.signal })
        .then((r) => r.json())
        .then(setItems)
        .catch(() => {});
    }, 150);
    return () => (clearTimeout(id), ctrl.abort());
  }, [q, lang]);

  return (
    // native GET form: Enter → /[lang]/projects?q=
    <form action={`/${lang}/projects`} role="search" className="relative">
      <input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={dict.search.placeholder}
        aria-label={dict.search.placeholder}
        autoComplete="off"
        className="w-full rounded-xl border border-line bg-surface px-4 py-3 text-base outline-none focus:border-brand"
      />
      {q.trim().length >= 2 && items.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-lg">
          {items.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="block px-4 py-2 hover:bg-bg">
                <span className="font-medium">{s.label}</span> <span className="text-xs text-muted">{s.sub}</span>
              </Link>
            </li>
          ))}
        </ul>
      )}
    </form>
  );
}

export function Filter({ lang, dict, projects, locations, types, initial = {}, showBudget = true }: { lang: Lang; dict: Dict; projects: Slim[]; locations: Taxon[]; types: Taxon[]; initial?: Query; showBudget?: boolean }) {
  const [f, setF] = useState<Query>(initial);
  const set = (k: keyof Query, v?: string) => setF((o) => ({ ...o, [k]: v || undefined, ...(k === "type" ? { sub: undefined } : {}) }));
  const tops = types.filter((x) => !x.parent);
  const subs = types.filter((x) => x.parent && x.parent === tops.find((tp) => tp.slug === f.type)?._id);
  const count = useMemo(() => projects.filter((p) => matches(p, f, locations, types)).length, [f, projects, locations, types]);
  const bIdx = f.budget ? BUDGETS.indexOf(Number(f.budget)) : BUDGETS.length;
  const sel = "w-full rounded-lg border border-line bg-surface px-2 py-2 text-sm";

  return (
    <form action={`/${lang}/projects`} className="rounded-xl border border-line bg-surface p-3">
      {f.q && <input type="hidden" name="q" value={f.q} />}
      <div role="tablist" className="-mx-1 mb-3 flex gap-1 overflow-x-auto">
        {[{ slug: "", name: { en: dict.filter.all, hi: dict.filter.all } }, ...tops].map((tp) => (
          <button key={tp.slug} type="button" role="tab" aria-selected={(f.type ?? "") === tp.slug} onClick={() => set("type", tp.slug)}
            className={`shrink-0 rounded-full px-3 py-1 text-sm ${(f.type ?? "") === tp.slug ? "bg-brand text-brand-ink" : "bg-bg"}`}>
            {t(tp.name, lang)}
          </button>
        ))}
      </div>
      {f.type && <input type="hidden" name="type" value={f.type} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
        {subs.length > 0 && (
          <select name="sub" value={f.sub ?? ""} onChange={(e) => set("sub", e.target.value)} className={sel} aria-label={dict.filter.type}>
            <option value="">{dict.filter.type}: {dict.filter.all}</option>
            {subs.map((s) => <option key={s.slug} value={s.slug}>{t(s.name, lang)}</option>)}
          </select>
        )}
        <select name="loc" value={f.loc ?? ""} onChange={(e) => set("loc", e.target.value)} className={sel} aria-label={dict.filter.location}>
          <option value="">{dict.filter.location}: {dict.filter.all}</option>
          {locations.map((l) => <option key={l.slug} value={l.slug}>{t(l.name, lang)}</option>)}
        </select>
        <select name="bhk" value={f.bhk ?? ""} onChange={(e) => set("bhk", e.target.value)} className={sel} aria-label={dict.filter.bedrooms}>
          <option value="">{dict.filter.bedrooms}: {dict.filter.all}</option>
          {[1, 2, 3, 4].map((n) => <option key={n} value={n}>{n === 4 ? "4+" : n} BHK</option>)}
        </select>
        {showBudget && (
          <label className="col-span-2 flex flex-col text-xs text-muted sm:col-span-1">
            {dict.filter.budget}: {bIdx < BUDGETS.length ? `≤ ${formatBudget(BUDGETS[bIdx])}` : dict.filter.all}
            <input type="range" min={0} max={BUDGETS.length} value={bIdx} onChange={(e) => set("budget", String(BUDGETS[Number(e.target.value)] ?? ""))} className="accent-brand" />
            {f.budget && <input type="hidden" name="budget" value={f.budget} />}
          </label>
        )}
      </div>
      <button className="mt-3 w-full rounded-lg bg-brand py-2.5 font-medium text-brand-ink">
        {dict.search.found.replace("{n}", String(count))}
      </button>
    </form>
  );
}

export function LiteYouTube({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-ink">
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 size-full" />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={`Play: ${title}`} className="group absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-90" />
          <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-badge text-2xl text-badge-ink">▶</span>
        </button>
      )}
    </div>
  );
}
