"use client";

import { useEffect, useRef, useState } from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/content/fr/site";
import { cn } from "@/lib/cn";

type EspacePraticienNavProps = {
  items: NavLink[];
  variant: "desktop" | "mobile";
};

function isNavActive(pathname: string, link: NavLink): boolean {
  if (pathname === link.href) return true;
  if (link.children?.some((child) => pathname === child.href)) return true;
  if (
    !link.children &&
    link.href !== "/" &&
    pathname.startsWith(`${link.href}/`)
  ) {
    return true;
  }
  return false;
}

function flattenNav(items: NavLink[]): NavLink[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...item.children] : [item],
  );
}

function CompactNavDropdown({
  link,
  isActive,
}: {
  link: NavLink;
  isActive: boolean;
}) {
  const [open, setOpen] = useState(false);
  const wrapperRef = useRef<HTMLDivElement>(null);
  const closeTimer = useRef<ReturnType<typeof setTimeout> | null>(null);
  const hasChildren = Boolean(link.children?.length);

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
          "text-sm transition-colors",
          isActive
            ? "text-[var(--ink)]"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
        )}
      >
        {link.label}
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
          "inline-flex items-center gap-1 text-sm transition-colors",
          isActive
            ? "text-[var(--ink)]"
            : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
        )}
        onClick={() => setOpen(false)}
      >
        {link.label}
        <svg
          width="7"
          height="5"
          viewBox="0 0 8 6"
          fill="none"
          aria-hidden="true"
          className={cn(
            "transition-transform duration-200 opacity-70",
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
      </Link>

      {open ? (
        <ul
          role="menu"
          className="absolute left-0 top-full z-50 mt-1.5 min-w-full w-max whitespace-nowrap border border-[var(--line)] bg-[var(--bg-elevated)] py-1 shadow-sm"
        >
          {link.children!.map((child) => (
            <li key={child.href} role="none">
              <Link
                role="menuitem"
                href={child.href}
                className="block px-3 py-1.5 text-xs text-[var(--ink-muted)] hover:bg-[var(--bg)] hover:text-[var(--ink)] transition-colors"
                onClick={() => setOpen(false)}
              >
                {child.label}
              </Link>
            </li>
          ))}
        </ul>
      ) : null}
    </div>
  );
}

export function EspacePraticienNav({ items, variant }: EspacePraticienNavProps) {
  const pathname = usePathname();

  if (variant === "desktop") {
    return (
      <nav
        aria-label="Navigation praticien"
        className="hidden md:flex items-center gap-6"
      >
        {items.map((item) => (
          <CompactNavDropdown
            key={item.href}
            link={item}
            isActive={isNavActive(pathname, item)}
          />
        ))}
      </nav>
    );
  }

  return (
    <nav
      aria-label="Navigation praticien (mobile)"
      className="flex md:hidden items-center gap-5 overflow-x-auto pb-3 pt-1 -mx-6 px-6"
    >
      {flattenNav(items).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          className={cn(
            "text-xs transition-colors whitespace-nowrap",
            pathname === item.href
              ? "text-[var(--ink)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
