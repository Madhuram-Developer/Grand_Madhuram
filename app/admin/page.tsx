import { Suspense } from "react";
import { LineChart } from "@/components/admin/LineChart";
import { Alert, Button, Card, Input, Pill } from "@/components/kit";
import { navFor } from "@/lib/admin";
import { pageViews, searchData } from "@/lib/analytics";
import { can, requireUser } from "@/lib/auth";
import { getProjects } from "@/lib/data";
import { eachDay, istDay, parseRange, PRESETS, previous, type Range } from "@/lib/range";

const num = new Intl.NumberFormat("en-IN");
const pct = (v: number) => `${(v * 100).toFixed(1)}%`;
const fmtDay = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", year: "numeric", timeZone: "UTC" });
const one = (v: string | string[] | undefined) => (Array.isArray(v) ? v[0] : v);

export default async function Dashboard({ searchParams }: PageProps<"/admin">) {
  const u = await requireUser();
  const sp = await searchParams;
  const denied = one(sp.denied);
  if (!can(u, "analytics")) return <QuickLinks groups={navFor(u)} name={u.username} denied={!!denied} />;

  const today = istDay(new Date());
  const r = parseRange({ range: one(sp.range), from: one(sp.from), to: one(sp.to) }, today);
  return (
    <div className="grid gap-6">
      {denied && <Alert>You don&apos;t have access to that area.</Alert>}
      <div>
        <h1 className="text-2xl font-bold">Analytics</h1>
        <p className="text-sm text-muted">{fmtDay(r.from)} – {fmtDay(r.to)} · compared with the previous {r.days} days</p>
      </div>
      <RangeBar r={r} today={today} />
      {/* key: a new range shows the skeleton instead of stale numbers */}
      <Suspense key={`${r.from}-${r.to}`} fallback={<StatsSkeleton />}>
        <Stats r={r} />
      </Suspense>
    </div>
  );
}

/** Presets + custom range, one row above the charts. Plain GET form: shareable URLs, back button works. */
function RangeBar({ r, today }: { r: Range; today: string }) {
  return (
    <div className="flex flex-wrap items-end gap-2">
      {PRESETS.map((p) => <Pill key={p.key} href={`/admin?range=${p.key}`} active={r.preset === p.key}>{p.label}</Pill>)}
      <form action="/admin" className="flex flex-wrap items-end gap-2 sm:ml-auto">
        <label className="grid gap-1 text-xs text-muted">From<Input type="date" name="from" defaultValue={r.from} max={today} required fieldSize="sm" /></label>
        <label className="grid gap-1 text-xs text-muted">To<Input type="date" name="to" defaultValue={r.to} max={today} required fieldSize="sm" /></label>
        <Button type="submit" variant={r.preset === "custom" ? "primary" : "ghost"} className="h-9">Apply</Button>
      </form>
    </div>
  );
}

