"use client";
import { useRouter } from "next/navigation";
import { useEffect, useLayoutEffect, useState, useTransition } from "react";
import { saveDoc } from "@/lib/actions";
import { setIn, type Field, type Tab } from "@/lib/fields";
import type { L } from "@/lib/i18n";
import { media, mediaThumb } from "@/lib/media";
import { ActionBar } from "./ActionBar";
import { Button, ButtonLink, buttonClass, Card, Checkbox, FieldRow, Input, Pill, Select, Textarea } from "@/components/kit";

type V = any; // eslint-disable-line @typescript-eslint/no-explicit-any

const MAX_MB = { image: 8, pdf: 10 };
const ACCEPT = { image: "image/jpeg,image/png,image/webp,image/avif", pdf: "application/pdf" };

/** 1) our server signs (auth + folder + allowed formats), 2) browser uploads straight to Cloudinary. Returns the stored path. */
async function uploadFile(kind: "image" | "pdf", file: File): Promise<string> {
  if (file.size > MAX_MB[kind] * 1024 * 1024) throw new Error(`${file.name}: too large (max ${MAX_MB[kind]} MB)`);
  const signed = await fetch("/api/upload", { method: "POST", headers: { "Content-Type": "application/json" }, body: JSON.stringify({ kind }) }).then((r) => r.json());
  if (!signed.url) throw new Error(signed.error ?? "Upload failed");
  const fd = new FormData();
  fd.append("file", file);
  Object.entries(signed.fields as Record<string, string>).forEach(([k, v]) => fd.append(k, v));
  const r = await fetch(signed.url, { method: "POST", body: fd }).then((r) => r.json());
  if (!r.public_id) throw new Error(`${file.name}: ${r.error?.message ?? "upload failed"}`);
  return `${r.public_id}.${r.format}`; // path only; host comes from NEXT_PUBLIC_MEDIA_URL
}

