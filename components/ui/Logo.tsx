"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";

type LogoProps = {
  variant?: "default" | "invert";
  href?: string;
  className?: string;
  /**
   * Affiche le wordmark texte (IMPLANTOLAB + sous-titre) à côté du logo.
   */
  showWordmark?: boolean;
};

export function Logo({
  variant = "default",
  href = "/",
  className,
  showWordmark = false,
}: LogoProps) {
  const pathname = usePathname();

  /**
   * Sur la page déjà ciblée par le lien (typiquement l'accueil), Next.js ne
   * déclenche aucune navigation au clic — donc aucun scroll. On force un
   * retour en haut de page dans ce cas précis pour que le logo reste utile
   * même quand on a scrollé loin dans la page.
   */
  const handleClick = () => {
    if (pathname === href) {
      window.scrollTo({ top: 0, behavior: "smooth" });
    }
  };

  const color =
    variant === "invert" ? "text-[var(--ink-invert)]" : "text-[var(--ink)]";
  const muted =
    variant === "invert"
      ? "text-[var(--ink-invert-muted)]"
      : "text-[var(--ink-discreet)]";

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label="IMPLANTOLAB — Accueil"
      className={cn("inline-flex items-center gap-3 group", color, className)}
    >
      <Image
        src="/brand/logo.png"
        alt="IMPLANTOLAB"
        width={200}
        height={80}
        className="h-9 w-auto md:h-10 shrink-0"
        priority
      />
      {showWordmark ? (
        <span className="flex flex-col justify-center leading-none gap-1">
          <span className="font-serif text-lg md:text-xl font-semibold tracking-tight uppercase">
            Implantolab
          </span>
          <span
            className={cn(
              "hidden sm:block text-[0.6rem] md:text-[0.65rem] tracking-[0.15em] uppercase",
              muted,
            )}
          >
            Laboratoire de prothèses dentaires
          </span>
        </span>
      ) : null}
    </Link>
  );
}
