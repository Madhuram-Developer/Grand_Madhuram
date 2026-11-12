"use server";
import bcrypt from "bcryptjs";
import { updateTag } from "next/cache";
import { redirect } from "next/navigation";
import { getEntity } from "./admin";
import { endSession, loginBlocked, loginFailed, loginOk, newPassword, requirePerm, startSession } from "./auth";
import { db } from "./db";
import { Collection, Landing, PERMISSIONS, User } from "./models";

type Result = { ok: true; id?: string; password?: string } | { ok: false; error: string };
const fail = (e: unknown): Result => ({ ok: false, error: e instanceof Error ? e.message : String(e) });

// ---------- auth ----------
export async function login(_: unknown, form: FormData): Promise<{ error?: string }> {
  const username = String(form.get("username") ?? "").toLowerCase().trim();
  const password = String(form.get("password") ?? "");
  if (loginBlocked(username)) return { error: "Too many attempts. Try again in 15 minutes." };
  await db();
  const u = await User.findOne({ username });
  // compare even when user is missing so timing doesn't reveal usernames
  const ok = await bcrypt.compare(password, u?.passwordHash ?? "$2a$12$invalidinvalidinvalidinvalidinvalidinvalidinvalidinva");
  if (!u || !ok || !u.active) {
    loginFailed(username);
    return { error: "Wrong username or password." };
  }
  loginOk(username);
  u.lastLoginAt = new Date();
  await u.save();
  await startSession(String(u._id));
  redirect("/admin");
}

export async function logout() {
  await endSession();
  redirect("/admin/login");
}

// ---------- generic content CRUD ----------
const slugify = (s: string) => s.toLowerCase().normalize("NFKD").replace(/[^\w\s-]/g, "").trim().replace(/[\s_]+/g, "-").replace(/-+/g, "-").slice(0, 80);

/** "" → gone, empty objects/array holes dropped, so cleared fields fall back to defaults. */
function clean(v: unknown): unknown {
  if (v === "" || v === null || v === undefined) return undefined;
  if (Array.isArray(v)) return v.map(clean).filter((x) => x !== undefined);
  if (typeof v === "object") {
    const out = Object.fromEntries(Object.entries(v).map(([k, x]) => [k, clean(x)]).filter(([, x]) => x !== undefined));
    return Object.keys(out).length ? out : undefined;
  }
  return v;
}

export async function saveDoc(entity: string, id: string | null, data: Record<string, unknown>): Promise<Result> {
  const e = getEntity(entity);
  if (!e) return { ok: false, error: "Unknown type" };
  await requirePerm(e.perm);
  try {
    await db();
    const { _id, __v, createdAt, updatedAt, ...rest } = data; // eslint-disable-line @typescript-eslint/no-unused-vars
    const body = (clean(rest) ?? {}) as Record<string, unknown>;
    const nameEn = (body.name as { en?: string })?.en || "";
    if (e.autoSlug) body.slug = slugify(nameEn);
    else if ("slug" in e.model.schema.paths) body.slug = slugify(String(body.slug || nameEn));
    if ("slug" in e.model.schema.paths && !body.slug) return { ok: false, error: "Name (English) is required" };
    const doc = e.singleton ? ((await e.model.findOne()) ?? new e.model()) : id ? await e.model.findById(id) : new e.model();
    if (!doc) return { ok: false, error: "Not found" };
    // overwrite (not set) so removed fields really disappear
    doc.overwrite({ ...body, ...(doc.get("createdAt") ? { createdAt: doc.get("createdAt") } : {}) });
    await doc.save();
    updateTag(e.tag);
    return { ok: true, id: String(doc._id) };
  } catch (err) {
    const msg = (err as { code?: number }).code === 11000 ? "That slug/name is already used" : undefined;
    return msg ? { ok: false, error: msg } : fail(err);
  }
}

export async function deleteDoc(entity: string, id: string): Promise<Result> {
  const e = getEntity(entity);
  if (!e || e.singleton || !/^[a-f0-9]{24}$/.test(id)) return { ok: false, error: "Cannot delete" };
  await requirePerm(e.perm);
  await db();
  await e.model.findByIdAndDelete(id);
  if (entity === "projects") await Collection.updateMany({}, { $pull: { projects: id } });
  updateTag(e.tag);
  if (entity === "projects") updateTag("projects");
  return { ok: true };
}

// ---------- users (superadmin only) ----------
const perms = (v: unknown) => (Array.isArray(v) ? v : []).filter((p): p is (typeof PERMISSIONS)[number] => (PERMISSIONS as readonly string[]).includes(p));

export async function createUser(username: string, permissions: string[]): Promise<Result> {
  await requirePerm("users");
  username = username.toLowerCase().trim();
  if (!/^[a-z0-9._-]{3,32}$/.test(username)) return { ok: false, error: "Username: 3-32 chars, a-z 0-9 . _ -" };
  await db();
  if (await User.exists({ username })) return { ok: false, error: "Username taken" };
  const password = newPassword();
  const u = await User.create({ username, passwordHash: await bcrypt.hash(password, 12), role: "admin", permissions: perms(permissions) });
  return { ok: true, id: String(u._id), password };
}

/** Only plain admins can be changed from the UI; superadmins are managed by script. */
async function adminTarget(id: string) {
  await requirePerm("users");
  await db();
  const u = await User.findById(id);
  if (!u || u.role !== "admin") throw new Error("Not allowed");
  return u;
}

export async function updateUser(id: string, patch: { permissions?: string[]; active?: boolean }): Promise<Result> {
  try {
    const u = await adminTarget(id);
    if (patch.permissions) u.permissions = perms(patch.permissions);
    if (typeof patch.active === "boolean") u.active = patch.active;
    await u.save();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function resetPassword(id: string): Promise<Result> {
  try {
    const u = await adminTarget(id);
    const password = newPassword();
    u.passwordHash = await bcrypt.hash(password, 12);
    await u.save();
    return { ok: true, password };
  } catch (e) {
    return fail(e);
  }
}

// ---------- landing ----------
export async function saveDraft(sections: unknown[]): Promise<Result> {
  await requirePerm("landing");
  try {
    await db();
    const doc = (await Landing.findOne()) ?? new Landing();
    doc.set("draft.sections", (clean(sections) as unknown[]) ?? []);
    await doc.save();
    return { ok: true };
  } catch (e) {
    return fail(e);
  }
}

export async function publishLanding(): Promise<Result> {
  const u = await requirePerm("landing");
  await db();
  const doc = await Landing.findOne();
  if (!doc) return { ok: false, error: "Nothing to publish" };
  doc.set("live.sections", doc.toObject().draft?.sections ?? []);
  doc.publishedAt = new Date();
  doc.publishedBy = u.username;
  await doc.save();
  updateTag("landing");
  return { ok: true };
}

export async function discardDraft(): Promise<Result> {
  await requirePerm("landing");
  await db();
  const doc = await Landing.findOne();
  if (doc) {
    doc.set("draft.sections", doc.toObject().live?.sections ?? []);
    await doc.save();
  }
  return { ok: true };
}
