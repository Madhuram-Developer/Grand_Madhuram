import { ActionBar } from "@/components/admin/ActionBar";
import { EnquiryActions } from "@/components/admin/EnquiryActions";
import { Card, Pill } from "@/components/kit";
import { requirePerm } from "@/lib/auth";
import { plain } from "@/lib/data";
import { db } from "@/lib/db";
import { Enquiry, ENQUIRY_STATUS } from "@/lib/models";
import { waLink } from "@/lib/site";

const when = (d: string) => new Date(d).toLocaleString("en-IN", { day: "numeric", month: "short", hour: "numeric", minute: "2-digit", timeZone: "Asia/Kolkata" });

/** Inbox for the landing page "Get in touch" form. Newest first; filter by status. */
export default async function Enquiries({ searchParams }: PageProps<"/admin/enquiries">) {
  await requirePerm("enquiries");
  const raw = (await searchParams).status;
  const status = ENQUIRY_STATUS.find((s) => s === raw);
  await db();
  const [docs, counts] = await Promise.all([
    Enquiry.find(status ? { status } : {}).sort({ createdAt: -1 }).limit(500).lean(),
    Enquiry.aggregate<{ _id: string; n: number }>([{ $group: { _id: "$status", n: { $sum: 1 } } }]),
  ]);
  const rows = plain(docs);
  const count = (s?: string) => (s ? counts.find((c) => c._id === s)?.n ?? 0 : counts.reduce((a, c) => a + c.n, 0));

  return (
    <div className="grid gap-4">
      <ActionBar title="Enquiries" status={<span className={count("new") ? "text-accent" : "text-muted"}>{count("new") ? `● ${count("new")} new` : "No new enquiries"}</span>} />
      <div className="flex flex-wrap gap-2">
        <Pill href="/admin/enquiries" active={!status}>All ({count()})</Pill>
        {ENQUIRY_STATUS.map((s) => <Pill key={s} href={`/admin/enquiries?status=${s}`} active={status === s} className="capitalize">{s} ({count(s)})</Pill>)}
      </div>
      <div className="grid gap-3">
        {rows.map((r) => (
          <Card key={r._id} className={`grid gap-3 p-4 lg:grid-cols-[1fr_auto] ${r.status === "new" ? "border-brand" : ""}`}>
            <div className="grid min-w-0 gap-1">
              <div className="flex flex-wrap items-baseline gap-x-3 gap-y-1">
                <p className="font-bold">{r.name}</p>
                <a href={`tel:${r.phone}`} className="text-sm text-accent hover:underline">{r.phone}</a>
                <a href={waLink(r.phone.replace(/\D/g, ""), `Hi ${r.name}, thanks for your enquiry with Madhuram.`)} target="_blank" rel="noopener" className="text-sm text-accent hover:underline">WhatsApp ↗</a>
                {r.email && <a href={`mailto:${r.email}`} className="text-sm text-accent hover:underline">{r.email}</a>}
              </div>
              <p className="text-xs text-muted">
                {when(r.createdAt)}{r.project && <> · <span className="text-ink">{r.project}</span></>}{r.lang === "hi" && " · Hindi"}{r.page && ` · from ${r.page}`}
              </p>
              {r.message && <p className="whitespace-pre-line text-sm">{r.message}</p>}
            </div>
            <EnquiryActions id={r._id} status={r.status ?? "new"} name={r.name} />
          </Card>
        ))}
        {!rows.length && <Card className="p-6 text-center text-sm text-muted">No enquiries{status ? ` marked "${status}"` : " yet"}. Turn on the &quot;enquiry&quot; section in the Landing editor to start collecting them.</Card>}
      </div>
    </div>
  );
}
