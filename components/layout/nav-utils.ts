import type { NavLink } from "@/content/fr/site";

export function pathWithoutHash(href: string) {
  return href.split("#")[0] || href;
}

export function hrefPathname(href: string) {
  return pathWithoutHash(href).split("?")[0] || href;
}

export function hrefSearchParams(href: string): URLSearchParams {
  const base = pathWithoutHash(href);
  const q = base.indexOf("?");
  return new URLSearchParams(q >= 0 ? base.slice(q + 1) : "");
}

function matchesPath(pathname: string, href: string) {
  const base = hrefPathname(href);
  if (pathname === base) return true;
  return base !== "/" && pathname.startsWith(`${base}/`);
}

export function isNavActive(pathname: string, link: NavLink): boolean {
  if (matchesPath(pathname, link.href)) return true;
  return Boolean(link.children?.some((child) => matchesPath(pathname, child.href)));
}

/** Active exacte d’un lien, en tenant compte des query params présents dans `href`. */
export function isHrefActive(
  pathname: string,
  searchParams: URLSearchParams,
  href: string,
): boolean {
  if (hrefPathname(href) !== pathname) return false;
  const expected = hrefSearchParams(href);
  for (const [key, value] of expected.entries()) {
    if (searchParams.get(key) !== value) return false;
  }
  // Lien sans query : actif seulement si aucune query « sector » n’est posée
  // (ou sector=all), pour distinguer « Tous » d’un secteur filtré.
  if (![...expected.keys()].length) {
    const sector = searchParams.get("sector");
    if (sector && sector !== "all") return false;
  }
  return true;
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
