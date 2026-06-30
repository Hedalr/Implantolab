import type { SimplePageContent } from "@/content/fr/pages";
import { PageHero } from "@/components/sections/PageHero";
import { PageSections } from "@/components/sections/PageSections";
import { PageCta } from "@/components/sections/PageCta";

type Props = {
  content: SimplePageContent;
};

export function SimplePage({ content }: Props) {
  return (
    <>
      <PageHero
        eyebrow={content.eyebrow}
        title={content.title}
        intro={content.intro}
      />
      <PageSections sections={content.sections} />
      <PageCta cta={content.cta} />
    </>
  );
}
