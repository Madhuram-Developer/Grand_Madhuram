"use client";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { useActionState, useEffect, useMemo, useState } from "react";
import { submitEnquiry, type EnquiryState } from "@/lib/actions";
import { BUDGETS, formatBudget, matches, type Query, type Slim, type Taxon } from "@/lib/filter";
import { t, type Dict, type Lang } from "@/lib/i18n";
import { Button, ButtonLink, FieldRow, Input, Pill, Select, Textarea } from "./kit";

export function LangSwitch({ lang, label }: { lang: Lang; label: string }) {
  const path = usePathname() ?? `/${lang}`;
  const other = lang === "en" ? "hi" : "en";
  const href = path.replace(/^\/(en|hi)(?=\/|$)/, `/${other}`);
  return (
    <ButtonLink href={href} hrefLang={other} variant="ghost" size="sm">
      {label}
    </ButtonLink>
  );
}

type NavItem = { href: string; label: string };

/**
 * Same-page anchors (/en#locations while on /en): scroll smoothly right away instead of waiting on a router navigation.
 * Other pages fall through to normal <Link> navigation.
 */
export function smoothHash(e: React.MouseEvent, href: string) {
  const [path, hash] = href.split("#");
  if (!hash || path !== location.pathname || e.metaKey || e.ctrlKey || e.shiftKey) return;
  const el = document.getElementById(hash);
  if (!el) return;
  e.preventDefault();
  document.documentElement.classList.remove("menu-open"); // unlock scroll before moving
  const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
  el.scrollIntoView({ behavior: reduce ? "auto" : "smooth", block: "start" });
  history.replaceState(history.state, "", `#${hash}`);
}

/** Link that scrolls smoothly to same-page anchors. Use for any nav link that may point at /#section. */
export function NavLink(props: React.ComponentProps<typeof Link> & { href: string }) {
  return <Link {...props} onClick={(e) => { props.onClick?.(e); smoothHash(e, props.href); }} />;
}
function useActive() {
  const path = usePathname();
  return (href: string) => !href.includes("#") && (href.split("/").length > 2 ? !!path?.startsWith(href) : path === href);
}

/** Desktop header links with copper underline on the active page. */
export function NavLinks({ items }: { items: NavItem[] }) {
  const isActive = useActive();
  return items.map((it) => {
    const active = isActive(it.href);
    return (
      <NavLink
        key={it.href}
        href={it.href}
        aria-current={active ? "page" : undefined}
        className={`relative px-3 py-2 text-sm transition-colors lg:text-base ${active ? "text-brand" : "text-ink hover:text-accent"} after:absolute after:inset-x-3 after:-bottom-px after:h-0.5 after:origin-left after:bg-brand after:transition-transform after:duration-300 ${active ? "after:scale-x-100" : "after:scale-x-0 hover:after:scale-x-100"}`}
      >
        {it.label}
      </NavLink>
    );
  });
}

