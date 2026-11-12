import Link from "next/link";

/**
 * The one header every admin screen uses: back link + title on the left, status then actions on the right.
 * Convention: main action (Save / Publish / + New) is always the rightmost button; destructive actions sit
 * left of a divider, away from it. Sticks under the admin top bar so actions are reachable on long forms.
 */
export function ActionBar({ title, back, status, children }: { title: string; back?: { href: string; label: string }; status?: React.ReactNode; children?: React.ReactNode }) {
  return (
    <div className="sticky top-14 z-20 -mx-4 flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-line bg-bg px-4 py-3 lg:-mx-6 lg:px-6">
      <div className="min-w-0 flex-1">
        {back && <Link href={back.href} className="text-xs text-muted hover:text-accent">← {back.label}</Link>}
        <h1 className="truncate text-xl font-bold">{title}</h1>
      </div>
      {status && <div className="text-sm">{status}</div>}
      {children && <div className="flex flex-wrap items-center gap-2">{children}</div>}
    </div>
  );
}

/** Thin vertical rule separating destructive actions from the main one. */
export const Divider = () => <span className="mx-1 h-6 w-px bg-line" aria-hidden />;
