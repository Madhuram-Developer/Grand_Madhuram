import { readFile } from "node:fs/promises";
import path from "node:path";

// Serves local uploads (dev / self-hosted). On Vercel use CLOUDINARY_URL instead.
const DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");
const TYPES: Record<string, string> = { jpg: "image/jpeg", png: "image/png", webp: "image/webp", avif: "image/avif", pdf: "application/pdf" };

export async function GET(_: Request, { params }: RouteContext<"/api/files/[name]">) {
  const { name } = await params;
  const m = name.match(/^[a-f0-9]{24}\.(jpg|png|webp|avif|pdf)$/); // strict name = no path traversal
  if (!m) return new Response("Not found", { status: 404 });
  try {
    const body = await readFile(path.join(/*turbopackIgnore: true*/ DIR, name));
    return new Response(body, { headers: { "Content-Type": TYPES[m[1]], "Cache-Control": "public, max-age=31536000, immutable", "X-Content-Type-Options": "nosniff" } });
  } catch {
    return new Response("Not found", { status: 404 });
  }
}
