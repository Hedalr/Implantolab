"use client";

import { useState } from "react";
import { site } from "@/content/fr/site";
import { cn } from "@/lib/cn";

function formatAddress() {
  const { line1, postalCode, city, country } = site.contact.address;
  return `${line1}, ${postalCode} ${city}, ${country}`;
}

type LocationMapProps = {
  compact?: boolean;
  className?: string;
};

export function LocationMap({ compact = false, className }: LocationMapProps) {
  const [loaded, setLoaded] = useState(false);
  const address = formatAddress();
  const mapQuery = encodeURIComponent(address);
  const embedSrc = `https://www.google.com/maps?q=${mapQuery}&hl=fr&z=13&output=embed`;
  const externalHref = `https://www.google.com/maps/search/?api=1&query=${mapQuery}`;

  return (
    <section
      aria-label="Localisation du laboratoire"
      className={cn(
        compact && "overflow-hidden rounded-lg border border-[var(--line-invert)]",
        className,
      )}
    >
      <div
        className={cn(
          "relative w-full",
          compact ? "h-[230px] sm:h-[200px]" : "h-[280px] sm:h-[320px] md:h-[400px]",
        )}
      >
        {loaded ? (
          <iframe
            title={`Carte — ${site.name}, ${site.contact.address.line1}, ${site.contact.address.city}`}
            src={embedSrc}
            className="absolute inset-0 h-full w-full border-0 grayscale-[20%] contrast-[1.05]"
            loading="lazy"
            referrerPolicy="no-referrer-when-downgrade"
            allowFullScreen
          />
        ) : (
          <div
            className={cn(
              "absolute inset-0 flex flex-col items-center justify-center gap-2 px-5 text-center",
              compact
                ? "bg-[var(--bg-deep-soft)] text-[var(--ink-invert)]"
                : "bg-[var(--bg-elevated)] text-[var(--ink)]",
            )}
          >
            <p
              className={cn(
                "text-sm leading-relaxed max-w-sm",
                compact
                  ? "text-[var(--ink-invert-muted)]"
                  : "text-[var(--ink-muted)]",
              )}
            >
              {address}
            </p>
            <button
              type="button"
              onClick={() => setLoaded(true)}
              className={cn(
                "inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-xs uppercase tracking-[0.16em] border transition-colors",
                compact
                  ? "border-[var(--line-invert)] text-[var(--ink-invert)] hover:border-[var(--accent-warm-soft)] hover:text-[var(--accent-warm-soft)]"
                  : "border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)]",
              )}
            >
              Afficher la carte
            </button>
            <div className="flex flex-col items-center">
              <p
                className={cn(
                  "text-xs leading-relaxed max-w-xs",
                  compact
                    ? "text-[var(--ink-invert-muted)]"
                    : "text-[var(--ink-discreet)]",
                )}
              >
                Charge Google Maps (cookies tiers possibles).
              </p>
              <a
                href={externalHref}
                target="_blank"
                rel="noopener noreferrer"
                className={cn(
                  "tap-link text-xs underline underline-offset-2 transition-colors",
                  compact
                    ? "text-[var(--ink-invert-muted)] hover:text-[var(--accent-warm-soft)]"
                    : "text-[var(--ink-discreet)] hover:text-[var(--ink)]",
                )}
              >
                Ouvrir dans Google Maps
              </a>
            </div>
          </div>
        )}
      </div>
    </section>
  );
}
