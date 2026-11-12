import Link from "next/link";
import { Suspense } from "react";
import { Filter, SearchBar } from "@/components/client";
import { Grid, ProjectCard } from "@/components/ui";
import { getCtx, type ProjectT } from "@/lib/data";
import { matches, toSlim, type Query } from "@/lib/filter";
import { getDictionary, t, type Lang } from "@/lib/i18n";

type SP = Promise<Record<string, string | string[] | undefined>>;
type Opts = { lang: Lang; list: ProjectT[]; sp: SP; path: string; pills?: ("type" | "locality")[]; filter?: boolean };

/** Project grid driven by searchParams. Lives behind Suspense (searchParams is request data). */
export function Browse(props: Opts) {
  return (
    <Suspense fallback={<div className="grid grid-cols-2 gap-3 sm:grid-cols-4">{[0, 1, 2, 3].map((i) => <div key={i} className="aspect-[3/4] animate-pulse rounded-xl bg-line" />)}</div>}>
      <Inner {...props} />
    </Suspense>
  );
}

async function Inner({ lang, list, sp, path, pills = [], filter }: Opts) {
  const dict = getDictionary(lang);
  const raw = await sp;
  const q = Object.fromEntries(Object.entries(raw).map(([k, v]) => [k, Array.isArray(v) ? v[0] : v])) as Query & { sort?: string; ptype?: string; locality?: string };
  const ctx = await getCtx();
  const { locations, types } = ctx;

  let rows = filter ? list.filter((p) => matches(p, q, locations, types)) : list;
  const ptype = types.find((x) => x.slug === q.ptype);
  if (ptype) rows = rows.filter((p) => p.types?.includes(ptype._id));
  if (q.locality) rows = rows.filter((p) => p.locality?.en === q.locality);
  if (q.sort === "name") rows = [...rows].sort((a, b) => t(a.name, lang).localeCompare(t(b.name, lang)));

  const href = (patch: Record<string, string | undefined>) => {
    const u = new URLSearchParams(Object.entries({ ...q, ...patch }).filter((e): e is [string, string] => !!e[1]));
    return `${path}${u.size ? `?${u}` : ""}`;
  };
  const pill = (active: boolean) => `shrink-0 rounded-full px-3 py-1 text-sm ${active ? "bg-brand text-brand-ink" : "border border-line bg-surface"}`;
  const typePills = types.filter((x) => list.some((p) => p.types?.includes(x._id)));
  const localities = [...new Map(list.filter((p) => p.locality?.en).map((p) => [p.locality!.en, p.locality!])).values()];

  return (
    <div className="grid grid-cols-[minmax(0,1fr)] gap-4">
      {filter && (
        <div className="grid grid-cols-[minmax(0,1fr)] gap-3">
          <SearchBar lang={lang} dict={dict} initial={q.q} />
          <Filter lang={lang} dict={dict} projects={list.map(toSlim)} locations={locations} types={types} initial={q} />
        </div>
      )}
      {pills.includes("type") && typePills.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          <Link href={href({ ptype: undefined })} className={pill(!ptype)}>{dict.nav.allTypes}</Link>
          {typePills.map((x) => <Link key={x._id} href={href({ ptype: x.slug })} className={pill(ptype?._id === x._id)}>{t(x.name, lang)}</Link>)}
        </div>
      )}
      {pills.includes("locality") && localities.length > 1 && (
        <div className="-mx-4 flex gap-2 overflow-x-auto px-4">
          <Link href={href({ locality: undefined })} className={pill(!q.locality)}>{dict.nav.allTypes}</Link>
          {localities.map((l) => <Link key={l.en} href={href({ locality: l.en })} className={pill(q.locality === l.en)}>{t(l, lang)}</Link>)}
        </div>
      )}
      <div className="flex items-center justify-between text-sm">
        <span className="text-muted">{dict.search.found.replace("{n}", String(rows.length))}</span>
        <span className="flex gap-2">
          {dict.sort.label}:
          <Link href={href({ sort: undefined })} className={q.sort !== "name" ? "font-bold" : "text-muted"}>{dict.sort.new}</Link>
          <Link href={href({ sort: "name" })} className={q.sort === "name" ? "font-bold" : "text-muted"}>{dict.sort.name}</Link>
        </span>
      </div>
      <Grid>{rows.map((p) => <ProjectCard key={p._id} p={p} ctx={ctx} lang={lang} dict={dict} />)}</Grid>
    </div>
  );
}