/** Phone menu: full-screen overlay under the header, centered links, fade + staggered slide. Esc / link tap closes. */
export function MobileMenu({ items, label, children }: { items: NavItem[]; label: string; children?: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const isActive = useActive();
  useEffect(() => {
    // html.menu-open: locks page scroll and lifts the header above floating buttons (see globals.css)
    document.documentElement.classList.toggle("menu-open", open);
    if (!open) return;
    const onKey = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", onKey);
    return () => removeEventListener("keydown", onKey);
  }, [open]);
  const bar = "absolute left-0 h-0.5 w-5 rounded bg-ink transition-transform duration-300 motion-reduce:transition-none";
  const stagger = (i: number) => ({ transitionDelay: open ? `${100 + i * 50}ms` : "0ms" });

  return (
    <div className="md:hidden">
      <button type="button" aria-label={label} aria-expanded={open} aria-controls="mobile-menu" onClick={() => setOpen((o) => !o)} className="grid size-10 place-items-center rounded-lg border border-line">
        <span className="relative block h-3.5 w-5" aria-hidden>
          <span className={`${bar} top-0 ${open ? "translate-y-1.5 rotate-45" : ""}`} />
          <span className={`${bar} top-1.5 ${open ? "scale-x-0" : ""}`} />
          <span className={`${bar} top-3 ${open ? "-translate-y-1.5 -rotate-45" : ""}`} />
        </span>
      </button>
      <div
        id="mobile-menu"
        inert={!open}
        onClick={(e) => (e.target as HTMLElement).closest("a") && setOpen(false)}
        className={`fixed inset-x-0 bottom-0 top-16 flex flex-col items-center justify-center gap-8 bg-bg px-6 transition-opacity duration-300 motion-reduce:transition-none ${open ? "opacity-100" : "pointer-events-none opacity-0"}`}
      >
        <nav aria-label="Mobile" className="flex flex-col items-center gap-2">
          {items.map((it, i) => {
            const active = isActive(it.href);
            return (
              <NavLink
                key={it.href}
                href={it.href}
                aria-current={active ? "page" : undefined}
                style={stagger(i)}
                className={`px-4 py-3 text-2xl font-bold transition-all duration-500 ease-out motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"} ${active ? "text-brand" : "text-ink"}`}
              >
                {it.label}
              </NavLink>
            );
          })}
        </nav>
        <div style={stagger(items.length)} className={`grid w-full max-w-xs gap-3 transition-all duration-500 ease-out motion-reduce:transition-none ${open ? "translate-y-0 opacity-100" : "translate-y-4 opacity-0"}`}>
          {children}
        </div>
      </div>
    </div>
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
      <Input
        name="q"
        value={q}
        onChange={(e) => setQ(e.target.value)}
        placeholder={dict.search.placeholder}
        aria-label={dict.search.placeholder}
        autoComplete="off"
        fieldSize="lg"
        className="pl-11"
      />
      <svg viewBox="0 0 24 24" aria-hidden className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-brand" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round">
        <circle cx="11" cy="11" r="7" /><path d="m20 20-3.5-3.5" />
      </svg>
      {q.trim().length >= 2 && items.length > 0 && (
        <ul className="absolute inset-x-0 top-full z-20 mt-1 overflow-hidden rounded-xl border border-line bg-surface shadow-2xl">
          {items.map((s) => (
            <li key={s.href}>
              <Link href={s.href} className="block px-4 py-2.5 hover:bg-surface-2">
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

  return (
    <form action={`/${lang}/projects`} className="rounded-xl border border-line bg-surface p-3 lg:p-4">
      {f.q && <input type="hidden" name="q" value={f.q} />}
      <div role="group" aria-label={dict.filter.type} className="-mx-1 mb-3 flex gap-2 overflow-x-auto px-1 [scrollbar-width:none]">
        {[{ slug: "", name: { en: dict.filter.all, hi: dict.filter.all } }, ...tops].map((tp) => (
          <Pill key={tp.slug} active={(f.type ?? "") === tp.slug} onClick={() => set("type", tp.slug)}>
            {t(tp.name, lang)}
          </Pill>
        ))}
      </div>
      {f.type && <input type="hidden" name="type" value={f.type} />}
      <div className="grid grid-cols-2 gap-2 sm:grid-cols-4 lg:gap-3">
        {subs.length > 0 && (
          <Select name="sub" value={f.sub ?? ""} onChange={(v) => set("sub", v)} aria-label={dict.filter.type}
            options={[{ value: "", label: `${dict.filter.type}: ${dict.filter.all}` }, ...subs.map((s) => ({ value: s.slug, label: t(s.name, lang) }))]} />
        )}
        <Select name="loc" value={f.loc ?? ""} onChange={(v) => set("loc", v)} aria-label={dict.filter.location}
          options={[{ value: "", label: `${dict.filter.location}: ${dict.filter.all}` }, ...locations.map((l) => ({ value: l.slug, label: t(l.name, lang) }))]} />
        <Select name="bhk" value={f.bhk ?? ""} onChange={(v) => set("bhk", v)} aria-label={dict.filter.bedrooms}
          options={[{ value: "", label: `${dict.filter.bedrooms}: ${dict.filter.all}` }, ...[1, 2, 3, 4].map((n) => ({ value: String(n), label: `${n === 4 ? "4+" : n} BHK` }))]} />
        {showBudget && (
          <label className="col-span-2 flex flex-col justify-center gap-1 text-xs text-muted sm:col-span-1 lg:text-sm">
            {dict.filter.budget}: {bIdx < BUDGETS.length ? `≤ ${formatBudget(BUDGETS[bIdx])}` : dict.filter.all}
            <input type="range" min={0} max={BUDGETS.length} value={bIdx} onChange={(e) => set("budget", String(BUDGETS[Number(e.target.value)] ?? ""))} className="accent-brand" />
            {f.budget && <input type="hidden" name="budget" value={f.budget} />}
          </label>
        )}
      </div>
      <Button type="submit" size="lg" block className="mt-3">
        {dict.search.found.replace("{n}", String(count))}
      </Button>
    </form>
  );
}

export function LiteYouTube({ id, title }: { id: string; title: string }) {
  const [on, setOn] = useState(false);
  return (
    <div className="relative aspect-video overflow-hidden rounded-xl bg-surface">
      {on ? (
        <iframe src={`https://www.youtube-nocookie.com/embed/${id}?autoplay=1`} title={title} allow="autoplay; encrypted-media; picture-in-picture" allowFullScreen className="absolute inset-0 size-full" />
      ) : (
        <button type="button" onClick={() => setOn(true)} aria-label={`Play: ${title}`} className="group absolute inset-0">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={`https://i.ytimg.com/vi/${id}/hqdefault.jpg`} alt="" loading="lazy" className="size-full object-cover opacity-90" />
          <span className="absolute left-1/2 top-1/2 grid size-14 -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-brand text-2xl text-brand-ink transition-transform group-hover:scale-110">▶</span>
        </button>
      )}
    </div>
  );
}

/** Counts a project page view once per tab session (survives refresh, skips StrictMode double-run). */
export function TrackView({ slug }: { slug: string }) {
  useEffect(() => {
    const k = `pv:${slug}`;
    try {
      if (sessionStorage.getItem(k)) return;
      sessionStorage.setItem(k, "1");
    } catch {} // private mode: count anyway
    navigator.sendBeacon?.("/api/track", JSON.stringify({ slug }));
  }, [slug]);
  return null;
}

/** "Get in touch" form → submitEnquiry server action (validated + rate-limited on the server). */
export function EnquiryForm({ lang, dict, projects }: { lang: Lang; dict: Dict; projects: string[] }) {
  const [state, action, pending] = useActionState<EnquiryState, FormData>(submitEnquiry, {});
  const [project, setProject] = useState("");
  const [dismissed, setDismissed] = useState<EnquiryState | null>(null); // each submit returns a new state object
  const e = dict.enquiry;
  const errors = { invalid: e.errInvalid, phone: e.errPhone, email: e.errEmail, limit: e.errLimit, server: e.errServer };
  const path = usePathname() ?? "";

  if (state.ok && state !== dismissed)
    return (
      <div role="status" className="grid justify-items-center gap-3 py-6 text-center">
        <span className="grid size-12 place-items-center rounded-full bg-brand text-2xl text-brand-ink" aria-hidden>✓</span>
        <p className="text-lg font-bold">{e.success}</p>
        <Button variant="ghost" size="sm" onClick={() => (setDismissed(state), setProject(""))}>{e.another}</Button>
      </div>
    );

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="lang" value={lang} />
      <input type="hidden" name="page" value={path} />
      <input type="hidden" name="project" value={project} />
      {/* honeypot: hidden from people, bots fill it */}
      <input type="text" name="website" tabIndex={-1} autoComplete="off" aria-hidden className="absolute -left-[9999px] size-px opacity-0" />
      <FieldRow label={e.name}><Input name="name" required maxLength={80} autoComplete="name" fieldSize="lg" /></FieldRow>
      <FieldRow label={e.phone}><Input name="phone" type="tel" required inputMode="tel" maxLength={20} autoComplete="tel" fieldSize="lg" placeholder="+91" /></FieldRow>
      <FieldRow label={e.email}><Input name="email" type="email" maxLength={120} autoComplete="email" fieldSize="lg" /></FieldRow>
      {projects.length > 0 && (
        <FieldRow label={e.project}>
          <Select fieldSize="lg" value={project} onChange={setProject} aria-label={e.project} options={[{ value: "", label: e.anyProject }, ...projects.map((p) => ({ value: p, label: p }))]} />
        </FieldRow>
      )}
      <div className="sm:col-span-2"><FieldRow label={e.message}><Textarea name="message" rows={4} maxLength={1000} /></FieldRow></div>
      {state.error && <p role="alert" className="text-sm text-danger sm:col-span-2">{errors[state.error]}</p>}
      <div className="grid gap-2 sm:col-span-2">
        <Button type="submit" size="lg" block disabled={pending}>{pending ? e.sending : e.submit}</Button>
        <p className="text-center text-xs text-muted">
          {e.consent} <Link href={`/${lang}/privacy`} className="text-accent underline-offset-2 hover:underline">{dict.legal.privacy}</Link>.
        </p>
      </div>
    </form>
  );
}
