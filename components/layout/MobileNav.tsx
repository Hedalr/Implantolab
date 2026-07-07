"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { primaryNav, practitionerLink, site } from "@/content/fr/site";
import { Logo } from "@/components/ui/Logo";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";

export function MobileNav() {
  const [open, setOpen] = useState(false);
  const pathname = usePathname();

  useEffect(() => {
    setOpen(false);
  }, [pathname]);

  useEffect(() => {
    if (!open) return;
    const original = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = original;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open]);

  return (
    <div className="lg:hidden">
      <button
        type="button"
        aria-expanded={open}
        aria-controls="mobile-nav-panel"
        aria-label={open ? "Fermer le menu" : "Ouvrir le menu"}
        onClick={() => setOpen((value) => !value)}
        className="inline-flex h-10 w-10 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)]"
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

      <div
        id="mobile-nav-panel"
        role="dialog"
        aria-modal="true"
        aria-label="Navigation principale"
        className={cn(
          "fixed inset-0 z-50 transition-opacity duration-300",
          open ? "opacity-100 pointer-events-auto" : "opacity-0 pointer-events-none",
        )}
      >
        <div
          className="absolute inset-0 bg-[var(--bg-deep)]/40"
          onClick={() => setOpen(false)}
          aria-hidden="true"
        />
        <div
          className={cn(
            "absolute right-0 top-0 bottom-0 w-full max-w-md bg-[var(--bg-elevated)] flex flex-col transition-transform duration-400 ease-out",
            open ? "translate-x-0" : "translate-x-full",
          )}
        >
          <div className="flex items-center justify-between px-6 py-5 border-b border-[var(--line)]">
            <Logo />
            <button
              type="button"
              aria-label="Fermer le menu"
              onClick={() => setOpen(false)}
              className="inline-flex h-10 w-10 items-center justify-center text-[var(--ink-muted)] hover:text-[var(--ink)]"
            >
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
                <path d="M2 2L14 14" stroke="currentColor" strokeWidth="1.2" />
                <path d="M14 2L2 14" stroke="currentColor" strokeWidth="1.2" />
              </svg>
            </button>
          </div>

          <nav className="flex-1 overflow-y-auto px-6 py-8">
            <ul className="flex flex-col gap-1">
              {primaryNav.map((link, index) => {
                const isActive =
                  pathname === link.href ||
                  (link.href !== "/" && pathname.startsWith(link.href));
                return (
                  <li key={link.href} className="border-b border-[var(--line)]">
                    <Link
                      href={link.href}
                      className={cn(
                        "flex items-baseline gap-4 py-4",
                        "font-serif text-2xl tracking-tight",
                        isActive ? "text-[var(--ink)]" : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
                      )}
                    >
                      <span className="text-eyebrow text-[var(--accent-warm)]">
                        {String(index + 1).padStart(2, "0")}
                      </span>
                      {link.label}
                    </Link>
                    {link.children && link.children.length > 0 ? (
                      <ul className="pl-10 pb-4 flex flex-col gap-2">
                        {link.children.map((child) => (
                          <li key={child.href}>
                            <Link
                              href={child.href}
                              className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)]"
                            >
                              {child.label}
                            </Link>
                          </li>
                        ))}
                      </ul>
                    ) : null}
                  </li>
                );
              })}
            </ul>
          </nav>

          <div className="px-6 py-6 border-t border-[var(--line)] flex flex-col gap-3">
            <Button href={practitionerLink.href} variant="secondary">
              {practitionerLink.label}
            </Button>
            <Button href="/contact?sujet=devis" variant="primary">
              Demander un devis
            </Button>
            <div className="flex flex-col gap-1 text-sm text-[var(--ink-muted)]">
              <a href={`tel:${site.contact.phone}`} className="hover:text-[var(--ink)]">
                {site.contact.phoneDisplay}
              </a>
              <a href={`mailto:${site.contact.email}`} className="hover:text-[var(--ink)]">
                {site.contact.email}
              </a>
              <a
                href={`mailto:${site.contact.emailSecondary}`}
                className="hover:text-[var(--ink)]"
              >
                {site.contact.emailSecondary}
              </a>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
