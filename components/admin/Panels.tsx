"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createUser, discardDraft, login, publishLanding, resetPassword, saveDraft, updateUser } from "@/lib/actions";
import { setIn, type Field } from "@/lib/fields";
import { btn, btnPrimary, FieldView, input } from "./Form";

type V = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="grid gap-3">
      <input name="username" placeholder="Username" autoComplete="username" required className={input} />
      <input name="password" type="password" placeholder="Password" autoComplete="current-password" required className={input} />
      {state?.error && <p className="text-sm text-danger">{state.error}</p>}
      <button className={btnPrimary} disabled={pending}>{pending ? "…" : "Sign in"}</button>
    </form>
  );
}

function OneTimePassword({ username, password, onClose }: { username: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <div className="rounded-md border border-accent bg-surface p-3 text-sm">
      <p>Password for <b>{username}</b> — shown once, copy it now:</p>
      <div className="mt-2 flex gap-2">
        <code className="flex-1 rounded bg-bg px-2 py-1.5 font-mono">{password}</code>
        <button type="button" className={btn} onClick={() => navigator.clipboard.writeText(password).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</button>
        <button type="button" className={btn} onClick={onClose}>Done</button>
      </div>
    </div>
  );
}

type UserRow = { id: string; username: string; role: string; permissions: string[]; active: boolean; lastLoginAt?: string };
export function UsersPanel({ users, allPerms }: { users: UserRow[]; allPerms: readonly string[] }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [name, setName] = useState("");
  const [perms, setPerms] = useState<string[]>([]);
  const [shown, setShown] = useState<{ username: string; password: string } | null>(null);
  const [err, setErr] = useState("");
  const run = (fn: () => Promise<{ ok: boolean; error?: string; password?: string }>, username?: string) =>
    start(async () => {
      const r = await fn();
      setErr(r.ok ? "" : (r.error ?? "Failed"));
      if (r.ok && r.password && username) setShown({ username, password: r.password });
      router.refresh();
    });
  const permBoxes = (val: string[], set: (v: string[]) => void) =>
    allPerms.map((p) => (
      <label key={p} className="flex items-center gap-1 text-sm">
        <input type="checkbox" checked={val.includes(p)} onChange={(e) => set(e.target.checked ? [...val, p] : val.filter((x) => x !== p))} /> {p}
      </label>
    ));

  return (
    <div className="grid gap-6">
      {shown && <OneTimePassword {...shown} onClose={() => setShown(null)} />}
      {err && <p className="text-sm text-danger">{err}</p>}
      <form
        className="grid gap-2 rounded-md border border-line bg-surface p-3"
        onSubmit={(e) => {
          e.preventDefault();
          const u = name;
          run(() => createUser(u, perms), u.toLowerCase().trim());
          setName("");
          setPerms([]);
        }}
      >
        <b className="text-sm">New admin</b>
        <input className={input} placeholder="username" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex flex-wrap gap-x-4">{permBoxes(perms, setPerms)}</div>
        <button className={`${btnPrimary} justify-self-start`} disabled={pending}>Create + generate password</button>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-muted"><tr><th className="py-1">User</th><th>Access</th><th>Last login</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-line align-top">
              <td className="py-2 font-medium">{u.username}{!u.active && <span className="ml-1 text-xs text-danger">(disabled)</span>}</td>
              <td className="py-2">
                {u.role === "superadmin" ? "superadmin (everything)" : <div className="flex flex-wrap gap-x-3">{permBoxes(u.permissions, (p) => run(() => updateUser(u.id, { permissions: p })))}</div>}
              </td>
              <td className="py-2 text-xs text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"}</td>
              <td className="flex gap-1 py-2">
                {u.role !== "superadmin" && (
                  <>
                    <button type="button" className={btn} disabled={pending} onClick={() => run(() => resetPassword(u.id), u.username)}>Reset password</button>
                    <button type="button" className={btn} disabled={pending} onClick={() => run(() => updateUser(u.id, { active: !u.active }))}>{u.active ? "Disable" : "Enable"}</button>
                  </>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

type Section = { key: string; visible?: boolean; [k: string]: V };
/**
 * Left: section list (drag to reorder, hide, edit). Right: iframe of /preview/[lang].
 * Edits auto-save to draft (debounced) then reload the iframe. Publish copies draft → live.
 */
export function LandingEditor({ initial, fieldsByKey, publishedAt }: { initial: Section[]; fieldsByKey: Record<string, Field[]>; publishedAt?: string }) {
  const [sections, setSections] = useState(initial);
  const [open, setOpen] = useState<string | null>(null);
  const [status, setStatus] = useState("Saved");
  const [rev, setRev] = useState(0);
  const [lang, setLang] = useState<"en" | "hi">("en");
  const [device, setDevice] = useState<"phone" | "desktop">("phone");
  const [pending, start] = useTransition();
  const drag = useRef<number | null>(null);
  const first = useRef(true);

  useEffect(() => {
    if (first.current) return void (first.current = false);
    setStatus("Saving…");
    const id = setTimeout(async () => {
      const r = await saveDraft(sections);
      setStatus(r.ok ? "Draft saved" : `Error: ${r.error}`);
      if (r.ok) setRev((n) => n + 1);
    }, 600);
    return () => clearTimeout(id);
  }, [sections]);

  const update = (i: number, k: string, v: V) => setSections((s) => setIn(s, [i, k], v));
  const drop = (to: number) => {
    const from = drag.current;
    drag.current = null;
    if (from === null || from === to) return;
    setSections((s) => {
      const next = [...s];
      next.splice(to, 0, next.splice(from, 1)[0]);
      return next;
    });
  };

  return (
    <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
      <div className="grid content-start gap-2">
        <div className="flex flex-wrap items-center gap-2">
          <button type="button" className={btnPrimary} disabled={pending || status === "Saving…"} onClick={() => start(async () => { const r = await publishLanding(); setStatus(r.ok ? "Published ✓" : `Error: ${r.error}`); })}>Publish</button>
          <button type="button" className={btn} disabled={pending} onClick={() => start(async () => { if (!confirm("Discard draft and go back to live?")) return; await discardDraft(); location.reload(); })}>Discard draft</button>
          <span className="text-xs text-muted">{status}{publishedAt && ` · live since ${new Date(publishedAt).toLocaleString()}`}</span>
        </div>
        {sections.map((s, i) => (
          <div key={s.key} draggable onDragStart={() => (drag.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)} className="rounded-md border border-line bg-surface">
            <div className="flex items-center gap-2 p-2">
              <span className="cursor-grab text-muted" aria-hidden>⠿</span>
              <button type="button" className="flex-1 text-left text-sm font-medium" onClick={() => setOpen(open === s.key ? null : s.key)}>
                {s.key} {!s.visible && <span className="text-xs text-muted">(hidden)</span>}
              </button>
              <button type="button" className={btn} disabled={i === 0} onClick={() => setSections((x) => setIn(setIn(x, [i], x[i - 1]), [i - 1], x[i]))} aria-label="Move up">↑</button>
              <label className="flex items-center gap-1 text-xs">
                <input type="checkbox" checked={!!s.visible} onChange={(e) => update(i, "visible", e.target.checked)} /> show
              </label>
            </div>
            {open === s.key && (
              <div className="grid gap-3 border-t border-line p-3">
                {(fieldsByKey[s.key] ?? []).map((f) => <FieldView key={f.k} f={f} value={s[f.k]} onChange={(v) => update(i, f.k, v)} />)}
              </div>
            )}
          </div>
        ))}
      </div>
      <div className="grid content-start gap-2">
        <div className="flex gap-2 text-sm">
          {(["phone", "desktop"] as const).map((d) => <button key={d} type="button" className={device === d ? btnPrimary : btn} onClick={() => setDevice(d)}>{d}</button>)}
          <span className="w-4" />
          {(["en", "hi"] as const).map((l) => <button key={l} type="button" className={lang === l ? btnPrimary : btn} onClick={() => setLang(l)}>{l.toUpperCase()}</button>)}
        </div>
        <div className="overflow-hidden rounded-md border border-line bg-surface">
          <iframe key={`${rev}-${lang}`} src={`/preview/${lang}`} title="Preview" className="mx-auto block h-[80vh] border-0" style={{ width: device === "phone" ? 390 : "100%" }} />
        </div>
      </div>
    </div>
  );
}
