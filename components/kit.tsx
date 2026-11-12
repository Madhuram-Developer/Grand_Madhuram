// Central UI kit: every button, input, select, checkbox, pill and card on the site + admin comes from here.
// Server-safe (no hooks), so both server and client components can import it. Colors come from app/theme.css tokens.
import Link from "next/link";
import type { ComponentProps, ReactNode } from "react";

const cx = (...c: (string | false | null | undefined)[]) => c.filter(Boolean).join(" ");

/* ---------- Buttons ---------- */
export type Variant = "primary" | "outline" | "ghost" | "wa" | "danger";
export type Size = "sm" | "md" | "lg";
const VARIANT: Record<Variant, string> = {
  primary: "bg-brand text-brand-ink hover:bg-accent",
  outline: "border border-brand text-brand hover:bg-brand hover:text-brand-ink",
  ghost: "border border-line bg-surface text-ink hover:border-brand hover:text-accent",
  wa: "bg-wa text-wa-ink hover:brightness-110",
  danger: "border border-danger text-danger hover:bg-danger hover:text-bg",
};
const SIZE: Record<Size, string> = {
  sm: "h-8 px-3 text-xs",
  md: "h-10 px-4 text-sm",
  lg: "h-12 px-6 text-base",
};
/** Class string for anything that must look like a button (e.g. a <label> wrapping a file input). */
export const buttonClass = (variant: Variant = "primary", size: Size = "md", className?: string) =>
  cx(
    "inline-flex shrink-0 cursor-pointer items-center justify-center gap-2 whitespace-nowrap rounded-lg font-medium transition-colors",
    "focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-brand disabled:pointer-events-none disabled:opacity-50",
    VARIANT[variant],
    SIZE[size],
    className,
  );

type BtnOwn = { variant?: Variant; size?: Size; block?: boolean };
export function Button({ variant, size, block, className, type = "button", ...p }: BtnOwn & ComponentProps<"button">) {
  return <button type={type} className={buttonClass(variant, size, cx(block && "w-full", className))} {...p} />;
}
/** Same look as Button, rendered as a link. `external` opens in a new tab (WhatsApp, maps, PDFs). */
export function ButtonLink({ variant, size, block, className, href, external, ...p }: BtnOwn & { href: string; external?: boolean } & Omit<ComponentProps<"a">, "href">) {
  const cls = buttonClass(variant, size, cx(block && "w-full", className));
  if (external || /^https?:/.test(href)) return <a href={href} target="_blank" rel="noopener" className={cls} {...p} />;
  if (href.startsWith("/")) return <Link href={href} className={cls} {...p} />;
  return <a href={href} className={cls} {...p} />; // tel:, mailto:
}

/* ---------- Form fields ---------- */
const FIELD =
  "w-full rounded-lg border border-line bg-surface text-ink placeholder:text-muted outline-none transition-colors focus:border-brand focus:ring-1 focus:ring-brand disabled:opacity-50";
const FIELD_SIZE = { sm: "h-9 px-3 text-sm", md: "h-10 px-3 text-sm", lg: "h-12 px-4 text-base" };
type FieldSize = keyof typeof FIELD_SIZE;

export function Input({ fieldSize = "md", className, ...p }: { fieldSize?: FieldSize } & ComponentProps<"input">) {
  return <input className={cx(FIELD, FIELD_SIZE[fieldSize], className)} {...p} />;
}
export function Textarea({ className, rows = 3, ...p }: ComponentProps<"textarea">) {
  return <textarea rows={rows} className={cx(FIELD, "px-3 py-2 text-sm", className)} {...p} />;
}
/** Custom dropdown (client component, fully styled popup). */
export { Select, type Option } from "./Select";
export function Checkbox({ label, className, ...p }: { label?: ReactNode } & Omit<ComponentProps<"input">, "type">) {
  return (
    <label className={cx("inline-flex cursor-pointer items-center gap-2 text-sm", className)}>
      <input type="checkbox" className="size-4 cursor-pointer accent-brand" {...p} />
      {label}
    </label>
  );
}
/** Label + control + help text, stacked. */
export function FieldRow({ label, help, children }: { label?: ReactNode; help?: ReactNode; children: ReactNode }) {
  return (
    <div className="grid content-start gap-1.5">
      {label && <span className="text-sm font-medium">{label}</span>}
      {children}
      {help && <span className="text-xs text-muted">{help}</span>}
    </div>
  );
}

/* ---------- Pills (filters, tabs, chips) ---------- */
const pillClass = (active?: boolean, className?: string) =>
  cx(
    "inline-flex h-9 shrink-0 cursor-pointer items-center rounded-full px-4 text-sm transition-colors",
    active ? "bg-brand font-medium text-brand-ink" : "border border-line bg-surface text-ink hover:border-brand",
    className,
  );
export function Pill({ active, href, className, ...p }: { active?: boolean; href?: string } & ComponentProps<"button">) {
  if (href) return <Link href={href} className={pillClass(active, className)}>{p.children}</Link>;
  return <button type="button" aria-pressed={active} className={pillClass(active, className)} {...p} />;
}

/* ---------- Cards ---------- */
const CARD = "rounded-xl border border-line bg-surface";
/** Surface card. With `href` the whole card is a link and lifts its border on hover. */
export function Card({ href, external, className, children, ...p }: { href?: string; external?: boolean } & ComponentProps<"div">) {
  if (href) {
    const cls = cx(CARD, "block transition-colors hover:border-brand", className);
    return external ? <a href={href} target="_blank" rel="noopener" className={cls}>{children}</a> : <Link href={href} className={cls}>{children}</Link>;
  }
  return <div className={cx(CARD, className)} {...p}>{children}</div>;
}

export function Badge({ children, className }: { children: ReactNode; className?: string }) {
  return <span className={cx("inline-block rounded bg-badge px-2 py-0.5 text-[11px] font-medium text-badge-ink lg:text-xs", className)}>{children}</span>;
}

export function Alert({ tone = "danger", children }: { tone?: "danger" | "info"; children: ReactNode }) {
  return <p className={cx("rounded-lg border p-3 text-sm", tone === "danger" ? "border-danger text-danger" : "border-brand text-accent")}>{children}</p>;
}
