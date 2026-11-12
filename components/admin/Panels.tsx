"use client";
import { useRouter } from "next/navigation";
import { useActionState, useEffect, useRef, useState, useTransition } from "react";
import { createUser, discardDraft, login, publishLanding, resetPassword, saveDraft, updateUser } from "@/lib/actions";
import { setIn, type Field } from "@/lib/fields";
import { Alert, Button, Card, Checkbox, Input, Pill } from "@/components/kit";
import { ActionBar, Divider } from "./ActionBar";
import { FieldView } from "./Form";

type V = any; // eslint-disable-line @typescript-eslint/no-explicit-any

export function LoginForm() {
  const [state, action, pending] = useActionState(login, {});
  return (
    <form action={action} className="grid gap-3">
      <Input name="username" placeholder="Username" autoComplete="username" required fieldSize="lg" />
      <Input name="password" type="password" placeholder="Password" autoComplete="current-password" required fieldSize="lg" />
      {state?.error && <Alert>{state.error}</Alert>}
      <Button type="submit" size="lg" block disabled={pending}>{pending ? "…" : "Sign in"}</Button>
    </form>
  );
}

function OneTimePassword({ username, password, onClose }: { username: string; password: string; onClose: () => void }) {
  const [copied, setCopied] = useState(false);
  return (
    <Card className="border-brand p-3 text-sm">
      <p>Password for <b>{username}</b> — shown once, copy it now:</p>
      <div className="mt-2 flex gap-2">
        <code className="flex flex-1 items-center rounded-lg bg-bg px-3 font-mono">{password}</code>
        <Button variant="ghost" onClick={() => navigator.clipboard.writeText(password).then(() => setCopied(true))}>{copied ? "Copied" : "Copy"}</Button>
        <Button variant="ghost" onClick={onClose}>Done</Button>
      </div>
    </Card>
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
      <Checkbox key={p} label={p} checked={val.includes(p)} onChange={(e) => set(e.target.checked ? [...val, p] : val.filter((x) => x !== p))} />
    ));

  return (
    <div className="grid gap-6">
      {shown && <OneTimePassword {...shown} onClose={() => setShown(null)} />}
      {err && <Alert>{err}</Alert>}
      <form
        className="grid gap-3 rounded-xl border border-line bg-surface p-4"
        onSubmit={(e) => {
          e.preventDefault();
          const u = name;
          run(() => createUser(u, perms), u.toLowerCase().trim());
          setName("");
          setPerms([]);
        }}
      >
        <b className="text-sm">New admin</b>
        <Input placeholder="username" value={name} onChange={(e) => setName(e.target.value)} required />
        <div className="flex flex-wrap gap-x-4 gap-y-2">{permBoxes(perms, setPerms)}</div>
        <Button type="submit" className="justify-self-start" disabled={pending}>Create + generate password</Button>
      </form>
      <table className="w-full text-left text-sm">
        <thead className="text-muted"><tr><th className="py-1">User</th><th>Access</th><th>Last login</th><th /></tr></thead>
        <tbody>
          {users.map((u) => (
            <tr key={u.id} className="border-t border-line align-top">
              <td className="py-2 font-medium">{u.username}{!u.active && <span className="ml-1 text-xs text-danger">(disabled)</span>}</td>
              <td className="py-2">
                {u.role === "superadmin" ? "superadmin (everything)" : <div className="flex flex-wrap gap-x-3 gap-y-1">{permBoxes(u.permissions, (p) => run(() => updateUser(u.id, { permissions: p })))}</div>}
              </td>
              <td className="py-2 text-xs text-muted">{u.lastLoginAt ? new Date(u.lastLoginAt).toLocaleString() : "never"}</td>
              <td className="flex gap-1 py-2">
                {u.role !== "superadmin" && (
                  <>
                    <Button variant="ghost" size="sm" disabled={pending} onClick={() => run(() => resetPassword(u.id), u.username)}>Reset password</Button>
                    <Button variant={u.active ? "danger" : "ghost"} size="sm" disabled={pending} onClick={() => run(() => updateUser(u.id, { active: !u.active }))}>{u.active ? "Disable" : "Enable"}</Button>
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
export function LandingEditor({ initial, fieldsByKey, publishedAt, unpublished }: { initial: Section[]; fieldsByKey: Record<string, Field[]>; publishedAt?: string; unpublished: boolean }) {
  const [unpub, setUnpub] = useState(unpublished);
  const [liveAt, setLiveAt] = useState(publishedAt);
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
      if (r.ok) {
        setRev((n) => n + 1);
        setUnpub(true);
      }
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

  const busy = pending || status === "Saving…";
  const publish = () =>
    start(async () => {
      const r = await publishLanding();
      setStatus(r.ok ? "Published ✓" : `Error: ${r.error}`);
      if (r.ok) {
        setUnpub(false);
        setLiveAt(new Date().toISOString());
      }
    });
  const discard = () =>
    start(async () => {
      if (!confirm("Throw away all unpublished changes and go back to what is live now?")) return;
      await discardDraft();
      location.reload();
    });

  return (
    <div className="grid gap-4">
      <ActionBar
        title="Landing page"
        status={
          <div className="text-right">
            <p className={status.startsWith("Error") ? "text-danger" : unpub ? "text-accent" : "text-muted"}>
              {status === "Saving…" ? "Saving draft…" : status.startsWith("Error") ? status : unpub ? "● Draft has unpublished changes" : "✓ Live site is up to date"}
            </p>
            <p className="text-xs text-muted">Edits auto-save as a draft{liveAt && ` · live since ${new Date(liveAt).toLocaleString()}`}</p>
          </div>
        }
      >
        <Button variant="danger" size="sm" disabled={busy || !unpub} onClick={discard}>Discard draft</Button>
        <Divider />
        <Button disabled={busy || !unpub} onClick={publish}>{pending ? "Publishing…" : "Publish to live site"}</Button>
      </ActionBar>
      <div className="grid gap-4 lg:grid-cols-[minmax(320px,420px)_1fr]">
        <div className="grid content-start gap-2">
          {sections.map((s, i) => (
            <div key={s.key} draggable onDragStart={() => (drag.current = i)} onDragOver={(e) => e.preventDefault()} onDrop={() => drop(i)} className="rounded-xl border border-line bg-surface">
              <div className="flex items-center gap-2 p-2">
                <span className="cursor-grab text-muted" aria-hidden>⠿</span>
                <button type="button" className="flex-1 text-left text-sm font-medium" onClick={() => setOpen(open === s.key ? null : s.key)}>
                  {s.key} {!s.visible && <span className="text-xs text-muted">(hidden)</span>}
                </button>
                <Button variant="ghost" size="sm" disabled={i === 0} onClick={() => setSections((x) => setIn(setIn(x, [i], x[i - 1]), [i - 1], x[i]))} aria-label="Move up">↑</Button>
                <Checkbox label="show" className="text-xs" checked={!!s.visible} onChange={(e) => update(i, "visible", e.target.checked)} />
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
            {(["phone", "desktop"] as const).map((d) => <Pill key={d} active={device === d} onClick={() => setDevice(d)}>{d}</Pill>)}
            <span className="w-4" />
            {(["en", "hi"] as const).map((l) => <Pill key={l} active={lang === l} onClick={() => setLang(l)}>{l.toUpperCase()}</Pill>)}
          </div>
          <div className="overflow-hidden rounded-xl border border-line bg-surface">
            <iframe key={`${rev}-${lang}`} src={`/preview/${lang}`} title="Preview" className="mx-auto block h-[80vh] border-0" style={{ width: device === "phone" ? 390 : "100%" }} />
          </div>
        </div>
      </div>
    </div>
  );
}
