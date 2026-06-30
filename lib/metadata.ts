import type { Metadata } from "next";
import { site } from "@/content/fr/site";

type PageMetaInput = {
  title: string;
  description: string;
  path?: string;
};

export function pageMetadata({ title, description, path = "" }: PageMetaInput): Metadata {
  const url = `${site.url}${path}`;
  const fullTitle = `${title} — ${site.name}`;

  return {
    title: fullTitle,
    description,
    alternates: { canonical: url },
    openGraph: {
      title: fullTitle,
      description,
      url,
      siteName: site.name,
      locale: site.locale,
      type: "website",
      images: [
        {
          url: "/brand/logo.png",
          width: 512,
          height: 512,
          alt: `Logo ${site.name}`,
        },
      ],
    },
    twitter: {
      card: "summary_large_image",
      title: fullTitle,
      description,
      images: ["/brand/logo.png"],
    },
  };
}
