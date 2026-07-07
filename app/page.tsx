import { Hero } from "@/components/sections/Hero";
import { StatsBand } from "@/components/sections/StatsBand";
import { ExpertiseTabs } from "@/components/sections/ExpertiseTabs";
import { LabIntro } from "@/components/sections/LabIntro";
import { PhotoGallery } from "@/components/sections/PhotoGallery";
import { NewsTeaser } from "@/components/sections/NewsTeaser";
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
      <ExpertiseTabs />
      <LabIntro />
      <PhotoGallery />
      <NewsTeaser />
      <ContactCta />
      <CtaTriptych />
    </>
  );
}
