import { Hero } from "@/components/sections/Hero";
import { StatsBand } from "@/components/sections/StatsBand";
import { EphemeralInfoBanner } from "@/components/sections/EphemeralInfoBanner";
import { ExpertiseTabs } from "@/components/sections/ExpertiseTabs";
import { TeamShowcase } from "@/components/sections/TeamShowcase";
import { PhotoGallery } from "@/components/sections/PhotoGallery";
import { CtaTriptych } from "@/components/sections/CtaTriptych";
import { ContactCta } from "@/components/sections/ContactCta";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Laboratoire de prothèse dentaire",
  description:
    "IMPLANTOLAB conçoit des prothèses dentaires sur mesure pour les chirurgiens-dentistes : implantologie, prothèse conjointe, prothèse amovible et flux numérique CFAO. Chaîne de production 100 % interne à Blois.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <StatsBand />
      <EphemeralInfoBanner />
      <ExpertiseTabs />
      <PhotoGallery />
      <TeamShowcase />
      <ContactCta />
      <CtaTriptych />
    </>
  );
}
