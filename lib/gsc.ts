import "server-only";
import { importPKCS8, SignJWT } from "jose";
import { cacheLife, cacheTag } from "next/cache";

// Google Search Console (Search Analytics API) via a service account. No SDK: jose signs the OAuth assertion.
// Setup: README → "Search Console analytics".
const env = () => ({
  email: process.env.GSC_CLIENT_EMAIL,
  key: process.env.GSC_PRIVATE_KEY?.replace(/\\n/g, "\n"), // .env files store the PEM with literal \n
  site: process.env.GSC_SITE_URL, // "sc-domain:example.com" or "https://www.example.com/"
});
export const gscConfigured = () => { const e = env(); return !!(e.email && e.key && e.site); };

// ponytail: per-instance token cache; Google tokens live 1h, refreshed 5 min early
let tok: { value: string; exp: number } | null = null;
async function accessToken() {
  if (tok && tok.exp > Date.now() + 300_000) return tok.value;
  const { email, key } = env();
  const now = Math.floor(Date.now() / 1000);
  const assertion = await new SignJWT({ scope: "https://www.googleapis.com/auth/webmasters.readonly" })
    .setProtectedHeader({ alg: "RS256", typ: "JWT" })
    .setIssuer(email!)
    .setAudience("https://oauth2.googleapis.com/token")
    .setIssuedAt(now)
    .setExpirationTime(now + 3600)
    .sign(await importPKCS8(key!, "RS256"));
  const r = await fetch("https://oauth2.googleapis.com/token", {
    method: "POST",
    headers: { "Content-Type": "application/x-www-form-urlencoded" },
    body: new URLSearchParams({ grant_type: "urn:ietf:params:oauth:grant-type:jwt-bearer", assertion }),
  }).then((r) => r.json());
  if (!r.access_token) throw new Error(`Google auth failed: ${r.error_description ?? r.error ?? "unknown"}`);
  tok = { value: r.access_token, exp: Date.now() + r.expires_in * 1000 };
  return tok.value;
}

export type GscRow = { keys: string[]; clicks: number; impressions: number; ctr: number; position: number };

/**
 * One Search Analytics query. Cached 1h per (range, dimension): GSC data only updates a few times a day.
 * Throws on API errors so a failure is never cached.
 */
export async function gscQuery(from: string, to: string, dimension: "" | "date" | "page" | "query", rowLimit = 25): Promise<GscRow[]> {
  "use cache: remote";
  cacheLife("hours");
  cacheTag("gsc");
  const { site } = env();
  const body = { startDate: from, endDate: to, dataState: "all", type: "web", rowLimit, ...(dimension ? { dimensions: [dimension] } : {}) };
  const r = await fetch(`https://searchconsole.googleapis.com/webmasters/v3/sites/${encodeURIComponent(site!)}/searchAnalytics/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${await accessToken()}`, "Content-Type": "application/json" },
    body: JSON.stringify(body),
  }).then((r) => r.json());
  if (r.error) throw new Error(`Search Console: ${r.error.message}`);
  return (r.rows ?? []) as GscRow[];
}
