"use client";
// Custom dropdown (replaces native <select>, whose popup can't be styled). ARIA listbox pattern:
// button + popup list, arrows/Home/End/Enter/Space/Esc/Tab, type-to-jump, click-outside closes.
// `name` adds a hidden input so it still submits with plain GET/POST forms.
import { useEffect, useId, useRef, useState } from "react";

export type Option = { value: string; label: string };
type Props = {
  options: Option[];
  value?: string;
  onChange?: (value: string) => void;
  name?: string;
  placeholder?: string;
  disabled?: boolean;
  fieldSize?: "sm" | "md" | "lg";
  className?: string;
  "aria-label"?: string;
};
const SIZE = { sm: "h-9 px-3 text-sm", md: "h-10 px-3 text-sm", lg: "h-12 px-4 text-base" };

export function Select({ options, value = "", onChange, name, placeholder = "—", disabled, fieldSize = "md", className, "aria-label": ariaLabel }: Props) {
  const id = useId();
  const [open, setOpen] = useState(false);
  const [active, setActive] = useState(0);
  const root = useRef<HTMLDivElement>(null);
  const list = useRef<HTMLUListElement>(null);
  const selected = options.findIndex((o) => o.value === value);

  // close on outside pointer
  useEffect(() => {
    if (!open) return;
    const off = (e: PointerEvent) => !root.current?.contains(e.target as Node) && setOpen(false);
    document.addEventListener("pointerdown", off);
    return () => document.removeEventListener("pointerdown", off);
  }, [open]);
  // keep the highlighted option visible while arrowing through a long list
  useEffect(() => {
    if (open) list.current?.children[active]?.scrollIntoView({ block: "nearest" });
  }, [open, active]);

  const show = () => (setActive(Math.max(selected, 0)), setOpen(true));
  const pick = (i: number) => {
    const o = options[i];
    if (o) onChange?.(o.value);
    setOpen(false);
  };
  const onKey = (e: React.KeyboardEvent) => {
    const last = options.length - 1;
    const move = (i: number) => (e.preventDefault(), open ? setActive(Math.min(Math.max(i, 0), last)) : show());
    switch (e.key) {
      case "ArrowDown": return move(active + 1);
      case "ArrowUp": return move(active - 1);
      case "Home": return move(0);
      case "End": return move(last);
      case "Enter":
      case " ":
        e.preventDefault();
        return open ? pick(active) : show();
      case "Escape":
        if (open) e.preventDefault();
        return setOpen(false);
      case "Tab":
        return setOpen(false);
      default:
        // type-to-jump: first option (after current) starting with the typed letter
        if (e.key.length === 1 && /\S/.test(e.key)) {
          const k = e.key.toLowerCase();
          const from = open ? active : Math.max(selected, 0);
          const order = [...options.keys()].map((n) => (from + 1 + n) % options.length);
          const hit = order.find((n) => options[n].label.toLowerCase().startsWith(k));
          if (hit === undefined) return;
          if (open) setActive(hit);
          else onChange?.(options[hit].value);
        }
    }
  };

  return (
    <div ref={root} className={`relative self-start ${className ?? ""}`}>
      {name && <input type="hidden" name={name} value={value} />}
      <button
        type="button"
        role="combobox"
        aria-label={ariaLabel}
        aria-haspopup="listbox"
        aria-expanded={open}
        aria-controls={`${id}-list`}
        aria-activedescendant={open ? `${id}-${active}` : undefined}
        disabled={disabled}
        onClick={() => (open ? setOpen(false) : show())}
        onKeyDown={onKey}
        className={`flex w-full cursor-pointer items-center justify-between gap-2 rounded-lg border bg-surface text-left text-ink outline-none transition-colors focus-visible:border-brand focus-visible:ring-1 focus-visible:ring-brand disabled:opacity-50 ${open ? "border-brand" : "border-line hover:border-brand"} ${SIZE[fieldSize]}`}
      >
        <span className={`truncate ${selected < 0 ? "text-muted" : ""}`}>{selected < 0 ? placeholder : options[selected].label}</span>
        <svg viewBox="0 0 20 20" aria-hidden fill="currentColor" className={`size-4 shrink-0 text-brand transition-transform duration-200 ${open ? "rotate-180" : ""}`}>
          <path d="M5.2 7.5 10 12.3l4.8-4.8 1.1 1.1L10 14.5 4.1 8.6z" />
        </svg>
      </button>
      {open && (
        <ul
          ref={list}
          id={`${id}-list`}
          role="listbox"
          aria-label={ariaLabel}
          className="absolute inset-x-0 top-full z-30 mt-1 max-h-64 overflow-auto rounded-lg border border-line bg-surface py-1 shadow-2xl transition-[opacity,transform] duration-150 starting:-translate-y-1 starting:opacity-0"
        >
          {options.map((o, i) => (
            <li
              key={o.value}
              id={`${id}-${i}`}
              role="option"
              aria-selected={i === selected}
              onPointerEnter={() => setActive(i)}
              onPointerDown={(e) => e.preventDefault()} // keep focus on the button
              onClick={() => pick(i)}
              className={`flex cursor-pointer items-center justify-between gap-2 px-3 py-2 text-sm ${i === active ? "bg-surface-2 text-accent" : ""} ${i === selected ? "font-medium text-brand" : ""}`}
            >
              {o.label}
              {i === selected && <span aria-hidden>✓</span>}
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