async function Stats({ r }: { r: Range }) {
  const [views, prevViews, search, projects] = await Promise.all([pageViews(r), pageViews(previous(r)), searchData(r), getProjects()]);
  const days = eachDay(r);
  const s = search.state === "ok" ? search : null;
  const prev = s?.prev;

  const rows = projects
    .map((p) => ({ slug: p.slug, name: p.name.en, views: views.bySlug.get(p.slug) ?? 0, search: s?.bySlug.get(p.slug) }))
    .sort((a, b) => b.views - a.views || (b.search?.clicks ?? 0) - (a.search?.clicks ?? 0));

  return (
    <div className="grid gap-6">
      {search.state === "off" && <SetupCard />}
      {search.state === "error" && <Alert>Search Console: {search.message}</Alert>}

      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">
        <Tile label="Project page views" value={num.format(views.total)} delta={change(views.total, prevViews.total)} />
        {s && prev && (
          <>
            <Tile label="Search clicks" value={num.format(s.totals.clicks)} delta={change(s.totals.clicks, prev.clicks)} />
            <Tile label="Search impressions" value={num.format(s.totals.impressions)} delta={change(s.totals.impressions, prev.impressions)} />
            <Tile label="Click-through rate" value={pct(s.totals.ctr)} delta={points(s.totals.ctr, prev.ctr)} />
            <Tile label="Avg. Google position" value={s.totals.position ? s.totals.position.toFixed(1) : "–"} delta={position(s.totals.position, prev.position)} />
          </>
        )}
      </div>

      {/* small multiples: different scales never share one axis */}
      <div className="grid gap-3 lg:grid-cols-3">
        <LineChart title="Project page views / day" data={days.map((d) => ({ day: d, value: views.byDay.get(d) ?? 0 }))} />
        {s && (
          <>
            <LineChart title="Search clicks / day" data={days.map((d) => ({ day: d, value: s.byDay.get(d)?.clicks ?? 0 }))} />
            <LineChart title="Search impressions / day" data={days.map((d) => ({ day: d, value: s.byDay.get(d)?.impressions ?? 0 }))} />
          </>
        )}
      </div>

      <section>
        <h2 className="mb-2 text-lg font-bold">Project pages</h2>
        <Card className="overflow-x-auto">
          <table className="w-full min-w-[560px] text-sm">
            <thead className="text-left text-xs text-muted">
              <tr><th className="p-3 font-medium">Project</th><Th>Page views</Th><Th>Search clicks</Th><Th>Impressions</Th><Th>CTR</Th><Th>Avg. position</Th></tr>
            </thead>
            <tbody>
              {rows.map((x) => (
                <tr key={x.slug} className="border-t border-line">
                  <td className="p-3"><a href={`/en/projects/${x.slug}`} target="_blank" rel="noopener" className="hover:text-accent">{x.name}</a></td>
                  <Td strong>{num.format(x.views)}</Td>
                  <Td>{s ? num.format(x.search?.clicks ?? 0) : "–"}</Td>
                  <Td>{s ? num.format(x.search?.impressions ?? 0) : "–"}</Td>
                  <Td>{x.search?.impressions ? pct(x.search.ctr) : "–"}</Td>
                  <Td>{x.search?.impressions ? x.search.position.toFixed(1) : "–"}</Td>
                </tr>
              ))}
              {!rows.length && <tr><td colSpan={6} className="p-3 text-muted">No published projects.</td></tr>}
            </tbody>
          </table>
        </Card>
        <p className="mt-2 text-xs text-muted">Page views are counted by this site (once per visitor tab, bots excluded, English + Hindi combined). Search numbers come from Google Search Console and lag 1–2 days.</p>
      </section>

      {s && (
        <section>
          <h2 className="mb-2 text-lg font-bold">Top Google searches</h2>
          <Card className="overflow-x-auto">
            <table className="w-full min-w-[480px] text-sm">
              <thead className="text-left text-xs text-muted">
                <tr><th className="p-3 font-medium">Search term</th><Th>Clicks</Th><Th>Impressions</Th><Th>CTR</Th><Th>Avg. position</Th></tr>
              </thead>
              <tbody>
                {s.queries.map((q) => (
                  <tr key={q.keys[0]} className="border-t border-line">
                    <td className="p-3">{q.keys[0]}</td>
                    <Td strong>{num.format(q.clicks)}</Td><Td>{num.format(q.impressions)}</Td><Td>{pct(q.ctr)}</Td><Td>{q.position.toFixed(1)}</Td>
                  </tr>
                ))}
                {!s.queries.length && <tr><td colSpan={5} className="p-3 text-muted">No search data for this period yet.</td></tr>}
              </tbody>
            </table>
          </Card>
        </section>
      )}
    </div>
  );
}

// ---- small pieces ----
const Th = ({ children }: { children: React.ReactNode }) => <th className="p-3 text-right font-medium">{children}</th>;
const Td = ({ children, strong }: { children: React.ReactNode; strong?: boolean }) => <td className={`p-3 text-right tabular-nums ${strong ? "font-bold" : ""}`}>{children}</td>;

