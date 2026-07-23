import type { NavLink } from "@/content/fr/site";

export function pathWithoutHash(href: string) {
  return href.split("#")[0] || href;
}

function matchesPath(pathname: string, href: string) {
  const base = pathWithoutHash(href);
  if (pathname === base) return true;
  return base !== "/" && pathname.startsWith(`${base}/`);
}

export function isNavActive(pathname: string, link: NavLink): boolean {
  if (matchesPath(pathname, link.href)) return true;
  return Boolean(link.children?.some((child) => matchesPath(pathname, child.href)));
}

export function linkTone(active: boolean) {
  return active
    ? "text-[var(--ink)]"
    : "text-[var(--ink-muted)] hover:text-[var(--ink)]";
}

export function flattenNav(items: NavLink[]): NavLink[] {
  return items.flatMap((item) =>
    item.children?.length ? [item, ...item.children] : [item],
  );
}
