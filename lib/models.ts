import mongoose, { Schema, model, type InferSchemaType, type Model } from "mongoose";

const { ObjectId, Mixed } = Schema.Types;

/** Bilingual text: { en, hi? }. Read with t(). */
const L = new Schema({ en: { type: String, default: "" }, hi: String }, { _id: false });
const Geo = new Schema({ lat: Number, lng: Number }, { _id: false });
const Seo = new Schema({ title: L, description: L }, { _id: false });

export const PERMISSIONS = ["projects", "taxonomy", "testimonials", "landing", "settings"] as const;
export const PROJECT_SECTIONS = ["overview", "floorPlans", "videos", "documents", "amenities", "location", "similar"] as const;
export const LANDING_SECTIONS = ["trust", "about", "locations", "topProjects", "types", "testimonials", "contact"] as const;

// ponytail: guards against "OverwriteModelError" on dev HMR
function m<S extends Schema>(name: string, schema: S) {
  return (mongoose.models[name] as Model<InferSchemaType<S>>) ?? model(name, schema);
}

export const Project = m(
  "Project",
  new Schema(
    {
      slug: { type: String, required: true, unique: true },
      name: { type: L, required: true },
      shortDesc: L,
      description: L,
      location: { type: ObjectId, ref: "Location", index: true },
      locality: L,
      types: [{ type: ObjectId, ref: "Type", index: true }],
      badge: L, // card status badge, e.g. "Ready to move"
      configs: [{ bhk: Number, label: L, sizeSqft: Number, floorPlan: String }],
      facts: [{ label: L, value: L, onCard: { type: Boolean, default: false } }],
      highlights: [L],
      nearby: [{ name: L, distance: String }],
      priceMin: Number, // filter only, never shown
      priceMax: Number,
      images: [{ url: String, alt: L }],
      videos: [{ title: L, youtubeUrl: String }],
      documents: [{ title: L, pdfUrl: String }],
      amenities: [L],
      address: L,
      geo: Geo,
      whatsappMsg: L,
      sectionTitles: { type: Map, of: L }, // overrides only
      hiddenSections: [{ type: String, enum: PROJECT_SECTIONS }],
      seo: Seo,
      status: { type: String, enum: ["draft", "published"], default: "draft", index: true },
    },
    { timestamps: true },
  ),
);

export const Location = m(
  "Location",
  new Schema({
    slug: { type: String, required: true, unique: true },
    name: { type: L, required: true },
    image: String,
    order: { type: Number, default: 0 },
    seoIntro: L,
  }),
);

export const Type = m(
  "Type",
  new Schema({
    slug: { type: String, required: true, unique: true },
    name: { type: L, required: true },
    parent: { type: ObjectId, ref: "Type", default: null }, // 2 levels max
    order: { type: Number, default: 0 },
  }),
);

export const Testimonial = m(
  "Testimonial",
  new Schema({
    name: { type: String, required: true },
    text: L,
    project: { type: ObjectId, ref: "Project" },
    photo: String,
    rating: { type: Number, min: 1, max: 5 },
    order: { type: Number, default: 0 },
    active: { type: Boolean, default: true },
  }),
);

export const Collection = m(
  "Collection",
  new Schema({
    name: { type: String, required: true }, // internal
    projects: [{ type: ObjectId, ref: "Project" }], // ordered
  }),
);

export const ProjectPage = m(
  "ProjectPage",
  new Schema({
    sections: [{ _id: false, key: { type: String, enum: PROJECT_SECTIONS }, title: L, visible: { type: Boolean, default: true } }],
    defaultFacts: [{ _id: false, label: L }],
    similar: { type: ObjectId, ref: "Collection" },
  }),
);

export const Settings = m(
  "Settings",
  new Schema({
    whatsappNumber: String, // digits only, with country code
    phone: String,
    email: String,
    address: L,
    geo: Geo,
    hours: L,
    socials: { type: Map, of: String },
    priceMsg: L, // placeholders {project} {location} {config} {link}
    enquiryMsg: L,
    defaultSeo: Seo,
    logo: String,
  }),
);

const LandingSection = new Schema(
  {
    key: { type: String, enum: LANDING_SECTIONS, required: true },
    visible: { type: Boolean, default: true },
    title: L,
    subtitle: L,
    variant: String, // e.g. locations: circles | tiles
    items: [Mixed], // trust: slides; others as needed
    stats: [{ _id: false, value: String, label: L }], // trust stats row
    collectionId: { type: ObjectId, ref: "Collection" }, // topProjects
  },
  { _id: false },
);

export const Landing = m(
  "Landing",
  new Schema({
    draft: { sections: [LandingSection] },
    live: { sections: [LandingSection] },
    publishedAt: Date,
    publishedBy: String,
  }),
);

export const User = m(
  "User",
  new Schema(
    {
      username: { type: String, required: true, unique: true, lowercase: true, trim: true },
      passwordHash: { type: String, required: true },
      role: { type: String, enum: ["superadmin", "admin"], default: "admin" },
      permissions: [{ type: String, enum: PERMISSIONS }],
      active: { type: Boolean, default: true },
      lastLoginAt: Date,
    },
    { timestamps: true },
  ),
);
