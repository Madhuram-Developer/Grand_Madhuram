import "server-only";
import type { Model } from "mongoose";
import { can, type Perm, type SessionUser } from "./auth";
import { plain } from "./data";
import { db } from "./db";
import type { Field, Opt, Tab } from "./fields";
import { Collection, Location, PROJECT_SECTIONS, Project, ProjectPage, Settings, Testimonial, Type } from "./models";

type AnyDoc = Record<string, any>; // eslint-disable-line @typescript-eslint/no-explicit-any
type Entity = {
  model: Model<any>; // eslint-disable-line @typescript-eslint/no-explicit-any
  perm: Perm;
  tag: string; // cache tag refreshed on save
  title: string;
  singleton?: boolean;
  label: (d: AnyDoc) => string;
  sub?: (d: AnyDoc) => string;
  tabs: () => Promise<Tab[]>;
  blank?: () => Promise<Record<string, unknown>>;
  autoSlug?: boolean; // slug always rebuilt from English name; no slug field in the form
};

const en = (v: unknown) => (v as { en?: string } | undefined)?.en ?? "";
const L = (k: string, label: string, extra: Partial<Extract<Field, { type: "L" }>> = {}): Field => ({ k, label, type: "L", ...extra });
const seo: Field = { k: "seo", label: "SEO", type: "group", of: [L("title", "Title"), L("description", "Description", { long: true })] };
const geo: Field = { k: "geo", label: "Map pin", type: "group", help: "Right-click a spot in Google Maps to copy lat, lng", of: [{ k: "lat", label: "Latitude", type: "number" }, { k: "lng", label: "Longitude", type: "number" }] };
const slug: Field = { k: "slug", label: "URL slug", type: "text", help: "Leave empty to build from the English name" };
const order: Field = { k: "order", label: "Order", type: "number" };

async function opts() {
  await db();
  const [locations, types, projects, collections] = await Promise.all([
    Location.find().sort({ order: 1 }).lean(),
    Type.find().sort({ order: 1 }).lean(),
    Project.find().sort({ "name.en": 1 }).lean(),
    Collection.find().lean(),
  ]);
  const o = (rows: { _id: unknown; name?: unknown }[]): Opt[] => rows.map((r) => ({ value: String(r._id), label: typeof r.name === "string" ? r.name : en(r.name) }));
  const typeOpts = types.map((x) => {
    const parent = types.find((p) => String(p._id) === String(x.parent));
    return { value: String(x._id), label: parent ? `${en(parent.name)} › ${en(x.name)}` : en(x.name) };
  });
  typeOpts.sort((a, b) => a.label.localeCompare(b.label));
  return { locations: o(locations), types: typeOpts, topTypes: o(types.filter((x) => !x.parent)), projects: o(projects), collections: o(collections) };
}

