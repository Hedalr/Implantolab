"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { cn } from "@/lib/cn";

type BackButtonProps = {
  variant?: "default" | "invert";
  className?: string;
};

/**
 * Bouton retour en haut à gauche, masqué sur la page d'accueil.
 * Utilise router.back() côté client, avec un fallback sur l'accueil
 * lorsque l'historique de navigation est vide (arrivée directe sur la page).
 */
export function BackButton({ variant = "default", className }: BackButtonProps) {
  const router = useRouter();
  const pathname = usePathname();
  const [canGoBack, setCanGoBack] = useState(false);

  useEffect(() => {
    if (typeof window === "undefined") return;
    setCanGoBack(window.history.length > 1);
  }, [pathname]);

  if (pathname === "/") {
    return null;
  }

  const color =
    variant === "invert"
      ? "text-[var(--ink-invert)] border-[var(--line-invert)] hover:border-[var(--ink-invert)]"
      : "text-[var(--ink)] border-[var(--line-strong)] hover:border-[var(--ink)]";

  return (
    <button
      type="button"
      onClick={() => {
        if (canGoBack) {
          router.back();
        } else {
          router.push("/");
        }
      }}
      aria-label="Retour à la page précédente"
      className={cn(
        "inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center border transition-colors shrink-0",
        color,
        className,
      )}
    >
      <svg
        width="14"
        height="12"
        viewBox="0 0 14 12"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M13 6H1M1 6L6 1M1 6L6 11"
          stroke="currentColor"
          strokeWidth="1.2"
          strokeLinecap="square"
        />
      </svg>
    </button>
  );
}
