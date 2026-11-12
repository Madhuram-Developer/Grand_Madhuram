// Date-range helpers for the analytics dashboard (pure, no server deps: safe in client + server).
export type Range = { from: string; to: string; days: number; preset: string };
export const PRESETS = [
  { key: "7d", label: "7 days", days: 7 },
  { key: "28d", label: "28 days", days: 28 },
  { key: "90d", label: "3 months", days: 90 },
  { key: "365d", label: "12 months", days: 365 },
] as const;
const MAX_DAYS = 480; // Search Console keeps ~16 months

/** YYYY-MM-DD for a Date in India time (site audience + page-view buckets use IST). */
export const istDay = (d: Date) => d.toLocaleDateString("en-CA", { timeZone: "Asia/Kolkata" });
const ISO = /^\d{4}-\d{2}-\d{2}$/;
const shift = (day: string, n: number) => new Date(Date.parse(`${day}T00:00:00Z`) + n * 864e5).toISOString().slice(0, 10);
const diff = (a: string, b: string) => Math.round((Date.parse(b) - Date.parse(a)) / 864e5) + 1;

/** ?range=28d or ?from=YYYY-MM-DD&to=YYYY-MM-DD → clamped, validated range. Default 28 days ending today. */
export function parseRange(sp: { range?: string; from?: string; to?: string }, today: string): Range {
  if (sp.from && sp.to && ISO.test(sp.from) && ISO.test(sp.to)) {
    let [from, to] = sp.from <= sp.to ? [sp.from, sp.to] : [sp.to, sp.from];
    if (to > today) to = today;
    if (diff(from, to) > MAX_DAYS) from = shift(to, -(MAX_DAYS - 1));
    if (from <= to) return { from, to, days: diff(from, to), preset: "custom" };
  }
  const p = PRESETS.find((x) => x.key === sp.range) ?? PRESETS[1];
  return { from: shift(today, -(p.days - 1)), to: today, days: p.days, preset: p.key };
}

/** Same-length period right before `r` (for "vs previous period"). */
export const previous = (r: Range): Range => ({ from: shift(r.from, -r.days), to: shift(r.from, -1), days: r.days, preset: "prev" });

/** Every day in the range, so charts show zero-days instead of skipping them. */
export const eachDay = (r: Range) => Array.from({ length: r.days }, (_, i) => shift(r.from, i));

// ponytail: self-check, run with `RANGE_SELFTEST=1 npx tsx lib/range.ts`
if (typeof process !== "undefined" && process.env?.RANGE_SELFTEST) {
  const eq = (a: unknown, b: unknown) => { if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error(`${JSON.stringify(a)} !== ${JSON.stringify(b)}`); };
  const T = "2026-11-12";
  eq(parseRange({}, T), { from: "2026-10-16", to: T, days: 28, preset: "28d" });
  eq(parseRange({ range: "7d" }, T), { from: "2026-11-06", to: T, days: 7, preset: "7d" });
  eq(parseRange({ from: "2026-11-10", to: "2026-11-01" }, T), { from: "2026-11-01", to: "2026-11-10", days: 10, preset: "custom" }); // swapped
  eq(parseRange({ from: "2026-11-01", to: "2027-01-01" }, T).to, T); // future clamped
  eq(parseRange({ from: "2020-01-01", to: T }, T).days, MAX_DAYS); // too long clamped
  eq(parseRange({ from: "bad", to: T }, T).preset, "28d"); // invalid → default
  eq(eachDay(parseRange({ range: "7d" }, T)).length, 7);
  eq(previous(parseRange({ range: "7d" }, T)), { from: "2026-10-30", to: "2026-11-05", days: 7, preset: "prev" });
  eq(istDay(new Date("2026-11-11T20:00:00Z")), "2026-11-12"); // 01:30 IST next day
  console.log("range ok");
}
