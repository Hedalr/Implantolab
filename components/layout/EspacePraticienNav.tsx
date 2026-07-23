"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import type { NavLink } from "@/content/fr/site";
import { cn } from "@/lib/cn";
import { MotionNavDropdownPanel } from "@/components/layout/MotionNavDropdownPanel";
import {
  flattenNav,
  isNavActive,
  linkTone,
} from "@/components/layout/nav-utils";
import {
  MotionNavigationMenu,
  MotionNavigationMenuContent,
  MotionNavigationMenuItem,
  MotionNavigationMenuLink,
  MotionNavigationMenuList,
  MotionNavigationMenuTrigger,
} from "@/components/ui/motion-navigation-menu";

type EspacePraticienNavProps = {
  items: NavLink[];
  variant: "desktop" | "mobile";
};

export function EspacePraticienNav({ items, variant }: EspacePraticienNavProps) {
  const pathname = usePathname();

  if (variant === "desktop") {
    return (
      <MotionNavigationMenu
        aria-label="Navigation praticien"
        className="hidden md:flex"
      >
        <MotionNavigationMenuList className="gap-1">
          {items.map((item) => {
            const active = isNavActive(pathname, item);
            const children = item.children;

            if (!children?.length) {
              return (
                <MotionNavigationMenuItem key={item.href}>
                  <MotionNavigationMenuLink
                    href={item.href}
                    className={cn(
                      "h-9 justify-center px-3 py-2 font-medium",
                      linkTone(active),
                    )}
                  >
                    {item.label}
                  </MotionNavigationMenuLink>
                </MotionNavigationMenuItem>
              );
            }

            return (
              <MotionNavigationMenuItem key={item.href} value={item.href}>
                <MotionNavigationMenuTrigger
                  className={cn("font-medium", linkTone(active))}
                >
                  {item.label}
                </MotionNavigationMenuTrigger>
                <MotionNavigationMenuContent>
                  <MotionNavDropdownPanel
                    link={item}
                    items={children}
                    pathname={pathname}
                    overviewLabel="Vue d'ensemble"
                    itemClassName="px-3 py-2"
                  />
                </MotionNavigationMenuContent>
              </MotionNavigationMenuItem>
            );
          })}
        </MotionNavigationMenuList>
      </MotionNavigationMenu>
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
