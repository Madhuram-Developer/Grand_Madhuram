import { getLocations, getProjects } from "@/lib/data";
import { hasLang, t } from "@/lib/i18n";

/** Instant suggestions: projects (by name/locality/city) + cities. Matches en or hi text. */
export async function GET(req: Request) {
  const url = new URL(req.url);
  const q = (url.searchParams.get("q") ?? "").trim().toLowerCase().slice(0, 60);
  const l = url.searchParams.get("lang") ?? "en";
  const lang = hasLang(l) ? l : "en";
  if (q.length < 2) return Response.json([]);

  const [projects, locations] = await Promise.all([getProjects(), getLocations()]);
  const has = (...v: ({ en?: string | null; hi?: string | null } | null | undefined)[]) => v.some((x) => `${x?.en ?? ""} ${x?.hi ?? ""}`.toLowerCase().includes(q));

  const cities = locations
    .filter((c) => has(c.name) && projects.some((p) => p.location === c._id))
    .map((c) => ({ label: t(c.name, lang), sub: "📍", href: `/${lang}/locations/${c.slug}` }));
  const hits = projects
    .filter((p) => has(p.name, p.locality, locations.find((c) => c._id === p.location)?.name))
    .map((p) => ({
      label: t(p.name, lang),
      sub: [t(p.locality, lang), t(locations.find((c) => c._id === p.location)?.name, lang)].filter(Boolean).join(", "),
      href: `/${lang}/projects/${p.slug}`,
    }));
  return Response.json([...cities, ...hits].slice(0, 8));
}
