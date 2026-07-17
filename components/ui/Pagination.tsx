import Link from "next/link";
import { cn } from "@/lib/cn";

type PaginationProps = {
  page: number;
  totalPages: number;
  total: number;
  pageSize: number;
  /** Construit l’URL pour une page donnée (1-indexée). */
  hrefForPage: (page: number) => string;
  className?: string;
};

export function Pagination({
  page,
  totalPages,
  total,
  pageSize,
  hrefForPage,
  className,
}: PaginationProps) {
  if (total === 0 || totalPages <= 1) return null;

  const from = (page - 1) * pageSize + 1;
  const to = Math.min(page * pageSize, total);
  const hasPrev = page > 1;
  const hasNext = page < totalPages;

  return (
    <nav
      aria-label="Pagination"
      className={cn(
        "flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between",
        className,
      )}
    >
      <p className="text-sm text-[var(--ink-muted)] tabular-nums">
        {from}–{to} sur {total}
        <span className="text-[var(--ink-discreet)]">
          {" "}
          · page {page}/{totalPages}
        </span>
      </p>
      <div className="flex items-center gap-2">
        {hasPrev ? (
          <Link
            href={hrefForPage(page - 1)}
            className="px-4 py-2.5 text-xs uppercase tracking-[0.16em] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            Précédent
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="px-4 py-2.5 text-xs uppercase tracking-[0.16em] border border-[var(--line)] text-[var(--ink-discreet)] opacity-50"
          >
            Précédent
          </span>
        )}
        {hasNext ? (
          <Link
            href={hrefForPage(page + 1)}
            className="px-4 py-2.5 text-xs uppercase tracking-[0.16em] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
          >
            Suivant
          </Link>
        ) : (
          <span
            aria-disabled="true"
            className="px-4 py-2.5 text-xs uppercase tracking-[0.16em] border border-[var(--line)] text-[var(--ink-discreet)] opacity-50"
          >
            Suivant
          </span>
        )}
      </div>
    </nav>
  );
}
