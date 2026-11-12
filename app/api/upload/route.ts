import { createHash } from "node:crypto";
import { can, getUser } from "@/lib/auth";

// Browser uploads straight to Cloudinary; this route only signs the request so the API secret never leaves the server.
// Signed params restrict uploads to our folder + allowed formats; Cloudinary rejects anything else.
const FOLDER = "madhuram";
const FORMATS = { image: "jpg,jpeg,png,webp,avif", pdf: "pdf" } as const;

/** Cloudinary signature: params sorted by key, joined as k=v&k=v, secret appended, SHA-1. */
function sign(params: Record<string, string>, secret: string) {
  const str = Object.keys(params).sort().map((k) => `${k}=${params[k]}`).join("&");
  return createHash("sha1").update(str + secret).digest("hex");
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || !(["projects", "taxonomy", "testimonials", "landing", "settings"] as const).some((p) => can(u, p))) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const { CLOUDINARY_CLOUD_NAME: cloud, CLOUDINARY_API_KEY: apiKey, CLOUDINARY_API_SECRET: secret } = process.env;
  if (!cloud || !apiKey || !secret) return Response.json({ error: "Uploads not configured (set CLOUDINARY_CLOUD_NAME, CLOUDINARY_API_KEY, CLOUDINARY_API_SECRET)" }, { status: 503 });
  const kind = (await req.json().catch(() => ({}))).kind === "pdf" ? "pdf" : "image";
  const params = { folder: FOLDER, allowed_formats: FORMATS[kind], timestamp: String(Math.floor(Date.now() / 1000)) };
  return Response.json({
    // PDFs go through image/upload too, so every stored path shares one base: NEXT_PUBLIC_MEDIA_URL
    url: `https://api.cloudinary.com/v1_1/${cloud}/image/upload`,
    fields: { ...params, api_key: apiKey, signature: sign(params, secret) },
  });
}
