// Shared by server listing pages and the client filter count. No server imports here.
import type { L } from "./i18n";

export type Query = { q?: string; type?: string; sub?: string; loc?: string; bhk?: string; budget?: string };
export type Slim = { _id: string; name: L; locality?: L | null; location?: string | null; types?: string[]; configs?: { bhk?: number | null }[]; priceMin?: number | null };
export type Taxon = { _id: string; slug: string; name: L; parent?: string | null };

const txt = (v?: L | null) => `${v?.en ?? ""} ${v?.hi ?? ""}`.toLowerCase();

export function matches(p: Slim, f: Query, locations: Taxon[], types: Taxon[]) {
  const id = (list: Taxon[], slug?: string) => list.find((x) => x.slug === slug)?._id;
  if (f.q) {
    const loc = locations.find((l) => l._id === p.location);
    const hay = `${txt(p.name)} ${txt(p.locality)} ${txt(loc?.name)}`;
    if (!f.q.toLowerCase().split(/\s+/).every((w) => hay.includes(w))) return false;
  }
  if (f.type && !p.types?.includes(id(types, f.type) ?? "-")) return false;
  if (f.sub && !p.types?.includes(id(types, f.sub) ?? "-")) return false;
  if (f.loc && p.location !== id(locations, f.loc)) return false;
  if (f.bhk) {
    const n = Number(f.bhk);
    if (!p.configs?.some((c) => (n >= 4 ? (c.bhk ?? 0) >= 4 : c.bhk === n))) return false;
  }
  if (f.budget && (p.priceMin ?? 0) > Number(f.budget)) return false;
  return true;
}

export const BUDGETS = [2500000, 5000000, 7500000, 10000000, 20000000, 50000000];
export const formatBudget = (n: number) => (n >= 10000000 ? `₹${n / 10000000} Cr` : `₹${n / 100000} L`);

if (process.env.FILTER_SELFTEST) {
  const types = [{ _id: "r", slug: "residential", name: { en: "Res" } }];
  const locs = [{ _id: "j", slug: "jaipur", name: { en: "Jaipur", hi: "जयपुर" } }];
  const p: Slim = { _id: "1", name: { en: "Madhuram Heights" }, location: "j", types: ["r"], configs: [{ bhk: 3 }], priceMin: 4e6 };
  console.assert(matches(p, { q: "heights जयपुर" }, locs, types), "q en+hi");
  console.assert(!matches(p, { q: "villa" }, locs, types), "q miss");
  console.assert(matches(p, { type: "residential", loc: "jaipur", bhk: "3", budget: "5000000" }, locs, types), "all");
  console.assert(!matches(p, { bhk: "4" }, locs, types), "bhk 4+");
  console.assert(!matches(p, { budget: "2500000" }, locs, types), "budget");
  console.log("filter selftest done");
}

/** Only what the client filter needs — keeps the RSC payload small. */
export const toSlim = ({ _id, name, locality, location, types, configs, priceMin }: Slim): Slim => ({ _id, name, locality, location, types, configs: configs?.map((c) => ({ bhk: c.bhk })), priceMin });
