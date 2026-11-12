import { LandingEditor } from "@/components/admin/Panels";
import { requirePerm } from "@/lib/auth";
import { getDraftLanding, plain } from "@/lib/data";
import { db } from "@/lib/db";
import type { Field } from "@/lib/fields";
import { Collection, Landing, LANDING_SECTIONS } from "@/lib/models";

const L = (k: string, label: string, long = false): Field => ({ k, label, type: "L", long });

export default async function LandingPage() {
  await requirePerm("landing");
  await db();
  const [draft, collections, doc] = await Promise.all([getDraftLanding(), Collection.find().lean(), Landing.findOne().select("publishedAt").lean()]);
  // any section key missing from the draft is appended hidden, so it can be turned on
  const sections = [...draft, ...LANDING_SECTIONS.filter((k) => !draft.some((s) => s.key === k)).map((key) => ({ key, visible: false }))];

  const common = [L("title", "Title"), L("subtitle", "Subtitle / text", true)];
  const fieldsByKey: Record<string, Field[]> = {
    trust: [
      { k: "items", label: "Slides (1 = static, 2+ = auto-advance)", type: "list", of: [{ k: "image", label: "Image", type: "image" }, L("alt", "Alt text"), L("headline", "Headline"), L("subline", "Subline"), { k: "link", label: "Link (optional, e.g. /en/projects)", type: "text" }] },
      { k: "stats", label: "Stats row (optional)", type: "list", of: [{ k: "value", label: "Value (e.g. 25+)", type: "text" }, L("label", "Label")] },
    ],
    about: [...common, { k: "variant", label: "Budget slider", type: "select", options: [{ value: "budget", label: "Show" }, { value: "noBudget", label: "Hide" }] }],
    locations: [...common, { k: "variant", label: "Style", type: "select", options: [{ value: "circles", label: "Circles" }, { value: "tiles", label: "Tiles" }] }],
    topProjects: [...common, { k: "collectionId", label: "Collection to show", type: "select", options: collections.map((c) => ({ value: String(c._id), label: c.name })) }],
    types: common,
    testimonials: common,
    contact: common,
  };
  return (
    <div className="grid gap-3">
      <h1 className="text-xl font-bold">Landing page</h1>
      <LandingEditor initial={sections} fieldsByKey={fieldsByKey} publishedAt={doc?.publishedAt ? plain(doc.publishedAt) : undefined} />
    </div>
  );
}
