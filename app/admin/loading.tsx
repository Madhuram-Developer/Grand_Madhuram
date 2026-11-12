// Page-level fallback: lets client navigations between admin screens render instantly while data streams.
export default function Loading() {
  return (
    <div className="grid gap-3" aria-busy>
      <div className="h-7 w-48 animate-pulse rounded bg-surface" />
      <div className="h-40 animate-pulse rounded-xl bg-surface" />
    </div>
  );
}
