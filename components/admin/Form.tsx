"use client";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { deleteDoc, saveDoc } from "@/lib/actions";
import { setIn, type Field, type Tab } from "@/lib/fields";
import type { L } from "@/lib/i18n";

type V = any; // eslint-disable-line @typescript-eslint/no-explicit-any
export const input = "w-full rounded-md border border-line bg-surface px-2 py-1.5 text-sm";
export const btn = "rounded-md border border-line bg-surface px-3 py-1.5 text-sm hover:bg-bg disabled:opacity-50";
export const btnPrimary = "rounded-md bg-brand px-4 py-1.5 text-sm font-medium text-brand-ink disabled:opacity-50";

export function Upload({ kind, value, onChange }: { kind: "image" | "pdf"; value?: string; onChange: (v: string) => void }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState("");
  async function pick(file?: File) {
    if (!file) return;
    setBusy(true);
    setErr("");
    const fd = new FormData();
    fd.append("file", file);
    const r = await fetch("/api/upload", { method: "POST", body: fd }).then((r) => r.json()).catch(() => ({ error: "Upload failed" }));
    setBusy(false);
    if (r.url) onChange(r.url);
    else setErr(r.error ?? "Upload failed");
  }
  return (
    <div className="flex items-center gap-2">
      {/* eslint-disable-next-line @next/next/no-img-element */}
      {kind === "image" && value && <img src={value} alt="" className="size-12 shrink-0 rounded object-cover" />}
      <input className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)} placeholder="URL or upload →" />
      <label className={`${btn} shrink-0 cursor-pointer`}>
        {busy ? "…" : "Upload"}
        <input type="file" hidden accept={kind === "image" ? "image/jpeg,image/png,image/webp,image/avif" : "application/pdf"} onChange={(e) => pick(e.target.files?.[0])} />
      </label>
      {err && <span className="text-xs text-danger">{err}</span>}
    </div>
  );
}

function LInput({ value, onChange, long, placeholder }: { value?: L; onChange: (v: L) => void; long?: boolean; placeholder?: L | null }) {
  const El = long ? "textarea" : "input";
  return (
    <div className="grid gap-1 sm:grid-cols-2">
      {(["en", "hi"] as const).map((l) => (
        <label key={l} className="flex items-start gap-1">
          <span className="mt-1.5 w-5 text-[10px] font-bold uppercase text-muted">{l}</span>
          <El className={input} rows={long ? 3 : undefined} value={value?.[l] ?? ""} placeholder={placeholder?.[l] ?? (l === "hi" ? "(falls back to English)" : "")} onChange={(e) => onChange({ en: "", ...value, [l]: e.target.value })} />
        </label>
      ))}
    </div>
  );
}