type Delta = { text: string; up: boolean | null };
const change = (cur: number, prev: number): Delta =>
  prev ? { text: `${Math.abs(((cur - prev) / prev) * 100).toFixed(0)}%`, up: cur === prev ? null : cur > prev } : { text: cur ? "new" : "–", up: null };
const points = (cur: number, prev: number): Delta => ({ text: `${Math.abs((cur - prev) * 100).toFixed(1)} pts`, up: cur === prev ? null : cur > prev });
// position: lower is better, so "up" (better) = number went down
const position = (cur: number, prev: number): Delta => (prev && cur ? { text: `${Math.abs(cur - prev).toFixed(1)} ${cur <= prev ? "better" : "worse"}`, up: cur === prev ? null : cur < prev } : { text: "–", up: null });

function Tile({ label, value, delta }: { label: string; value: string; delta: Delta }) {
  return (
    <Card className="p-4">
      <p className="text-xs text-muted">{label}</p>
      <p className="mt-1 text-2xl font-bold tabular-nums">{value}</p>
      {/* arrow + words carry direction; no red/green so it reads the same for everyone */}
      <p className="mt-1 text-xs text-muted">
        {delta.up === null ? "" : delta.up ? "▲ " : "▼ "}
        {delta.text} <span className="opacity-70">vs prev.</span>
      </p>
    </Card>
  );
}

function StatsSkeleton() {
  return (
    <div className="grid gap-6" aria-busy>
      <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-5">{[0, 1, 2, 3, 4].map((k) => <div key={k} className="h-24 animate-pulse rounded-xl bg-surface" />)}</div>
      <div className="grid gap-3 lg:grid-cols-3">{[0, 1, 2].map((k) => <div key={k} className="h-56 animate-pulse rounded-xl bg-surface" />)}</div>
    </div>
  );
}

function SetupCard() {
  return (
    <Card className="grid gap-2 border-brand p-4 text-sm">
      <p className="font-bold">Connect Google Search Console to see clicks, impressions and searches</p>
      <ol className="list-decimal space-y-1 pl-5 text-muted">
        <li>Google Cloud console → create a project → enable <b className="text-ink">Google Search Console API</b>.</li>
        <li>Create a <b className="text-ink">service account</b> → Keys → Add key → JSON.</li>
        <li>Search Console → your property → Settings → Users and permissions → add the service account email (Restricted is enough).</li>
        <li>Set <code className="text-accent">GSC_CLIENT_EMAIL</code>, <code className="text-accent">GSC_PRIVATE_KEY</code> and <code className="text-accent">GSC_SITE_URL</code> (e.g. <code className="text-accent">sc-domain:example.com</code>) in the environment, then restart.</li>
      </ol>
      <p className="text-xs text-muted">Project page views below already work without this.</p>
    </Card>
  );
}

/** For admins without analytics access: the grouped shortcuts. */
function QuickLinks({ groups, name, denied }: { groups: ReturnType<typeof navFor>; name: string; denied: boolean }) {
  const shown = groups.map((g) => ({ ...g, items: g.items.filter((i) => i.href !== "/admin") })).filter((g) => g.items.length);
  return (
    <div className="grid gap-6">
      <h1 className="text-2xl font-bold">Hello, {name}</h1>
      {denied && <Alert>You don&apos;t have access to that area.</Alert>}
      {!shown.length && <p className="text-sm text-muted">No areas assigned yet. Ask a superadmin.</p>}
      {shown.map((g) => (
        <section key={g.group}>
          <h2 className="mb-2 text-xs font-bold uppercase tracking-wider text-muted">{g.group}</h2>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 xl:grid-cols-4">
            {g.items.map((c) => (
              <Card key={c.href} href={c.href} className="p-4">
                <p className="font-medium">{c.label}</p>
                {c.hint && <p className="mt-1 text-xs text-muted">{c.hint}</p>}
              </Card>
            ))}
          </div>
        </section>
      ))}
    </div>
  );
}
