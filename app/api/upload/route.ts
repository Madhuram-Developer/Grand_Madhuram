import { createHash, randomBytes } from "node:crypto";
import { mkdir, writeFile } from "node:fs/promises";
import path from "node:path";
import { can, getUser } from "@/lib/auth";

const UPLOAD_DIR = process.env.UPLOAD_DIR ?? path.join(process.cwd(), "uploads");

// Detect type from magic bytes, never trust the browser's mime / filename.
function sniff(b: Buffer): { ext: string; max: number } | null {
  const MB = 1024 * 1024;
  if (b[0] === 0xff && b[1] === 0xd8 && b[2] === 0xff) return { ext: "jpg", max: 8 * MB };
  if (b.subarray(0, 4).toString("hex") === "89504e47") return { ext: "png", max: 8 * MB };
  if (b.subarray(0, 4).toString() === "RIFF" && b.subarray(8, 12).toString() === "WEBP") return { ext: "webp", max: 8 * MB };
  if (b.subarray(4, 12).toString() === "ftypavif") return { ext: "avif", max: 8 * MB };
  if (b.subarray(0, 5).toString() === "%PDF-") return { ext: "pdf", max: 25 * MB };
  return null;
}

/** Cloudinary when CLOUDINARY_URL=cloudinary://key:secret@cloud is set; otherwise ./uploads served by /api/files. */
async function store(buf: Buffer, ext: string) {
  const c = process.env.CLOUDINARY_URL?.match(/^cloudinary:\/\/(\w+):([\w-]+)@([\w-]+)/);
  if (c) {
    const [, apiKey, secret, cloud] = c;
    const timestamp = String(Math.floor(Date.now() / 1000));
    const folder = "madhuram";
    const signature = createHash("sha1").update(`folder=${folder}&timestamp=${timestamp}${secret}`).digest("hex");
    const fd = new FormData();
    fd.append("file", new Blob([new Uint8Array(buf)]));
    Object.entries({ api_key: apiKey, timestamp, folder, signature }).forEach(([k, v]) => fd.append(k, v));
    const type = ext === "pdf" ? "raw" : "image";
    const r = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/${type}/upload`, { method: "POST", body: fd }).then((r) => r.json());
    if (!r.secure_url) throw new Error(r.error?.message ?? "Cloudinary upload failed");
    return r.secure_url as string;
  }
  const name = `${randomBytes(12).toString("hex")}.${ext}`;
  await mkdir(UPLOAD_DIR, { recursive: true });
  await writeFile(path.join(/*turbopackIgnore: true*/ UPLOAD_DIR, name), buf);
  return `/api/files/${name}`;
}

export async function POST(req: Request) {
  const u = await getUser();
  if (!u || !(["projects", "taxonomy", "testimonials", "landing", "settings"] as const).some((p) => can(u, p))) {
    return Response.json({ error: "Not signed in" }, { status: 401 });
  }
  const file = (await req.formData()).get("file");
  if (!(file instanceof File)) return Response.json({ error: "No file" }, { status: 400 });
  const buf = Buffer.from(await file.arrayBuffer());
  const kind = sniff(buf);
  if (!kind) return Response.json({ error: "Only JPG, PNG, WebP, AVIF or PDF" }, { status: 415 });
  if (buf.length > kind.max) return Response.json({ error: `Too large (max ${kind.max / 1024 / 1024} MB)` }, { status: 413 });
  try {
    return Response.json({ url: await store(buf, kind.ext) });
  } catch (e) {
    return Response.json({ error: (e as Error).message }, { status: 502 });
  }
}
