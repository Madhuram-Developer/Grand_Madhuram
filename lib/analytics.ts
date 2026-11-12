import "server-only";
import { db } from "./db";
import { gscConfigured, gscQuery, type GscRow } from "./gsc";
import { Enquiry, PageView } from "./models";
import { previous, type Range } from "./range";

/** First-party project page views in a range: per day and per project slug. Live (uncached). */
export async function pageViews(r: Range) {
  await db();
  const rows = await PageView.find({ day: { $gte: r.from, $lte: r.to } }).select("slug day views -_id").lean();
  const byDay = new Map<string, number>();
  const bySlug = new Map<string, number>();
  let total = 0;
  for (const x of rows) {
    byDay.set(x.day, (byDay.get(x.day) ?? 0) + x.views);
    bySlug.set(x.slug, (bySlug.get(x.slug) ?? 0) + x.views);
    total += x.views;
  }
  return { byDay, bySlug, total };
}

/** Enquiries received in the range (IST day boundaries). */
export async function enquiryCount(r: Range) {
  await db();
  return Enquiry.countDocuments({ createdAt: { $gte: new Date(`${r.from}T00:00:00+05:30`), $lte: new Date(`${r.to}T23:59:59.999+05:30`) } });
}

export type Totals = Omit<GscRow, "keys">;
const ZERO: Totals = { clicks: 0, impressions: 0, ctr: 0, position: 0 };

/** Everything the dashboard needs from Search Console, or why it isn't available. */
export async function searchData(r: Range): Promise<
  | { state: "off" }
  | { state: "error"; message: string }
  | { state: "ok"; totals: Totals; prev: Totals; byDay: Map<string, GscRow>; bySlug: Map<string, Totals>; queries: GscRow[] }
> {
  if (!gscConfigured()) return { state: "off" };
  const p = previous(r);
  try {
    const [tot, prevTot, days, pages, queries] = await Promise.all([
      gscQuery(r.from, r.to, ""),
      gscQuery(p.from, p.to, ""),
      gscQuery(r.from, r.to, "date", 500),
      gscQuery(r.from, r.to, "page", 1000),
      gscQuery(r.from, r.to, "query", 15),
    ]);
    // /en/projects/x and /hi/projects/x are the same project: sum both languages
    const bySlug = new Map<string, Totals>();
    for (const row of pages) {
      const slug = new URL(row.keys[0]).pathname.match(/^\/(?:en|hi)\/projects\/([^/?#]+)/)?.[1];
      if (!slug) continue;
      const a = bySlug.get(slug) ?? { ...ZERO };
      a.position = (a.position * a.impressions + row.position * row.impressions) / (a.impressions + row.impressions || 1);
      a.clicks += row.clicks;
      a.impressions += row.impressions;
      a.ctr = a.impressions ? a.clicks / a.impressions : 0;
      bySlug.set(slug, a);
    }
    return { state: "ok", totals: tot[0] ?? ZERO, prev: prevTot[0] ?? ZERO, byDay: new Map(days.map((d) => [d.keys[0], d])), bySlug, queries };
  } catch (e) {
    return { state: "error", message: (e as Error).message };
  }
}
