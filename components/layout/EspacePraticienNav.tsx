"use client";

import Link from "next/link";
import { usePathname, useSearchParams } from "next/navigation";
import type { NavLink } from "@/content/fr/site";
import { cn } from "@/lib/cn";
import { MotionNavDropdownPanel } from "@/components/layout/MotionNavDropdownPanel";
import {
  flattenNav,
  isHrefActive,
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
  const searchParams = useSearchParams();

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
                    searchParams={searchParams}
                    overviewLabel={item.overviewLabel ?? "Vue d'ensemble"}
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
      className={cn(
        "scroll-rail flex md:hidden items-stretch gap-1 overflow-x-auto pb-2",
        // Le rail saigne jusqu'aux bords de l'écran mais réaligne son premier
        // et son dernier élément sur la gouttière du Container.
        "-mx-4 px-4 sm:-mx-6 sm:px-6",
      )}
    >
      {flattenNav(items).map((item) => (
        <Link
          key={item.href}
          href={item.href}
          aria-current={
            isHrefActive(pathname, searchParams, item.href) ? "page" : undefined
          }
          className={cn(
            "inline-flex min-h-11 shrink-0 items-center whitespace-nowrap px-3 text-sm transition-colors",
            isHrefActive(pathname, searchParams, item.href)
              ? "text-[var(--ink)] shadow-[inset_0_-2px_0_var(--accent)]"
              : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
          )}
        >
          {item.label}
        </Link>
      ))}
    </nav>
  );
}
