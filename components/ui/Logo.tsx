"use client";

import Image from "next/image";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/cn";
import { site } from "@/content/fr/site";

type LogoProps = {
  variant?: "default" | "invert";
  href?: string;
  className?: string;
  /** Wordmark texte à côté du picto (header / footer / mobile). */
  showWordmark?: boolean;
  /** Précharge l’image (header above-the-fold uniquement). */
  priority?: boolean;
};

export function Logo({
  variant = "default",
  href = "/",
  className,
  showWordmark = false,
  priority = false,
}: LogoProps) {
  const pathname = usePathname();

  // Même route : Next ne navigue pas — on scroll en haut à la place.
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

  const markSrc =
    variant === "invert"
      ? "/brand/logo-mark-invert.png"
      : "/brand/logo-mark.png";

  return (
    <Link
      href={href}
      onClick={handleClick}
      aria-label={`${site.name} — Accueil`}
      className={cn("inline-flex items-center gap-2.5 group", color, className)}
    >
      <Image
        src={markSrc}
        alt=""
        width={141}
        height={240}
        sizes="40px"
        className="h-9 w-auto md:h-10 shrink-0"
        priority={priority}
        aria-hidden
      />
      {showWordmark ? (
        <span className="flex flex-col justify-center leading-none gap-1">
          <span className="font-serif text-lg sm:text-xl md:text-[1.35rem] font-semibold tracking-tight uppercase">
            {site.name}
          </span>
          <span
            className={cn(
              "hidden sm:block text-[0.6rem] md:text-[0.65rem] tracking-[0.15em] uppercase",
              muted,
            )}
          >
            {site.baseline}
          </span>
        </span>
      ) : null}
    </Link>
  );
}
