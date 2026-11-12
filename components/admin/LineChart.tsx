"use client";
import { useState } from "react";

type Point = { day: string; value: number };
const full = new Intl.NumberFormat("en-IN");
const compact = new Intl.NumberFormat("en-IN", { notation: "compact", maximumFractionDigits: 1 });
const dayLabel = (d: string) => new Date(`${d}T00:00:00Z`).toLocaleDateString("en-IN", { day: "numeric", month: "short", timeZone: "UTC" });

/** 1·2·5 × 10^n ceiling, so the top gridline is a round number. */
function niceMax(v: number) {
  if (v <= 0) return 1;
  const p = 10 ** Math.floor(Math.log10(v));
  return ([1, 2, 5, 10].find((m) => m * p >= v) ?? 10) * p;
}

/**
 * Single-series daily line (one series → no legend; the title names it).
 * SVG stretches to the box (non-scaling 2px stroke); labels, crosshair and tooltip are HTML so text never distorts.
 * Hover or focus + ←/→ moves the crosshair. A table view sits behind "Show data".
 */
export function LineChart({ title, data }: { title: string; data: Point[] }) {
  const [i, setI] = useState<number | null>(null);
  const n = data.length;
  const max = niceMax(Math.max(0, ...data.map((d) => d.value)));
  const x = (k: number) => (n < 2 ? 50 : (k / (n - 1)) * 100); // %
  const y = (v: number) => 100 - (v / max) * 100; // %
  const path = data.map((d, k) => `${k ? "L" : "M"}${x(k)},${y(d.value)}`).join("");
  const pick = (clientX: number, el: HTMLElement) => {
    const r = el.getBoundingClientRect();
    setI(Math.round(Math.min(Math.max((clientX - r.left) / r.width, 0), 1) * (n - 1)));
  };
  const cur = i === null ? null : data[i];
  const total = data.reduce((s, d) => s + d.value, 0);

  return (
    <figure className="rounded-xl border border-line bg-surface p-4">
      <figcaption className="mb-3 flex items-baseline justify-between gap-2">
        <span className="text-sm text-muted">{title}</span>
        <span className="text-lg font-bold">{full.format(total)}</span>
      </figcaption>
      <div className="flex gap-2">
        {/* y axis: recessive, 3 ticks */}
        <div className="relative h-36 w-9 shrink-0 text-right text-[10px] text-muted" aria-hidden>
          {[max, max / 2, 0].map((v, k) => <span key={k} className="absolute right-0 -translate-y-1/2" style={{ top: `${k * 50}%` }}>{compact.format(v)}</span>)}
        </div>
        <div
          role="img"
          tabIndex={0}
          aria-label={`${title}: ${full.format(total)} total over ${n} days. Use arrow keys to read each day.`}
          className="relative h-36 flex-1 cursor-crosshair touch-none rounded outline-none focus-visible:ring-1 focus-visible:ring-brand"
          onPointerMove={(e) => pick(e.clientX, e.currentTarget)}
          onPointerDown={(e) => pick(e.clientX, e.currentTarget)}
          onPointerLeave={() => setI(null)}
          onBlur={() => setI(null)}
          onKeyDown={(e) => {
            if (e.key === "ArrowRight" || e.key === "ArrowLeft") {
              e.preventDefault();
              setI((v) => Math.min(Math.max((v ?? (e.key === "ArrowRight" ? -1 : n)) + (e.key === "ArrowRight" ? 1 : -1), 0), n - 1));
            }
          }}
        >
          {[0, 50, 100].map((t) => <div key={t} className="absolute inset-x-0 border-t border-line" style={{ top: `${t}%` }} aria-hidden />)}
          <svg viewBox="0 0 100 100" preserveAspectRatio="none" className="absolute inset-0 size-full overflow-visible" aria-hidden>
            <path d={path} fill="none" stroke="var(--brand)" strokeWidth="2" strokeLinejoin="round" strokeLinecap="round" vectorEffect="non-scaling-stroke" />
          </svg>
          {cur && (
            <>
              <div className="pointer-events-none absolute inset-y-0 w-px bg-muted" style={{ left: `${x(i!)}%` }} aria-hidden />
              <div className="pointer-events-none absolute size-2.5 -translate-x-1/2 -translate-y-1/2 rounded-full bg-brand ring-2 ring-surface" style={{ left: `${x(i!)}%`, top: `${y(cur.value)}%` }} aria-hidden />
              <div
                role="status"
                className="pointer-events-none absolute top-0 z-10 rounded-lg border border-line bg-bg px-3 py-2 shadow-2xl"
                style={x(i!) > 60 ? { right: `${100 - x(i!) + 2}%` } : { left: `${x(i!) + 2}%` }}
              >
                <p className="text-base font-bold leading-none">{full.format(cur.value)}</p>
                <p className="mt-1 whitespace-nowrap text-xs text-muted">{dayLabel(cur.day)}</p>
              </div>
            </>
          )}
        </div>
      </div>
      <div className="ml-11 mt-1 flex justify-between text-[10px] text-muted" aria-hidden>
        {n > 0 && <span>{dayLabel(data[0].day)}</span>}
        {n > 2 && <span>{dayLabel(data[Math.floor((n - 1) / 2)].day)}</span>}
        {n > 1 && <span>{dayLabel(data[n - 1].day)}</span>}
      </div>
      <details className="mt-2 text-xs">
        <summary className="cursor-pointer text-muted hover:text-accent">Show data</summary>
        <div className="mt-2 max-h-48 overflow-auto">
          <table className="w-full">
            <tbody>
              {data.map((d) => (
                <tr key={d.day} className="border-t border-line"><td className="py-1 text-muted">{dayLabel(d.day)}</td><td className="py-1 text-right">{full.format(d.value)}</td></tr>
              ))}
            </tbody>
          </table>
        </div>
      </details>
    </figure>
  );
}
