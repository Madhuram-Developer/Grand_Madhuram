// Media is stored as a path relative to NEXT_PUBLIC_MEDIA_URL (e.g. "madhuram/abc123.jpg").
// Every place that renders an image/PDF goes through media() so the host lives in one env var.
const BASE = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/+$/, "");

/** Stored path → full URL. Absolute URLs (legacy/demo data) and site-relative paths pass through unchanged. */
export function media(path?: string | null): string {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) return path;
  return `${BASE}/${path.replace(/^\/+/, "")}`;
}

// ponytail: self-check, run with `MEDIA_SELFTEST=1 npx tsx lib/media.ts`
if (process.env.MEDIA_SELFTEST) {
  const ok = (a: string, b: string) => { if (a !== b) throw new Error(`${a} !== ${b}`); };
  ok(media(""), "");
  ok(media("https://x.com/a.jpg"), "https://x.com/a.jpg");
  ok(media("/logo.png"), "/logo.png");
  ok(media("madhuram/a.jpg"), `${BASE}/madhuram/a.jpg`);
  console.log("media ok");
}
