"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav, practitionerLink } from "@/content/fr/site";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { MobileNav } from "@/components/layout/MobileNav";
import { NavDropdown } from "@/components/layout/NavDropdown";
import { Container } from "@/components/ui/Container";

export function Header() {
  const pathname = usePathname();

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-16 md:h-20 items-center justify-between gap-8">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton />
            <Logo />
          </div>

          <nav
            aria-label="Navigation principale"
            className="hidden lg:flex items-center gap-7 xl:gap-9"
          >
            {primaryNav.map((link) => {
              const isActive =
                pathname === link.href ||
                (link.href !== "/" && pathname.startsWith(link.href));
              return (
                <NavDropdown key={link.href} link={link} isActive={isActive} />
              );
            })}
          </nav>

          <div className="hidden lg:flex items-center gap-3">
            <Link
              href={practitionerLink.href}
              className="inline-flex items-center gap-2 border border-[var(--line-strong)] px-4 py-2.5 text-xs tracking-wide text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
            >
              <svg
                width="12"
                height="12"
                viewBox="0 0 12 12"
                fill="none"
                aria-hidden="true"
              >
                <circle cx="6" cy="4" r="2.2" stroke="currentColor" strokeWidth="1" />
                <path
                  d="M1.5 10.5C2.4 8.7 4.1 7.6 6 7.6C7.9 7.6 9.6 8.7 10.5 10.5"
                  stroke="currentColor"
                  strokeWidth="1"
                />
              </svg>
              {practitionerLink.label}
            </Link>
            <Button href="/contact?sujet=devis" variant="primary" className="py-2.5 text-xs">
              Demander un devis
            </Button>
          </div>

          <MobileNav />
        </div>
      </Container>
    </header>
  );
}
