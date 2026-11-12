"use client";
import Link from "next/link";
import { useEffect, useRef, useState } from "react";
import { Img } from "@/components/ui";

export type Slide = { image: string; alt: string; headline: string; subline: string; link?: string };

/**
 * 1 slide = static. 2+ = auto-advance 3s, seamless loop (clone of first at end, snap back without transition),
 * dots, swipe, pause on touch / hidden tab, no autoplay under prefers-reduced-motion.
 */
export default function TrustCarousel({ slides, stats }: { slides: Slide[]; stats: { value: string; label: string }[] }) {
  const n = slides.length;
  const [i, setI] = useState(0);
  const [anim, setAnim] = useState(true);
  const paused = useRef(false);
  const touchX = useRef<number | null>(null);

  useEffect(() => {
    if (n < 2 || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => {
      if (!paused.current && !document.hidden) setI((v) => Math.min(v + 1, n));
    }, 3000);
    return () => clearInterval(id);
  }, [n]);

  // after the transition onto the clone, jump to the real first slide with no transition
  const onEnd = () => {
    if (i === n) {
      setAnim(false);
      setI(0);
    }
  };
  useEffect(() => {
    if (anim) return;
    const id = requestAnimationFrame(() => requestAnimationFrame(() => setAnim(true)));
    return () => cancelAnimationFrame(id);
  }, [anim]);

  const go = (to: number) => {
    setAnim(true);
    setI(((to % n) + n) % n);
  };

  if (!n) return null;
  const track = n > 1 ? [...slides, slides[0]] : slides;

  return (
    <section aria-roledescription="carousel" aria-label="Highlights">
      <div
        className="relative overflow-hidden rounded-2xl"
        onTouchStart={(e) => ((paused.current = true), (touchX.current = e.touches[0].clientX))}
        onTouchEnd={(e) => {
          paused.current = false;
          const dx = e.changedTouches[0].clientX - (touchX.current ?? 0);
          if (Math.abs(dx) > 40) go(i + (dx < 0 ? 1 : -1));
        }}
      >
        <div className={`flex ${anim ? "transition-transform duration-500 ease-out" : ""}`} style={{ transform: `translateX(-${i * 100}%)` }} onTransitionEnd={onEnd}>
          {track.map((s, k) => {
            const inner = (
              <div className="relative aspect-[16/10] sm:aspect-[21/9]">
                <Img src={s.image} alt={s.alt} fill sizes="(min-width:1024px) 1024px, 100vw" className="object-cover" fetchPriority={k === 0 ? "high" : "low"} loading={k === 0 ? "eager" : "lazy"} />
                <div className="absolute inset-x-0 bottom-0 bg-gradient-to-t from-badge to-transparent p-4 text-badge-ink">
                  <p className="text-lg font-bold sm:text-2xl">{s.headline}</p>
                  {s.subline && <p className="text-sm">{s.subline}</p>}
                </div>
              </div>
            );
            return (
              <div key={k} className="w-full shrink-0" aria-hidden={k !== i % n || (n > 1 && k === n)}>
                {s.link ? <Link href={s.link} tabIndex={k === i ? 0 : -1}>{inner}</Link> : inner}
              </div>
            );
          })}
        </div>
        {n > 1 && (
          <div className="absolute bottom-0 right-1 flex">
            {slides.map((_, k) => (
              <button key={k} type="button" onClick={() => go(k)} aria-label={`Slide ${k + 1}`} aria-current={i % n === k} className="grid size-6 place-items-center">
                <span className={`size-2 rounded-full ${i % n === k ? "bg-badge-ink" : "bg-badge-ink/50"}`} />
              </button>
            ))}
          </div>
        )}
      </div>
      {stats.length > 0 && (
        <dl className="mt-3 grid grid-cols-3 gap-2 text-center">
          {stats.map((s, k) => (
            <div key={k} className="rounded-xl bg-surface p-2">
              <dt className="sr-only">{s.label}</dt>
              <dd className="text-lg font-bold text-brand">{s.value}</dd>
              <dd className="text-xs text-muted">{s.label}</dd>
            </div>
          ))}
        </dl>
      )}
    </section>
  );
}
