"use client";
import { useState, useTransition } from "react";
import { Button } from "@/components/kit";
import { deleteDoc } from "@/lib/actions";

/** Row-level delete for admin list screens: confirm → server action (permission-checked there) → refresh list. */
export function DeleteButton({ entity, id, label }: { entity: string; id: string; label: string }) {
  const [pending, start] = useTransition();
  const [err, setErr] = useState("");
  const remove = () =>
    start(async () => {
      if (!confirm(`Delete "${label}" permanently? This cannot be undone.`)) return;
      const r = await deleteDoc(entity, id);
      if (!r.ok) setErr(r.error); // success: the action refreshes the list in the same response
    });
  return (
    <span className="flex items-center gap-2">
      {err && <span className="text-xs text-danger">{err}</span>}
      <Button variant="danger" size="sm" disabled={pending} onClick={remove} aria-label={`Delete ${label}`}>
        {pending ? "Deleting…" : "Delete"}
      </Button>
    </span>
  );
}
