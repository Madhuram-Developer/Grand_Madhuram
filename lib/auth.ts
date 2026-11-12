import "server-only";
import { randomBytes } from "node:crypto";
import { jwtVerify, SignJWT } from "jose";
import { cookies } from "next/headers";
import { connection } from "next/server";
import { redirect } from "next/navigation";
import { cache } from "react";
import { db } from "./db";
import { User, type PERMISSIONS } from "./models";

export type Perm = (typeof PERMISSIONS)[number];
export type SessionUser = { id: string; username: string; role: "superadmin" | "admin"; permissions: Perm[] };

const COOKIE = "session";
const MAX_AGE = 60 * 60 * 24 * 7; // 7 days

function key() {
  const s = process.env.AUTH_SECRET;
  if (!s || s.length < 32) throw new Error("AUTH_SECRET must be set (32+ chars)");
  return new TextEncoder().encode(s);
}

export async function startSession(uid: string) {
  const jwt = await new SignJWT({ uid }).setProtectedHeader({ alg: "HS256" }).setIssuedAt().setExpirationTime(`${MAX_AGE}s`).sign(key());
  (await cookies()).set(COOKIE, jwt, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: MAX_AGE });
}

export async function endSession() {
  (await cookies()).delete(COOKIE);
}

/** Current user, re-read from DB each request so deactivation / permission changes apply immediately. */
export const getUser = cache(async (): Promise<SessionUser | null> => {
  const token = (await cookies()).get(COOKIE)?.value;
  if (!token) return null;
  await connection(); // per-request from here on: token expiry check reads the clock, user is re-read from DB
  try {
    const { payload } = await jwtVerify(token, key(), { algorithms: ["HS256"] });
    await db();
    const u = await User.findById(payload.uid).lean();
    if (!u?.active) return null;
    return { id: String(u._id), username: u.username, role: (u.role ?? "admin") as SessionUser["role"], permissions: (u.permissions ?? []) as Perm[] };
  } catch {
    return null;
  }
});

export const can = (u: SessionUser | null, p: Perm | "users") => !!u && (u.role === "superadmin" || (p !== "users" && u.permissions.includes(p)));

export async function requireUser() {
  const u = await getUser();
  if (!u) redirect("/admin/login");
  return u;
}

/** Use at the top of every admin page AND every admin server action. */
export async function requirePerm(p: Perm | "users") {
  const u = await requireUser();
  if (!can(u, p)) redirect("/admin?denied=1");
  return u;
}

export const newPassword = () => randomBytes(12).toString("base64url"); // 16 chars

// ponytail: in-memory per-username lockout; per-instance only — move to DB/Redis if running many instances
const fails = new Map<string, { n: number; until: number }>();
export function loginBlocked(username: string) {
  const f = fails.get(username);
  return !!f && f.n >= 5 && f.until > Date.now();
}
export function loginFailed(username: string) {
  const f = fails.get(username);
  const n = f && f.until > Date.now() ? f.n + 1 : 1;
  fails.set(username, { n, until: Date.now() + 15 * 60_000 });
}
export const loginOk = (username: string) => fails.delete(username);
