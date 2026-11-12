// Form field specs: built on the server, rendered by components/admin/Form.tsx. Plain data only.
import type { L } from "./i18n";

export type Opt = { value: string; label: string };
export type Field = { k: string; label: string; help?: string } & (
  | { type: "text" | "textarea" | "number" | "checkbox" | "url" }
  | { type: "L"; long?: boolean; placeholder?: L | null }
  | { type: "select" | "multi"; options: Opt[] }
  | { type: "image" | "pdf" }
  | { type: "list" | "group"; of: Field[] } // list with a single field whose k is "" = list of scalars
);
export type Tab = { name: string; fields: Field[] };

/** Immutable set at path. */
export function setIn<T>(obj: T, path: (string | number)[], v: unknown): T {
  if (!path.length) return v as T;
  const [h, ...rest] = path;
  const o = obj as Record<string | number, unknown> | unknown[] | undefined;
  const copy = (Array.isArray(o) ? [...o] : { ...(o ?? {}) }) as Record<string | number, unknown>;
  copy[h] = setIn((o as Record<string | number, unknown> | undefined)?.[h], rest, v);
  return copy as T;
}
