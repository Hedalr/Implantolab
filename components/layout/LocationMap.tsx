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
  const address = formatAddress();
  const mapQuery = encodeURIComponent(address);
  const embedSrc = `https://maps.google.com/maps?q=${mapQuery}&hl=fr&z=16&output=embed`;

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
          compact ? "h-[160px] sm:h-[180px]" : "h-[280px] sm:h-[320px] md:h-[400px]",
        )}
      >
        <iframe
          title={`Carte — ${site.name}, ${site.contact.address.line1}, ${site.contact.address.city}`}
          src={embedSrc}
          className="absolute inset-0 h-full w-full border-0 grayscale-[20%] contrast-[1.05]"
          loading="lazy"
          referrerPolicy="no-referrer-when-downgrade"
          allowFullScreen
        />
      </div>
    </section>
  );
}
