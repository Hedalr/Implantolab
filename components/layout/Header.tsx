"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav } from "@/content/fr/site";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { MobileNav } from "@/components/layout/MobileNav";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-16 md:h-20 items-center justify-between gap-8">
          <Logo />

          <nav
            aria-label="Navigation principale"
            className="hidden lg:flex items-center gap-7 xl:gap-9"
          >
            {primaryNav.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <Link
                  key={link.href}
                  href={link.href}
                  className={cn(
                    "relative text-sm tracking-wide py-1.5 transition-colors",
                    isActive
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                  )}
                >
                  {link.label}
                  {isActive ? (
                    <span
                      aria-hidden="true"
                      className="absolute -bottom-px left-0 right-0 h-px bg-[var(--accent-warm)]"
                    />
                  ) : null}
                </Link>
              );
            })}
          </nav>

          <div className="hidden lg:block">
            <Button href="/contact?sujet=devis" variant="secondary" className="py-2.5 text-xs">
              Demander un devis
            </Button>
          </div>

          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