export function Upload({ kind, value, onChange }: { kind: "image" | "pdf"; value?: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setErr("");
    try {
      onChange(await uploadFile(kind, file));
    } catch (e) {
      setErr((e as Error).message);
    } finally {
      setBusy(false);
    }
  }
  const label = busy ? "Uploading…" : value ? "Replace" : kind === "pdf" ? "Upload PDF" : "Upload image";
  return (
    <div className="flex flex-wrap items-center gap-3">
      {value && (kind === "image" ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={mediaThumb(value)} alt="" loading="lazy" className="size-16 shrink-0 rounded-lg border border-line object-cover" />
      ) : (
        <a href={media(value)} target="_blank" rel="noopener" className="max-w-56 truncate text-sm text-accent hover:underline">📄 {value.split("/").pop()}</a>
      ))}
      <label className={buttonClass(value ? "ghost" : "outline", "md", busy ? "pointer-events-none opacity-60" : "")}>
        {label}
        <input type="file" hidden disabled={busy} accept={ACCEPT[kind]} onChange={(e) => (pick(e.target.files?.[0]), (e.target.value = ""))} />
      </label>
      {value && !busy && <Button variant="danger" size="sm" onClick={() => onChange("")}>Remove</Button>}
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

/** Pick many files at once; uploads them one by one and hands back all stored paths (failed files are reported, not lost). */
function MultiUpload({ kind, onDone }: { kind: "image" | "pdf"; onDone: (files: { path: string; name: string }[]) => void }) {
  const [progress, setProgress] = useState<string>("");
  const [errs, setErrs] = useState<string[]>([]);
  async function pick(list: FileList | null) {
    const files = [...(list ?? [])];
    if (!files.length) return;
    const done: { path: string; name: string }[] = [];
    const failed: string[] = [];
    for (const [i, file] of files.entries()) {
      setProgress(`Uploading ${i + 1} of ${files.length}…`);
      try {
        done.push({ path: await uploadFile(kind, file), name: file.name });
      } catch (e) {
        failed.push((e as Error).message);
      }
    }
    setProgress("");
    setErrs(failed);
    if (done.length) onDone(done);
  }
  return (
    <span className="flex flex-wrap items-center gap-2">
      <label className={buttonClass("outline", "sm", progress ? "pointer-events-none opacity-60" : "")}>
        {progress || (kind === "pdf" ? "Upload PDFs (select many)" : "Upload photos (select many)")}
        <input type="file" hidden multiple disabled={!!progress} accept={ACCEPT[kind]} onChange={(e) => (pick(e.target.files), (e.target.value = ""))} />
      </label>
      {errs.map((m) => <span key={m} className="text-xs text-danger">{m}</span>)}
    </span>
  );
}

function LInput({ value, onChange, long, placeholder }: { value?: L; onChange: (v: L) => void; long?: boolean; placeholder?: L | null }) {
  return (
    <div className="grid gap-2 sm:grid-cols-2">
      {(["en", "hi"] as const).map((l) => {
        const p = { value: value?.[l] ?? "", placeholder: placeholder?.[l] ?? (l === "hi" ? "(falls back to English)" : ""), onChange: (e: { target: { value: string } }) => onChange({ en: "", ...value, [l]: e.target.value }) };
        return (
          <label key={l} className="flex items-start gap-1">
            <span className="mt-3 w-5 text-[10px] font-bold uppercase text-brand">{l}</span>
            {long ? <Textarea {...p} /> : <Input {...p} />}
          </label>
        );
      })}
    </div>
  );
}

export function FieldView({ f, value, onChange }: { f: Field; value: V; onChange: (v: V) => void }) {
  let control: React.ReactNode;
  switch (f.type) {
    case "text":
    case "url":
      control = <Input type={f.type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "textarea":
      control = <Textarea value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "number":
      control = <Input type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
      break;
    case "checkbox":
      return <Checkbox label={f.label} checked={!!value} onChange={(e) => onChange(e.target.checked)} />;
    case "L":
      control = <LInput value={value} onChange={onChange} long={f.long} placeholder={f.placeholder} />;
      break;
    case "select":
      control = (
        <Select value={value ?? ""} onChange={(v) => onChange(v)} aria-label={f.label} options={[{ value: "", label: "—" }, ...f.options]} />
      );
      break;
    case "multi": {
      const arr: string[] = value ?? [];
      control = (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {f.options.map((o) => (
            <Checkbox key={o.value} label={o.label} checked={arr.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))} />
          ))}
        </div>
      );
      break;
    }
    case "image":
    case "pdf":
      control = <Upload kind={f.type} value={value} onChange={onChange} />;
      break;
    case "group":
      control = (
        <Card className="grid gap-3 p-3">
          {f.of.map((c) => <FieldView key={c.k} f={c} value={value?.[c.k]} onChange={(v) => onChange(setIn(value ?? {}, [c.k], v))} />)}
        </Card>
      );
      break;
    case "list": {
      const items: V[] = value ?? [];
      const scalar = f.of.length === 1 && f.of[0].k === "";
      // lists whose items hold a file (photos, floor plans, PDFs) get a select-many upload that adds one item per file
      const media = scalar ? undefined : f.of.find((c) => c.type === "image" || c.type === "pdf");
      const titleKey = f.of.find((c) => c.type === "L" && c.k === "title")?.k;
      const move = (i: number, d: number) => {
        const next = [...items];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        onChange(next);
      };
      control = (
        <div className="grid gap-2">
          {items.map((item, i) => (
            <Card key={i} className="flex items-start gap-2 p-3">
              <div className="grid flex-1 content-start gap-2">
                {scalar ? (
                  <FieldView f={{ ...f.of[0], label: "" } as Field} value={item} onChange={(v) => onChange(setIn(items, [i], v))} />
                ) : (
                  f.of.map((c) => <FieldView key={c.k} f={c} value={item?.[c.k]} onChange={(v) => onChange(setIn(items, [i, c.k], v))} />)
                )}
              </div>
              <div className="flex flex-col gap-1">
                <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</Button>
                <Button variant="ghost" size="sm" disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</Button>
                <Button variant="danger" size="sm" onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">✕</Button>
              </div>
            </Card>
          ))}
          <div className="flex flex-wrap items-center gap-2">
            <Button variant="ghost" size="sm" onClick={() => onChange([...items, scalar ? (f.of[0].type === "L" ? { en: "" } : "") : {}])}>
              + Add
            </Button>
            {media && (
              <MultiUpload
                kind={media.type as "image" | "pdf"}
                onDone={(files) =>
                  onChange([
                    ...items,
                    // PDFs get their file name as a starting title; photo alt text is left for the editor
                    ...files.map((x) => ({ [media.k]: x.path, ...(titleKey ? { [titleKey]: { en: x.name.replace(/\.[^.]+$/, "").replace(/[-_]+/g, " ") } } : {}) })),
                  ])
                }
              />
            )}
          </div>
        </div>
      );
      break;
    }
  }
  return <FieldRow label={f.label} help={f.help}>{control}</FieldRow>;
}

