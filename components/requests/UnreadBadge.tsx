"use client";

export function UnreadBadge({ count }: { count: number }) {
  if (count <= 0) return null;
  return (
    <span
      className="inline-flex min-w-[1.25rem] items-center justify-center rounded-full bg-[var(--accent-warm)] px-1.5 py-0.5 text-[10px] font-medium tabular-nums text-[var(--bg)]"
      aria-label={`${count} message${count > 1 ? "s" : ""} non lu${count > 1 ? "s" : ""}`}
    >
      {count > 99 ? "99+" : count}
    </span>
  );
}
