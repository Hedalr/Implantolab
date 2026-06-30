import { Hero } from "@/components/sections/Hero";
import { Reassurance } from "@/components/sections/Reassurance";
import { Expertises } from "@/components/sections/Expertises";
import { Process } from "@/components/sections/Process";
import { Quality } from "@/components/sections/Quality";
import { ContactCta } from "@/components/sections/ContactCta";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: "Laboratoire de prothèse dentaire",
  description:
    "IMPLANTOLAB conçoit des prothèses dentaires sur mesure pour les chirurgiens-dentistes : implantologie, prothèse fixée, flux numérique CFAO et accompagnement praticien.",
  path: "/",
});

export default function HomePage() {
  return (
    <>
      <Hero />
      <Reassurance />
      <Expertises />
      <Process />
      <Quality />
      <ContactCta />
    </>
  );
}