/** Generic editor: tabs of fields → saveDoc(entity, id, data). */
export function DocForm({ entity, id, initial, tabs, title, back, viewUrl }: { entity: string; id: string | null; initial: V; tabs: Tab[]; title: string; back?: { href: string; label: string }; viewUrl?: string }) {
  const router = useRouter();
  const [data, setData] = useState<V>(initial);
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(data) !== JSON.stringify(initial);
  const isNew = !id && !!back; // singletons (settings) have no id before first save but aren't "new"

  // Next keeps visited pages alive (hidden) and restores their state. A "new" form must start empty every time,
  // so clear it when it's hidden (after Create navigates to the saved item, or when the user leaves).
  const [blank] = useState(initial); // first value only: a re-render with a new `initial` object must not wipe typing
  useLayoutEffect(() => {
    if (!isNew) return;
    return () => {
      setData(blank);
      setTab(0);
      setMsg(null);
    };
  }, [isNew, blank]);

  // warn before closing/reloading the tab with unsaved edits
  useEffect(() => {
    if (!dirty) return;
    const warn = (e: BeforeUnloadEvent) => e.preventDefault();
    addEventListener("beforeunload", warn);
    return () => removeEventListener("beforeunload", warn);
  }, [dirty]);

  const save = () =>
    start(async () => {
      const r = await saveDoc(entity, id, data);
      setMsg(r.ok ? { ok: true, text: "✓ Saved" } : { ok: false, text: r.error });
      if (r.ok && !id && back && r.id) router.replace(`${back.href}/${r.id}`); // edits: the action already refreshed
    });

  const status = pending ? (
    <span className="text-muted">Saving…</span>
  ) : dirty ? (
    <span className="text-accent">● Unsaved changes</span>
  ) : msg ? (
    <span className={msg.ok ? "text-muted" : "text-danger"}>{msg.text}</span>
  ) : null;

  return (
    <div className="grid gap-4">
      <ActionBar title={title} back={back} status={status}>
        {viewUrl && <ButtonLink href={viewUrl} external variant="ghost">View ↗</ButtonLink>}
        <Button disabled={pending || (!dirty && !!id)} onClick={save}>{isNew ? "Create" : "Save changes"}</Button>
      </ActionBar>
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-2">
          {tabs.map((tb, i) => (
            <Pill key={tb.name} active={i === tab} onClick={() => setTab(i)}>{tb.name}</Pill>
          ))}
        </div>
      )}
      <div className="grid gap-4">
        {tabs[tab].fields.map((f) => <FieldView key={f.k} f={f} value={data?.[f.k]} onChange={(v) => setData((d: V) => setIn(d, [f.k], v))} />)}
      </div>
    </div>
  );
}
