"use client";
import { useEffect, useRef, useState } from "react";
import { Img } from "./Img";

type Photo = { url: string; alt: string };
const DELAY = 4000;

/**
 * Project photo gallery. Native scroll-snap does the moving (finger swipe + trackpad for free); JS adds
 * arrows, dots, keyboard ←/→ and autoplay that loops. Autoplay pauses on hover/touch/focus, in a hidden tab,
 * and never runs under prefers-reduced-motion. One photo = plain image, no controls.
 */
export function Gallery({ photos, label }: { photos: Photo[]; label: string }) {
  const track = useRef<HTMLDivElement>(null);
  const [i, setI] = useState(0);
  const [paused, setPaused] = useState(false);
  const n = photos.length;

  const go = (to: number) => {
    const el = track.current;
    if (!el) return;
    const k = (to + n) % n; // wrap both ways
    el.scrollTo({ left: k * el.clientWidth, behavior: matchMedia("(prefers-reduced-motion: reduce)").matches ? "auto" : "smooth" });
  };

  // current slide follows the scroll position, however it was moved (swipe, trackpad, arrows, autoplay)
  useEffect(() => {
    const el = track.current;
    if (!el || n < 2) return;
    const onScroll = () => setI(Math.round(el.scrollLeft / el.clientWidth));
    el.addEventListener("scroll", onScroll, { passive: true });
    return () => el.removeEventListener("scroll", onScroll);
  }, [n]);

  useEffect(() => {
    if (n < 2 || paused || matchMedia("(prefers-reduced-motion: reduce)").matches) return;
    const id = setInterval(() => !document.hidden && go(i + 1), DELAY);
    return () => clearInterval(id);
  }, [i, n, paused]); // eslint-disable-line react-hooks/exhaustive-deps -- go only reads the ref

  const arrow = "absolute top-1/2 z-10 grid size-10 -translate-y-1/2 place-items-center rounded-full bg-badge text-xl text-badge-ink transition-opacity hover:bg-brand hover:text-brand-ink max-sm:hidden";

  return (
    <section
      aria-roledescription="carousel"
      aria-label={label}
      className="group relative -mx-4 mb-4 sm:mx-0"
      onPointerEnter={() => setPaused(true)}
      onPointerLeave={() => setPaused(false)}
      onTouchStart={() => setPaused(true)}
      onFocus={() => setPaused(true)}
      onBlur={() => setPaused(false)}
    >
      <div
        ref={track}
        tabIndex={n > 1 ? 0 : -1}
        onKeyDown={(e) => {
          if (e.key !== "ArrowRight" && e.key !== "ArrowLeft") return;
          e.preventDefault();
          go(i + (e.key === "ArrowRight" ? 1 : -1));
        }}
        className="flex snap-x snap-mandatory overflow-x-auto overscroll-x-contain outline-none [scrollbar-width:none] focus-visible:ring-2 focus-visible:ring-brand sm:rounded-2xl [&::-webkit-scrollbar]:hidden"
      >
        {photos.map((p, k) => (
          <div key={k} className="relative aspect-[4/3] w-full shrink-0 snap-center sm:aspect-[16/9]" aria-roledescription="slide" aria-label={`${k + 1} / ${n}`}>
            <Img src={p.url} alt={p.alt} fill sizes="(min-width:1152px) 1152px, 100vw" className="object-cover" preload={k === 0} fetchPriority={k === 0 ? "high" : "low"} loading={k === 0 ? "eager" : "lazy"} />
          </div>
        ))}
      </div>
      {n > 1 && (
        <>
          <button type="button" onClick={() => go(i - 1)} aria-label="Previous photo" className={`${arrow} left-3`}>‹</button>
          <button type="button" onClick={() => go(i + 1)} aria-label="Next photo" className={`${arrow} right-3`}>›</button>
          <div className="absolute inset-x-0 bottom-2 flex justify-center">
            {photos.map((_, k) => (
              <button key={k} type="button" onClick={() => go(k)} aria-label={`Photo ${k + 1}`} aria-current={k === i} className="grid size-6 place-items-center">
                <span className={`h-2 rounded-full bg-badge-ink transition-all ${k === i ? "w-5" : "w-2 opacity-50"}`} />
              </button>
            ))}
          </div>
          <span className="absolute right-3 top-3 rounded bg-badge px-2 py-0.5 text-xs text-badge-ink" aria-hidden>{i + 1}/{n}</span>
        </>
      )}
    </section>
  );
}
