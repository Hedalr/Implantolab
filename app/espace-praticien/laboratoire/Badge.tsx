import { cn } from "@/lib/cn";

/** Badge de statut / secteur / catégorie utilisé dans les vues laboratoire. */
export function Badge({
  label,
  warm,
  color,
}: {
  label: string;
  warm?: boolean;
  color?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] shrink-0",
        warm
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--line-strong)] text-[var(--ink)]",
      )}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </span>
  );
}
