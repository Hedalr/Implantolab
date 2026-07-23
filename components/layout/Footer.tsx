import Link from "next/link";
import { footerColumns, legalLinks, site } from "@/content/fr/site";
import { Logo } from "@/components/ui/Logo";
import { Container } from "@/components/ui/Container";
import { LocationMap } from "@/components/layout/LocationMap";

export function Footer() {
  const year = new Date().getFullYear();

  return (
    <footer className="bg-[var(--bg-deep)] text-[var(--ink-invert)]">
      <Container size="wide" className="py-20">
        <div className="grid gap-14 lg:grid-cols-12">
          <div className="lg:col-span-4 flex flex-col gap-6">
            <Logo variant="invert" showWordmark />
            <p className="text-[var(--ink-invert-muted)] max-w-xs leading-relaxed">
              Laboratoire de prothèse dentaire spécialisé en implantologie,
              fabrication sur mesure et flux numérique.
            </p>
            <address className="not-italic text-sm text-[var(--ink-invert-muted)] leading-relaxed">
              {site.contact.address.line1}
              <br />
              {site.contact.address.postalCode} {site.contact.address.city},{" "}
              {site.contact.address.country}
            </address>
            <div className="flex flex-col gap-1 text-sm">
              <a
                href={`tel:${site.contact.phone}`}
                className="text-[var(--ink-invert)] hover:text-[var(--accent-warm-soft)] transition-colors"
              >
                {site.contact.phoneDisplay}
              </a>
              <a
                href={`mailto:${site.contact.email}`}
                className="text-[var(--ink-invert)] hover:text-[var(--accent-warm-soft)] transition-colors"
              >
                {site.contact.email}
              </a>
            </div>
          </div>

          <div className="lg:col-span-8 flex flex-col gap-10">
            <div className="grid gap-10 sm:grid-cols-3">
              {footerColumns.map((column) => (
                <div key={column.title} className="flex flex-col gap-4">
                  <h3 className="text-eyebrow text-[var(--ink-invert-muted)]">
                    {column.title}
                  </h3>
                  <ul className="flex flex-col gap-2.5 text-sm">
                    {column.links.map((link) => (
                      <li key={link.href}>
                        <Link
                          href={link.href}
                          className="text-[var(--ink-invert)] hover:text-[var(--accent-warm-soft)] transition-colors"
                        >
                          {link.label}
                        </Link>
                      </li>
                    ))}
                  </ul>
                </div>
              ))}
            </div>
            <LocationMap compact />
          </div>
        </div>

        <div className="mt-16 pt-8 border-t border-[var(--line-invert)] flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between text-xs text-[var(--ink-invert-muted)]">
          <p>
            © {year} {site.name} — Laboratoire de prothèse dentaire. Tous droits
            réservés.
          </p>
          <ul className="flex flex-wrap items-center gap-x-6 gap-y-2">
            {legalLinks.map((link) => (
              <li key={link.href}>
                <Link
                  href={link.href}
                  className="hover:text-[var(--ink-invert)] transition-colors"
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </Container>
    </footer>
  );
}
