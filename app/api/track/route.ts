import { getProjects } from "@/lib/data";
import { db } from "@/lib/db";
import { PageView } from "@/lib/models";
import { istDay } from "@/lib/range";

// Bots, link-preview fetchers and audits don't count as views.
const BOT = /bot|crawl|spider|slurp|preview|lighthouse|headless|facebookexternalhit|whatsapp|python|curl|wget/i;

/**
 * Project page view beacon. Counts one view per project per browser tab session (deduped client-side).
 * ponytail: no rate limit; a determined script can inflate counts. Add per-IP limiting if numbers ever drive money.
 */
export async function POST(req: Request) {
  if (BOT.test(req.headers.get("user-agent") ?? "")) return new Response(null, { status: 204 });
  const site = req.headers.get("sec-fetch-site");
  if (site && site !== "same-origin") return new Response(null, { status: 403 });
  const { slug } = await req.json().catch(() => ({}));
  if (typeof slug !== "string" || !/^[a-z0-9-]{1,80}$/.test(slug)) return new Response(null, { status: 400 });
  if (!(await getProjects()).some((p) => p.slug === slug)) return new Response(null, { status: 404 }); // published only
  await db();
  await PageView.updateOne({ slug, day: istDay(new Date()) }, { $inc: { views: 1 } }, { upsert: true });
  return new Response(null, { status: 204 });
}

