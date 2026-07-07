"use client";

import { useRouter, usePathname } from "next/navigation";
import { useEffect, useState } from "react";
import { ChevronLeft } from "lucide-react";
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
      ? "text-[var(--accent-warm-soft)] hover:text-[var(--ink-invert)]"
      : "text-[var(--accent)] hover:text-[var(--accent-hover)]";

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
        "group inline-flex h-9 w-9 md:h-10 md:w-10 items-center justify-center shrink-0",
        "transition-[color,transform] duration-300 ease-out",
        color,
        className,
      )}
    >
      <ChevronLeft
        aria-hidden="true"
        className="h-5 w-5 transition-transform duration-300 ease-out group-hover:-translate-x-0.5"
        strokeWidth={1.5}
      />
    </button>
  );
}
