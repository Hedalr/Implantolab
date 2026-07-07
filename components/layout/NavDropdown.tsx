"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import type { NavLink } from "@/content/fr/site";
import { cn } from "@/lib/cn";

type NavDropdownProps = {
  link: NavLink;
  isActive: boolean;
};

/**
 * Élément de nav desktop avec liste déroulante au hover / focus.
 * Si le lien n'a pas de sous-liens, se comporte comme un simple <Link>.
 * Le lien parent reste cliquable (accès direct à la page principale)
 * et un chevron/dropdown apparaît quand `children` est fourni.
 */
export function NavDropdown({ link, isActive }: NavDropdownProps) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const hasChildren = Boolean(link.children && link.children.length > 0);

  const scheduleClose = () => {
    if (closeTimer.current) clearTimeout(closeTimer.current);
    closeTimer.current = setTimeout(() => setOpen(false), 120);
  };

  const cancelClose = () => {
    if (closeTimer.current) {
      clearTimeout(closeTimer.current);
      closeTimer.current = null;
    }
  };

  useEffect(() => {
    return () => {
      if (closeTimer.current) clearTimeout(closeTimer.current);
    };
  }, []);

  useEffect(() => {
    if (!open) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "Escape") setOpen(false);
    };
    const onClick = (event: MouseEvent) => {
      if (!wrapperRef.current?.contains(event.target as Node)) {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKey);
    document.addEventListener("mousedown", onClick);
    return () => {
      window.removeEventListener("keydown", onKey);
      document.removeEventListener("mousedown", onClick);
    };
  }, [open]);

  if (!hasChildren) {
    return (
      <Link
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
            className="absolute -bottom-px left-0 right-0 h-px bg-[var(--accent)]"
          />
        ) : null}
      </Link>
    );
  }

  return (
    <div
      ref={wrapperRef}
      className="relative"
      onMouseEnter={() => {
        cancelClose();
        setOpen(true);
      }}
      onMouseLeave={scheduleClose}
      onFocus={() => {
        cancelClose();
        setOpen(true);
      }}
      onBlur={scheduleClose}
    >
      <Link
        href={link.href}
        aria-haspopup="true"
        aria-expanded={open}
        className={cn(
          "relative inline-flex items-center gap-1.5 text-sm tracking-wide py-1.5 transition-colors",
          isActive
            ? "text-[var(--ink)]"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
        )}
        onClick={() => setOpen(false)}
      >
        {link.label}
        <svg
          width="8"
          height="6"
          viewBox="0 0 8 6"
          fill="none"
          aria-hidden="true"
          className={cn(
            "transition-transform duration-200",
            open && "rotate-180",
          )}
        >
          <path
            d="M1 1L4 4.5L7 1"
            stroke="currentColor"
            strokeWidth="1.2"
            strokeLinecap="square"
          />
        </svg>
        {isActive ? (
          <span
            aria-hidden="true"
            className="absolute -bottom-px left-0 right-4 h-px bg-[var(--accent)]"
          />
        ) : null}
      </Link>

      <div
        className={cn(
          "absolute left-1/2 -translate-x-1/2 top-full pt-3 z-50 transition-opacity duration-150",
          open
            ? "opacity-100 pointer-events-auto"
            : "opacity-0 pointer-events-none",
        )}
      >
        <ul
          role="menu"
          className="min-w-[16rem] bg-[var(--bg-elevated)] border border-[var(--line)] shadow-[0_10px_30px_-15px_rgba(0,0,0,0.20)] py-2"
        >
          {link.children!.map((child) => (
            <li key={child.href} role="none">
              <Link
                role="menuitem"
                href={child.href}
                className="block px-5 py-2.5 text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
                onClick={() => setOpen(false)}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
