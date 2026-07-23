"use client";

import type { NavLink } from "@/content/fr/site";
import { cn } from "@/lib/cn";
import { MotionNavigationMenuLink } from "@/components/ui/motion-navigation-menu";
import { pathWithoutHash } from "@/components/layout/nav-utils";

type MotionNavDropdownPanelProps = {
  link: NavLink;
  items: NavLink[];
  pathname: string;
  overviewLabel: string;
  itemClassName?: string;
};

export function MotionNavDropdownPanel({
  link,
  items,
  pathname,
  overviewLabel,
  itemClassName,
}: MotionNavDropdownPanelProps) {
  return (
    <div className="flex w-max min-w-0 flex-col gap-0.5">
      <MotionNavigationMenuLink
        href={link.href}
        className={cn(
          itemClassName,
          pathname === link.href
            ? "text-[var(--ink)]"
            : "text-[var(--ink-muted)]",
        )}
      >
        <span className="text-sm font-medium tracking-wide">{link.label}</span>
        <span className="text-[11px] text-[var(--ink-discreet)]">
          {overviewLabel}
        </span>
      </MotionNavigationMenuLink>
      {items.map((child) => {
        const childActive = pathname === pathWithoutHash(child.href);
        return (
          <MotionNavigationMenuLink
            key={child.href}
            href={child.href}
            className={cn(
              itemClassName,
              "text-sm tracking-wide",
              childActive ? "text-[var(--ink)]" : "text-[var(--ink-muted)]",
            )}
          >
            {child.label}
          </MotionNavigationMenuLink>
        );
      })}
    </div>
  );
}
