import Link from "next/link";
import type { NavLink } from "@/content/fr/site";
import { cn } from "@/lib/cn";
import { flattenNav } from "@/components/layout/nav-utils";

type EspacePraticienNavFallbackProps = {
  items: NavLink[];
  variant: "desktop" | "mobile";
};

/**
 * Fallback SSR / Suspense pour la nav espace praticien.
 * Sans useSearchParams — visible immédiatement (évite une barre vide
 * pendant l’hydratation client, surtout sur Scalingo).
 */
export function EspacePraticienNavFallback({
  items,
  variant,
}: EspacePraticienNavFallbackProps) {
  if (variant === "desktop") {
    return (
      <nav
        aria-label="Navigation praticien"
        className="hidden md:flex items-center gap-1"
      >
        {items.map((item) => (
          <Link
            key={item.href}
            href={item.href}
            className="inline-flex h-9 items-center justify-center px-3 py-2 text-sm font-medium text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
          >
            {item.label}
          </Link>
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navigation praticien (mobile)"
      className={cn(
        "scroll-rail flex md:hidden items-stretch gap-1 overflow-x-auto pb-2",
        "-mx-4 px-4 sm:-mx-6 sm:px-6",
      )}
    >
      {flattenNav(items).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className="inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