export const ENTITIES: Record<string, Entity> = {
  projects: {
    model: Project, perm: "projects", tag: "projects", title: "Projects",
    label: (d) => en(d.name), sub: (d) => String(d.status),
    blank: async () => {
      const page = await ProjectPage.findOne().lean();
      return { status: "draft", facts: (page?.defaultFacts ?? []).map((f) => ({ label: f.label, value: { en: "" }, onCard: true })) };
    },
    tabs: async () => {
      const [o, page] = await Promise.all([opts(), ProjectPage.findOne().lean()]);
      const shared = (k: string) => page?.sections?.find((s) => s.key === k)?.title;
      return [
        { name: "Basics", fields: [
          L("name", "Name"), slug,
          { k: "status", label: "Status", type: "select", options: [{ value: "draft", label: "Draft (hidden)" }, { value: "published", label: "Published" }] },
          { k: "location", label: "City / location", type: "select", options: o.locations },
          L("locality", "Locality"),
          { k: "types", label: "Types (tick parent + sub-type)", type: "multi", options: o.types },
          L("shortDesc", "Short description", { long: true }),
          L("description", "Overview text", { long: true }),
          { k: "highlights", label: "Highlights", type: "list", of: [L("", "Highlight")] },
          { k: "amenities", label: "Amenities", type: "list", of: [L("", "Amenity")] },
          L("address", "Address"), geo,
          { k: "nearby", label: "Nearby places", type: "list", of: [L("name", "Place"), { k: "distance", label: "Distance", type: "text" }] },
          { k: "priceMin", label: "Price from (₹, for budget filter only — never shown)", type: "number" },
          { k: "priceMax", label: "Price up to (₹)", type: "number" },
          L("whatsappMsg", "Custom 'Know price' message (optional)", { long: true, help: "Placeholders: {project} {location} {config} {link}" }),
        ] },
        { name: "Card & facts", fields: [
          L("badge", "Status badge (e.g. Ready to move)"),
          { k: "facts", label: "Facts (tick 'On card' for up to 3)", type: "list", of: [L("label", "Label"), L("value", "Value"), { k: "onCard", label: "On card", type: "checkbox" }] },
        ] },
        { name: "Sections", fields: [
          { k: "sectionTitles", label: "Section title overrides (empty = shared default)", type: "group", of: PROJECT_SECTIONS.map((k) => L(k, k, { placeholder: shared(k) })) },
          { k: "hiddenSections", label: "Hide on this project", type: "multi", options: PROJECT_SECTIONS.map((k) => ({ value: k, label: en(shared(k)) || k })) },
        ] },
        { name: "Media", fields: [
          { k: "images", label: "Photos (first = cover / share image)", type: "list", of: [{ k: "url", label: "Image", type: "image" }, L("alt", "Alt text")] },
          { k: "videos", label: "YouTube videos", type: "list", of: [L("title", "Title"), { k: "youtubeUrl", label: "YouTube URL", type: "url" }] },
          { k: "documents", label: "Downloads (PDF)", type: "list", of: [L("title", "Title"), { k: "pdfUrl", label: "PDF", type: "pdf" }] },
        ] },
        { name: "Floor plans", fields: [
          { k: "configs", label: "Configurations", type: "list", of: [{ k: "bhk", label: "Bedrooms (BHK)", type: "number" }, L("label", "Label (e.g. 3 BHK)"), { k: "sizeSqft", label: "Size (sq ft)", type: "number" }, { k: "floorPlan", label: "Floor plan", type: "image" }] },
        ] },
        { name: "SEO", fields: [seo] },
      ];
    },
  },
  collections: {
    model: Collection, perm: "projects", tag: "projects", title: "Collections",
    label: (d) => String(d.name), sub: (d) => `${(d.projects as unknown[])?.length ?? 0} projects`,
    tabs: async () => {
      const o = await opts();
      return [{ name: "Collection", fields: [{ k: "name", label: "Name (internal)", type: "text" }, { k: "projects", label: "Projects (in order)", type: "list", of: [{ k: "", label: "Project", type: "select", options: o.projects }] }] }];
    },
  },
  "project-page": {
    model: ProjectPage, perm: "projects", tag: "projects", title: "Project page settings", singleton: true,
    label: () => "Project page",
    tabs: async () => {
      const o = await opts();
      return [{ name: "Project page", fields: [
        { k: "sections", label: "Sections (shared titles + order)", type: "list", of: [{ k: "key", label: "Section", type: "select", options: PROJECT_SECTIONS.map((k) => ({ value: k, label: k })) }, L("title", "Title"), { k: "visible", label: "Visible", type: "checkbox" }] },
        { k: "defaultFacts", label: "Default facts for new projects", type: "list", of: [L("label", "Label")] },
        { k: "similar", label: "'Similar projects' collection", type: "select", options: o.collections },
      ] }];
    },
  },
  locations: {
    model: Location, perm: "taxonomy", tag: "taxonomy", title: "Locations", autoSlug: true,
    label: (d) => en(d.name), sub: (d) => `/locations/${d.slug}`,
    tabs: async () => [{ name: "Location", fields: [L("name", "Name", { help: "URL is built from the English name automatically" }), { k: "image", label: "Image", type: "image" }, order, L("seoIntro", "Intro text (location page)", { long: true })] }],
  },
  types: {
    model: Type, perm: "taxonomy", tag: "taxonomy", title: "Types",
    label: (d) => en(d.name), sub: (d) => (d.parent ? "sub-type" : "top-level"),
    tabs: async () => {
      const o = await opts();
      return [{ name: "Type", fields: [L("name", "Name"), slug, { k: "parent", label: "Parent (empty = top-level)", type: "select", options: o.topTypes }, order] }];
    },
  },
  testimonials: {
    model: Testimonial, perm: "testimonials", tag: "testimonials", title: "Testimonials",
    label: (d) => String(d.name), sub: (d) => (d.active ? "active" : "hidden"),
    blank: async () => ({ active: true, rating: 5 }),
    tabs: async () => {
      const o = await opts();
      return [{ name: "Testimonial", fields: [{ k: "name", label: "Name", type: "text" }, L("text", "Text", { long: true }), { k: "project", label: "Project", type: "select", options: o.projects }, { k: "photo", label: "Photo", type: "image" }, { k: "rating", label: "Rating (1-5)", type: "number" }, order, { k: "active", label: "Active", type: "checkbox" }] }];
    },
  },
  settings: {
    model: Settings, perm: "settings", tag: "settings", title: "Settings", singleton: true,
    label: () => "Settings",
    tabs: async () => [
      { name: "Contact", fields: [
        { k: "whatsappNumber", label: "WhatsApp number", type: "text", help: "Digits with country code, e.g. 919876543210" },
        { k: "phone", label: "Phone", type: "text" }, { k: "email", label: "Email", type: "text" },
        L("address", "Address"), geo, L("hours", "Opening hours"),
        { k: "socials", label: "Social links", type: "group", of: ["instagram", "facebook", "youtube", "x", "linkedin"].map((k) => ({ k, label: k, type: "url" as const })) },
      ] },
      { name: "Messages", fields: [
        L("priceMsg", "'Know price' WhatsApp message", { long: true, help: "Placeholders: {project} {location} {config} {link}" }),
        L("enquiryMsg", "General enquiry WhatsApp message", { long: true }),
      ] },
      { name: "SEO", fields: [{ ...seo, k: "defaultSeo", label: "Default SEO" }] },
      { name: "Legal pages", fields: [
        L("privacyPolicy", "Privacy Policy", { long: true, help: "Empty = built-in default text describing what this site actually collects. A line followed by text becomes a sub-heading. {email} and {phone} are filled from Contact. Have it reviewed before launch." }),
        L("cookiePolicy", "Cookie Policy", { long: true, help: "Empty = built-in default text. Same formatting rules as above." }),
      ] },
    ],
  },
};

