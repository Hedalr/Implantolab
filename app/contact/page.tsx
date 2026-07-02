import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { PageHero } from "@/components/sections/PageHero";
import { ContactForm } from "@/components/sections/ContactForm";
import { site } from "@/content/fr/site";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Contactez IMPLANTOLAB",
  description:
    "Demande de devis, question technique : contactez le laboratoire IMPLANTOLAB. Notre équipe vous répond rapidement.",
  path: "/contact",
});

const jsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: site.name,
  url: site.url,
  logo: `${site.url}/brand/logo.png`,
  image: `${site.url}/brand/logo.png`,
  telephone: site.contact.phone,
  email: site.contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.contact.address.line1,
    postalCode: site.contact.address.postalCode,
    addressLocality: site.contact.address.city,
    addressCountry: site.contact.address.country,
  },
  openingHoursSpecification: [
    {
      "@type": "OpeningHoursSpecification",
      dayOfWeek: ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday"],
      opens: "09:00",
      closes: "17:00",
    },
  ],
};

export default function ContactPage() {
  return (
    <>
      <script
        type="application/ld+json"
        dangerouslySetInnerHTML={{ __html: JSON.stringify(jsonLd) }}
      />

      <PageHero
        eyebrow="Contact"
        title="Échangeons sur votre cas ou votre besoin"
        intro="Que ce soit pour un devis ou une question technique, notre équipe est à votre écoute. Les praticiens partenaires peuvent adresser leurs cas via l’espace client. Nous revenons vers vous sous 1 jour ouvré."
      />

      <section className="bg-[var(--bg-elevated)] border-b border-[var(--line)]">
        <Container size="wide" className="py-20 md:py-28">
          <div className="grid gap-14 lg:gap-20 lg:grid-cols-12 items-start">
            <Reveal className="lg:col-span-5 flex flex-col gap-10">
              <div className="flex flex-col gap-4">
                <span className="text-eyebrow flex items-center gap-3">
                  <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
                  Coordonnées
                </span>
                <p className="text-[var(--ink-muted)] leading-relaxed max-w-md">
                  Notre laboratoire est ouvert du lundi au vendredi. Pour les
                  demandes urgentes, privilégiez le téléphone.
                </p>
              </div>

              <ul className="flex flex-col gap-6 border-t border-[var(--line)] pt-8">
                <li className="flex flex-col gap-1">
                  <span className="text-eyebrow">Téléphone</span>
                  <a
                    href={`tel:${site.contact.phone}`}
                    className="font-serif text-xl text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
                  >
                    {site.contact.phoneDisplay}
                  </a>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-eyebrow">Email</span>
                  <a
                    href={`mailto:${site.contact.email}`}
                    className="font-serif text-xl text-[var(--ink)] hover:text-[var(--accent)] transition-colors"
                  >
                    {site.contact.email}
                  </a>
                </li>
                <li className="flex flex-col gap-1">
                  <span className="text-eyebrow">Adresse</span>
                  <address className="not-italic font-serif text-xl text-[var(--ink)] leading-snug">
                    {site.contact.address.line1}
                    <br />
                    {site.contact.address.postalCode}{" "}
                    {site.contact.address.city}
                  </address>
                </li>
                <li className="flex flex-col gap-2">
                  <span className="text-eyebrow">Horaires</span>
                  <ul className="flex flex-col gap-1 text-[var(--ink-muted)]">
                    {site.contact.hours.map((slot) => (
                      <li key={slot.label} className="flex gap-3">
                        <span className="text-[var(--ink-discreet)] w-44">
                          {slot.label}
                        </span>
                        <span className="text-[var(--ink)]">{slot.value}</span>
                      </li>
                    ))}
                  </ul>
                </li>
              </ul>
            </Reveal>

            <Reveal delay={120} className="lg:col-span-7">
              <ContactForm theme="light" />
            </Reveal>
          </div>
        </Container>
      </section>
    </>
  );
}
