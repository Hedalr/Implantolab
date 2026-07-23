"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav, practitionerLink } from "@/content/fr/site";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { BackButton } from "@/components/ui/BackButton";
import { MobileNav } from "@/components/layout/MobileNav";
import { MotionNavDropdownPanel } from "@/components/layout/MotionNavDropdownPanel";
import { isNavActive, linkTone } from "@/components/layout/nav-utils";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";
import {
  MotionNavigationMenu,
  MotionNavigationMenuContent,
  MotionNavigationMenuItem,
  MotionNavigationMenuLink,
  MotionNavigationMenuList,
  MotionNavigationMenuTrigger,
} from "@/components/ui/motion-navigation-menu";

type HeaderProps = {
  userDisplayName?: string | null;
};

export function Header({ userDisplayName = null }: HeaderProps) {
  const pathname = usePathname();
  const isLoggedIn = Boolean(userDisplayName);

  return (
    <header className="sticky top-0 z-40 border-b border-[var(--line)] bg-[var(--bg)]/85 backdrop-blur-md">
      <Container size="wide">
        <div className="flex h-16 md:h-20 items-center justify-between gap-8">
          <div className="flex items-center gap-3 md:gap-4">
            <BackButton />
            <Logo showWordmark priority />
          </div>

          <MotionNavigationMenu
            aria-label="Navigation principale"
            className="hidden lg:flex"
          >
            <MotionNavigationMenuList className="gap-1 xl:gap-2">
              {primaryNav.map((link) => {
                const active = isNavActive(pathname, link);
                const children = link.children;

                if (!children?.length) {
                  return (
                    <MotionNavigationMenuItem key={link.href}>
                      <MotionNavigationMenuLink
                        href={link.href}
                        className={cn(
                          "relative h-9 justify-center px-3 py-2 text-sm tracking-wide",
                          linkTone(active),
                        )}
                      >
                        {link.label}
                        {active ? (
                          <span
                            aria-hidden="true"
                            className="absolute inset-x-3 -bottom-px h-px bg-[var(--accent)]"
                          />
                        ) : null}
                      </MotionNavigationMenuLink>
                    </MotionNavigationMenuItem>
                  );
                }

                return (
                  <MotionNavigationMenuItem key={link.href} value={link.href}>
                    <MotionNavigationMenuTrigger
                      className={cn(
                        "relative text-sm tracking-wide",
                        linkTone(active),
                      )}
                    >
                      {link.label}
                      {active ? (
                        <span
                          aria-hidden="true"
                          className="absolute inset-x-3 -bottom-px h-px bg-[var(--accent)]"
                        />
                      ) : null}
                    </MotionNavigationMenuTrigger>
                    <MotionNavigationMenuContent>
                      <MotionNavDropdownPanel
                        link={link}
                        items={children}
                        pathname={pathname}
                        overviewLabel="Voir la page"
                        itemClassName="px-3 py-2.5"
                      />
                    </MotionNavigationMenuContent>
                  </MotionNavigationMenuItem>
                );
              })}
            </MotionNavigationMenuList>
          </MotionNavigationMenu>

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
              {isLoggedIn ? userDisplayName : practitionerLink.label}
            </Link>
            {!isLoggedIn ? (
              <Button href="/contact?sujet=devis" variant="primary" className="py-2.5 text-xs">
                Demander un devis
              </Button>
            ) : null}
          </div>

          <MobileNav userDisplayName={userDisplayName} />
        </div>
      </Container>
    </header>
  );
}