export function FieldView({ f, value, onChange }: { f: Field; value: V; onChange: (v: V) => void }) {
  let control: React.ReactNode;
  switch (f.type) {
    case "text":
    case "url":
      control = <input className={input} type={f.type} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "textarea":
      control = <textarea className={input} rows={3} value={value ?? ""} onChange={(e) => onChange(e.target.value)} />;
      break;
    case "number":
      control = <input className={input} type="number" value={value ?? ""} onChange={(e) => onChange(e.target.value === "" ? undefined : Number(e.target.value))} />;
      break;
    case "checkbox":
      return (
        <label className="flex items-center gap-2 text-sm">
          <input type="checkbox" checked={!!value} onChange={(e) => onChange(e.target.checked)} /> {f.label}
        </label>
      );
    case "L":
      control = <LInput value={value} onChange={onChange} long={f.long} placeholder={f.placeholder} />;
      break;
    case "select":
      control = (
        <select className={input} value={value ?? ""} onChange={(e) => onChange(e.target.value)}>
          <option value="">—</option>
          {f.options.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
        </select>
      );
      break;
    case "multi": {
      const arr: string[] = value ?? [];
      control = (
        <div className="flex flex-wrap gap-x-4 gap-y-1">
          {f.options.map((o) => (
            <label key={o.value} className="flex items-center gap-1.5 text-sm">
              <input type="checkbox" checked={arr.includes(o.value)} onChange={(e) => onChange(e.target.checked ? [...arr, o.value] : arr.filter((x) => x !== o.value))} />
              {o.label}
            </label>
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
        <div className="grid gap-3 rounded-md border border-line p-3">
          {f.of.map((c) => <FieldView key={c.k} f={c} value={value?.[c.k]} onChange={(v) => onChange(setIn(value ?? {}, [c.k], v))} />)}
        </div>
      );
      break;
    case "list": {
      const items: V[] = value ?? [];
      const scalar = f.of.length === 1 && f.of[0].k === "";
      const move = (i: number, d: number) => {
        const next = [...items];
        [next[i], next[i + d]] = [next[i + d], next[i]];
        onChange(next);
      };
      control = (
        <div className="grid gap-2">
          {items.map((item, i) => (
            <div key={i} className="flex gap-2 rounded-md border border-line bg-bg p-2">
              <div className="grid flex-1 gap-2">
                {scalar ? (
                  <FieldView f={{ ...f.of[0], label: "" } as Field} value={item} onChange={(v) => onChange(setIn(items, [i], v))} />
                ) : (
                  f.of.map((c) => <FieldView key={c.k} f={c} value={item?.[c.k]} onChange={(v) => onChange(setIn(items, [i, c.k], v))} />)
                )}
              </div>
              <div className="flex flex-col gap-1">
                <button type="button" className={btn} disabled={i === 0} onClick={() => move(i, -1)} aria-label="Move up">↑</button>
                <button type="button" className={btn} disabled={i === items.length - 1} onClick={() => move(i, 1)} aria-label="Move down">↓</button>
                <button type="button" className={btn} onClick={() => onChange(items.filter((_, j) => j !== i))} aria-label="Remove">✕</button>
              </div>
            </div>
          ))}
          <button type="button" className={`${btn} justify-self-start`} onClick={() => onChange([...items, scalar ? (f.of[0].type === "L" ? { en: "" } : "") : {}])}>
            + Add
          </button>
        </div>
      );
      break;
    }
  }
  return (
    <div className="grid gap-1">
      {f.label && <span className="text-sm font-medium">{f.label}</span>}
      {control}
      {f.help && <span className="text-xs text-muted">{f.help}</span>}
    </div>
  );
}

/** Generic editor: tabs of fields → saveDoc(entity, id, data). */
export function DocForm({ entity, id, initial, tabs, back, viewUrl }: { entity: string; id: string | null; initial: V; tabs: Tab[]; back?: string; viewUrl?: string }) {
  const router = useRouter();
  const [data, setData] = useState<V>(initial);
  const [tab, setTab] = useState(0);
  const [msg, setMsg] = useState<{ ok: boolean; text: string } | null>(null);
  const [pending, start] = useTransition();
  const dirty = JSON.stringify(data) !== JSON.stringify(initial);

  const save = () =>
    start(async () => {
      const r = await saveDoc(entity, id, data);
      setMsg(r.ok ? { ok: true, text: "Saved" } : { ok: false, text: r.error });
      if (r.ok && !id && back && r.id) router.replace(`${back}/${r.id}`);
      else if (r.ok) router.refresh();
    });
  const remove = () =>
    start(async () => {
      if (!id || !confirm("Delete permanently?")) return;
      const r = await deleteDoc(entity, id);
      if (r.ok && back) router.replace(back);
      else if (!r.ok) setMsg({ ok: false, text: r.error });
    });

  return (
    <div className="grid gap-4">
      {tabs.length > 1 && (
        <div className="flex flex-wrap gap-1 border-b border-line">
          {tabs.map((tb, i) => (
            <button key={tb.name} type="button" onClick={() => setTab(i)} className={`rounded-t-md px-3 py-1.5 text-sm ${i === tab ? "bg-surface font-medium shadow-[0_1px_0_var(--surface)]" : "text-muted"}`}>
              {tb.name}
            </button>
          ))}
        </div>
      )}
      <div className="grid gap-4">
        {tabs[tab].fields.map((f) => <FieldView key={f.k} f={f} value={data?.[f.k]} onChange={(v) => setData((d: V) => setIn(d, [f.k], v))} />)}
      </div>
      <div className="sticky bottom-0 flex items-center gap-2 border-t border-line bg-bg py-3">
        <button type="button" className={btnPrimary} disabled={pending || (!dirty && !!id)} onClick={save}>{pending ? "Saving…" : "Save"}</button>
        {viewUrl && <a href={viewUrl} target="_blank" className={btn}>View ↗</a>}
        {msg && <span className={`text-sm ${msg.ok ? "text-brand" : "text-danger"}`}>{msg.text}</span>}
        {id && back && <button type="button" className={`${btn} ml-auto text-danger`} disabled={pending} onClick={remove}>Delete</button>}
      </div>
    </div>
  );
}
