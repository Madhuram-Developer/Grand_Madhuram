import "server-only";
import type { Types } from "mongoose";
import { cacheLife, cacheTag } from "next/cache";
import { db } from "./db";
import { Collection, Landing, Location, Project, ProjectPage, Settings, Testimonial, Type } from "./models";

// Cached public reads. Admin saves call updateTag(<tag>) (see lib/actions.ts).

/** What a lean doc looks like after a JSON round-trip: ids/dates → strings, Maps → records. */
export type Plain<T> = T extends Types.ObjectId | Date
  ? string
  : T extends Map<string, infer V>
    ? Record<string, Plain<V>>
    : T extends readonly (infer U)[]
      ? Plain<U>[]
      : T extends object
        ? { [K in keyof T]: Plain<T[K]> }
        : T;
export const plain = <T>(v: T) => JSON.parse(JSON.stringify(v ?? null)) as Plain<T> & (T extends object ? { _id: string } : unknown);

async function load<T>(q: () => Promise<T>) {
  await db();
  return plain(await q());
}

export async function getSettings() {
  "use cache";
  cacheLife("content");
  cacheTag("settings");
  return load(() => Settings.findOne().lean());
}

export async function getLiveLanding() {
  "use cache";
  cacheLife("content");
  cacheTag("landing");
  return (await load(() => Landing.findOne().lean()))?.live?.sections ?? [];
}

/** Draft is admin-only and never cached. */
export async function getDraftLanding() {
  await db();
  return plain((await Landing.findOne().lean())?.draft?.sections ?? []);
}

export async function getProjects() {
  "use cache";
  cacheLife("content");
  cacheTag("projects");
  return load(() => Project.find({ status: "published" }).sort({ createdAt: -1 }).lean());
}
export type ProjectT = Awaited<ReturnType<typeof getProjects>>[number];

export async function getProject(slug: string) {
  return (await getProjects()).find((p) => p.slug === slug) ?? null;
}

export async function getLocations() {
  "use cache";
  cacheLife("content");
  cacheTag("taxonomy");
  return load(() => Location.find().sort({ order: 1 }).lean());
}
export type LocationT = Awaited<ReturnType<typeof getLocations>>[number];

export async function getTypes() {
  "use cache";
  cacheLife("content");
  cacheTag("taxonomy");
  return load(() => Type.find().sort({ order: 1 }).lean());
}
export type TypeT = Awaited<ReturnType<typeof getTypes>>[number];

export async function getTestimonials() {
  "use cache";
  cacheLife("content");
  cacheTag("testimonials");
  return load(() => Testimonial.find({ active: true }).sort({ order: 1 }).lean());
}

export async function getCollections() {
  "use cache";
  cacheLife("content");
  cacheTag("projects");
  return load(() => Collection.find().lean());
}

export async function getProjectPage() {
  "use cache";
  cacheLife("content");
  cacheTag("projects");
  return load(() => ProjectPage.findOne().lean());
}

/** Projects of a collection, in collection order, published only. */
export async function collectionProjects(id?: string | null) {
  const [cols, projects] = await Promise.all([getCollections(), getProjects()]);
  const ids = cols.find((c) => c._id === id)?.projects ?? [];
  return ids.map((pid) => projects.find((p) => p._id === pid)).filter((p): p is ProjectT => !!p);
}

/** Everything a card needs to label itself. */
export async function getCtx() {
  const [settings, locations, types] = await Promise.all([getSettings(), getLocations(), getTypes()]);
  return { settings, locations, types };
}
export type Ctx = Awaited<ReturnType<typeof getCtx>>;
