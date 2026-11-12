// Media is stored as a path relative to NEXT_PUBLIC_MEDIA_URL (e.g. "madhuram/abc123.jpg").
// Every place that renders an image/PDF goes through media() so the host lives in one env var.
const BASE = (process.env.NEXT_PUBLIC_MEDIA_URL ?? "").replace(/\/+$/, "");

/** Stored path → full URL. Absolute URLs (legacy/demo data) and site-relative paths pass through unchanged. */
export function media(path?: string | null): string {
  if (!path) return "";
  if (/^(https?:)?\/\//.test(path) || path.startsWith("/")) return path;
  return `${BASE}/${path.replace(/^\/+/, "")}`;
}

const CLOUDINARY = /^(https:\/\/res\.cloudinary\.com\/[^/]+\/image\/upload\/)(.+)$/;

/**
 * Cloudinary does the resizing on its CDN: f_auto (AVIF/WebP), q_auto, capped width. Non-Cloudinary URLs pass through.
 * A 1.5 MB upload becomes ~40 KB at card size.
 */
export function cloudinaryUrl(src: string, width: number, quality?: number) {
  return src.replace(CLOUDINARY, (_, base, path) => `${base}f_auto,q_${quality ?? "auto"},c_limit,w_${width}/${path}`);
}
export const isCloudinary = (src: string) => CLOUDINARY.test(src);

/** Stored path → small preview URL (admin thumbnails, never the full original). */
export const mediaThumb = (path: string | null | undefined, width = 160) => cloudinaryUrl(media(path), width);

// ponytail: self-check, run with `MEDIA_SELFTEST=1 npx tsx lib/media.ts`
if (process.env.MEDIA_SELFTEST) {
  const ok = (a: string, b: string) => { if (a !== b) throw new Error(`${a} !== ${b}`); };
  ok(media(""), "");
  ok(media("https://x.com/a.jpg"), "https://x.com/a.jpg");
  ok(media("/logo.png"), "/logo.png");
  ok(media("madhuram/a.jpg"), `${BASE}/madhuram/a.jpg`);
  ok(cloudinaryUrl("https://res.cloudinary.com/x/image/upload/madhuram/a.jpg", 640), "https://res.cloudinary.com/x/image/upload/f_auto,q_auto,c_limit,w_640/madhuram/a.jpg");
  ok(cloudinaryUrl("https://picsum.photos/a.jpg", 640), "https://picsum.photos/a.jpg");
  console.log("media ok");
}
