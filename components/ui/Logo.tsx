import Image from "next/image";
import Link from "next/link";
import { cn } from "@/lib/cn";

type LogoProps = {
  variant?: "default" | "invert";
  href?: string;
  className?: string;
  /**
   * Affiche un wordmark texte à côté du logo. Désactivé par défaut :
   * l'asset /brand/logo.png (fourni par le client) intègre déjà la
   * typographie de la marque, pas besoin de doublon texte.
   */
  showWordmark?: boolean;
};

export function Logo({
  variant = "default",
  href = "/",
  className,
  showWordmark = false,
}: LogoProps) {
  const color =
    variant === "invert" ? "text-[var(--ink-invert)]" : "text-[var(--ink)]";
  const accent =
    variant === "invert"
      ? "text-[var(--accent-warm-soft)]"
      : "text-[var(--accent-warm)]";

  return (
    <Link
      href={href}
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
        <span className="inline-flex items-baseline gap-1">
          <span className="font-serif text-xl md:text-[1.4rem] tracking-tight leading-none">
            Implanto
          </span>
          <span
            className={cn(
              "font-serif text-xl md:text-[1.4rem] tracking-tight leading-none italic",
              accent,
            )}
          >
            lab
          </span>
        </span>
      ) : null}
    </Link>
  );
}