export async function listDocs(entity: string) {
  const e = getEntity(entity)!;
  await db();
  const rows = plain(await e.model.find().sort(entity === "projects" ? { updatedAt: -1 } : { order: 1, _id: 1 }).lean()) as AnyDoc[];
  return rows.map((d) => ({ id: d._id, label: e.label(d) || "(untitled)", sub: e.sub?.(d) ?? "" }));
}

export async function loadDoc(entity: string, id?: string) {
  const e = getEntity(entity)!;
  await db();
  if (e.singleton) return plain((await e.model.findOne().lean()) ?? {}) as AnyDoc;
  if (!id || id === "new") return ((await e.blank?.()) ?? {}) as AnyDoc;
  if (!/^[a-f0-9]{24}$/.test(id)) return null;
  return plain(await e.model.findById(id).lean()) as AnyDoc | null;
}

/** Own-key lookup only (entity comes from URLs / client calls). */
export const getEntity = (k: string) => (Object.hasOwn(ENTITIES, k) ? ENTITIES[k] : undefined);

/**
 * Admin navigation, grouped by job. Add a new screen = add one line here (sidebar + dashboard both read this).
 * `perm` null = everyone signed in.
 */
type NavItem = { label: string; href: string; perm: Perm | "users" | null; hint?: string };
export const NAV: { group: string; items: NavItem[] }[] = [
  { group: "Overview", items: [{ label: "Dashboard", href: "/admin", perm: null }] },
  { group: "Projects", items: [
    { label: "All projects", href: "/admin/projects", perm: "projects", hint: "Add, edit, publish" },
    { label: "Collections", href: "/admin/collections", perm: "projects", hint: "Curated project lists" },
    { label: "Project page layout", href: "/admin/project-page", perm: "projects", hint: "Section order + titles" },
  ] },
  { group: "Leads", items: [
    { label: "Enquiries", href: "/admin/enquiries", perm: "enquiries", hint: "Get in touch form" },
  ] },
  { group: "Home page", items: [
    { label: "Landing editor", href: "/admin/landing", perm: "landing", hint: "Sections, draft + publish" },
    { label: "Testimonials", href: "/admin/testimonials", perm: "testimonials", hint: "Buyer reviews" },
  ] },
  { group: "Places & types", items: [
    { label: "Locations", href: "/admin/locations", perm: "taxonomy", hint: "Cities + location pages" },
    { label: "Property types", href: "/admin/types", perm: "taxonomy", hint: "Residential, plots…" },
  ] },
  { group: "Site", items: [
    { label: "Settings", href: "/admin/settings", perm: "settings", hint: "Contact, WhatsApp, SEO" },
    { label: "Users", href: "/admin/users", perm: "users", hint: "Admins + access" },
  ] },
];

/** NAV filtered to what this user may open; empty groups dropped. */
export const navFor = (u: SessionUser) =>
  NAV.map((g) => ({ group: g.group, items: g.items.filter((i) => i.perm === null || can(u, i.perm)).map(({ perm, ...i }) => i) })).filter((g) => g.items.length); // eslint-disable-line @typescript-eslint/no-unused-vars
