"use client";

import { useEffect, useState } from "react";
import { createPortal } from "react-dom";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { AnimatePresence, motion, useReducedMotion } from "framer-motion";
import { primaryNav, practitionerLink, site } from "@/content/fr/site";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

type MobileNavProps = {
  userDisplayName?: string | null;
};

const EASE_OUT = [0.22, 1, 0.36, 1] as const;

function isLinkActive(pathname: string, href: string) {
  return pathname === href || (href !== "/" && pathname.startsWith(href));
}

export function MobileNav({ userDisplayName = null }: MobileNavProps) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const [scrollLocked, setScrollLocked] = useState(false);
  const [expandedHref, setExpandedHref] = useState<string | null>(null);
  const pathname = usePathname();
  const reduceMotion = useReducedMotion();
  const isLoggedIn = Boolean(userDisplayName);

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (open) setScrollLocked(true);
  }, [open]);

  useEffect(() => {
    if (!scrollLocked) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [scrollLocked]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const activeParent = primaryNav.find(
      (link) =>
        link.children &&
        (isLinkActive(pathname, link.href) ||
          link.children.some((child) => isLinkActive(pathname, child.href))),
    );
    setExpandedHref(activeParent?.href ?? null);
  }, [open, pathname]);

  const toggleSection = (href: string) => {
    setExpandedHref((current) => (current === href ? null : href));
  };

  const backdropTransition = reduceMotion
    ? { duration: 0.16, ease: EASE_OUT }
    : { duration: 0.2, ease: EASE_OUT };

  const panelTransition = reduceMotion
    ? { duration: 0.16, ease: EASE_OUT }
    : { duration: 0.28, ease: EASE_OUT };

  const rootVariants = {
    open: { transition: { when: "beforeChildren" as const } },
    closed: { transition: { when: "afterChildren" as const } },
  };

  const backdropVariants = {
    open: { opacity: 1, transition: backdropTransition },
    closed: { opacity: 0, transition: backdropTransition },
  };

  const panelVariants = reduceMotion
    ? {
        open: { opacity: 1, transition: panelTransition },
        closed: { opacity: 0, transition: panelTransition },
      }
    : {
        open: { x: 0, transition: panelTransition },
        closed: { x: "100%", transition: panelTransition },
      };

  const panel = (
    <AnimatePresence onExitComplete={() => setScrollLocked(false)}>
      {open ? (
        <motion.div
          key="mobile-nav"
          id="mobile-nav-panel"
          role="dialog"
          aria-modal="true"
          aria-label="Navigation principale"
          className="fixed inset-0 z-[100] lg:hidden"
          variants={rootVariants}
          initial="closed"
          animate="open"
          exit="closed"
        >
          <motion.div
            className="absolute inset-0 bg-[var(--bg-deep)]/50"
            onClick={() => setOpen(false)}
            aria-hidden="true"
            variants={backdropVariants}
          />
          <motion.div
            className="absolute inset-y-0 right-0 flex w-full max-w-sm flex-col bg-[var(--bg)] shadow-[-8px_0_32px_rgba(0,0,0,0.12)]"
            variants={panelVariants}
          >
              <div className="flex shrink-0 items-center justify-between border-b border-[var(--line)] px-5 py-4">
                <Logo showWordmark />
                <button
                  type="button"
                  aria-label="Fermer le menu"
                  onClick={() => setOpen(false)}
                  className="inline-flex h-11 w-11 items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
                >
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                    <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.2" />
                    <path d="M14 2L2 14" stroke="currentColor" strokeWidth="1.2" />
                  </svg>
                </button>
              </div>

              <nav className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 py-4">
                <p className="mb-3 text-eyebrow">Navigation</p>
                <ul className="flex flex-col gap-1">
                  {primaryNav.map((link, index) => {
                    const isActive = isLinkActive(pathname, link.href);
                    const hasChildren = Boolean(link.children && link.children.length > 0);
                    const isExpanded = expandedHref === link.href;

                    return (
                      <li key={link.href} className="border-b border-[var(--line)] last:border-b-0">
                        <div className="flex items-center gap-2">
                          <Link
                            href={link.href}
                            onClick={() => setOpen(false)}
                            className={cn(
                              "flex min-h-12 flex-1 items-baseline gap-3 py-3",
                              "font-serif text-xl tracking-tight",
                              isActive
                                ? "text-[var(--ink)]"
                                : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                            )}
                          >
                            <span className="text-eyebrow text-[var(--accent-warm)]">
                              {String(index + 1).padStart(2, "0")}
                            </span>
                            {link.label}
                          </Link>
                          {hasChildren ? (
                            <button
                              type="button"
                              aria-expanded={isExpanded}
                              aria-label={`${isExpanded ? "Réduire" : "Développer"} ${link.label}`}
                              onClick={() => toggleSection(link.href)}
                              className="inline-flex h-11 w-11 shrink-0 items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
                            >
                              <svg
                                width="12"
                                height="8"
                                viewBox="0 0 12 8"
                                fill="none"
                                aria-hidden="true"
                                className={cn(
                                  "transition-transform duration-200",
                                  isExpanded && "rotate-180",
                                )}
                              >
                                <path
                                  d="M1 1.5L6 6.5L11 1.5"
                                  stroke="currentColor"
                                  strokeWidth="1.2"
                                  strokeLinecap="square"
                                />
                              </svg>
                            </button>
                          ) : null}
                        </div>
                        {hasChildren && isExpanded ? (
                          <ul className="mb-3 flex flex-col gap-1 border-l border-[var(--line-strong)] pl-4">
                            {link.children!.map((child) => {
                              const childActive = isLinkActive(pathname, child.href);
                              return (
                                <li key={child.href}>
                                  <Link
                                    href={child.href}
                                    onClick={() => setOpen(false)}
                                    className={cn(
                                      "flex min-h-11 items-center py-2 text-sm transition-colors",
                                      childActive
                                        ? "text-[var(--ink)]"
                                        : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                                    )}
                                  >
                                    {child.label}
                                  </Link>
                                </li>
                              );
                            })}
                          </ul>
                        ) : null}
                      </li>
                    );
                  })}
                </ul>
              </nav>

              <div className="shrink-0 border-t border-[var(--line)] bg-[var(--bg-elevated)] px-5 py-5">
                <div className="flex flex-col gap-3">
                  <Button href={practitionerLink.href} variant="secondary" className="w-full">
                    {isLoggedIn ? userDisplayName : practitionerLink.label}
                  </Button>
                  {!isLoggedIn ? (
                    <Button href="/contact?sujet=devis" variant="primary" className="w-full">
                      Demander un devis
                    </Button>
                  ) : null}
                </div>
                <div className="mt-4 flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
                  <a href={`tel:${site.contact.phone}`} className="min-h-11 py-2 hover:text-[var(--ink)]">
                    {site.contact.phoneDisplay}
                  </a>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="min-h-11 py-2 hover:text-[var(--ink)]"
                  >
                    {site.contact.email}
                  </a>
                </div>
              </div>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    );

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-11 w-11 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)]"
      >
        <svg width="18" height="14" viewBox="0 0 18 14" fill="none" aria-hidden="true">
          {open ? (
            <>
              <path d="M2 2L16 12" stroke="currentColor" strokeWidth="1.2" />
              <path d="M16 2L2 12" stroke="currentColor" strokeWidth="1.2" />
            </>
          ) : (
            <>
              <path d="M0 1H18" stroke="currentColor" strokeWidth="1.2" />
              <path d="M0 7H18" stroke="currentColor" strokeWidth="1.2" />
              <path d="M0 13H18" stroke="currentColor" strokeWidth="1.2" />
            </>
          )}
        </svg>
      </button>

      {mounted ? createPortal(panel, document.body) : null}
    </div>
  );
}
