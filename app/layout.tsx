import type { Metadata, Viewport } from "next";
import {
  Bodoni_Moda,
  Caveat,
  Fraunces,
  Source_Sans_3,
} from "next/font/google";
import { SiteHeader } from "@/components/layout/SiteHeader";
import { Footer } from "@/components/layout/Footer";
import { AuthHashRecovery } from "@/components/auth/AuthHashRecovery";
import { site } from "@/content/fr/site";
import "./globals.css";

const fraunces = Fraunces({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-fraunces",
  style: ["normal", "italic"],
  axes: ["opsz", "SOFT"],
});

const sourceSans = Source_Sans_3({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-source",
});

const caveat = Caveat({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-signature",
  weight: ["500", "600"],
});

const bodoniModa = Bodoni_Moda({
  subsets: ["latin"],
  display: "swap",
  variable: "--font-slogan",
  weight: ["400", "500"],
  style: ["italic"],
});

export const metadata: Metadata = {
  metadataBase: new URL(site.url),
  title: {
    default: `${site.name} — Laboratoire de prothèse dentaire`,
    template: `%s — ${site.name}`,
  },
  description: site.description,
  applicationName: site.name,
  generator: "Next.js",
  authors: [{ name: site.name }],
  keywords: [
    "laboratoire prothèse dentaire",
    "implantologie",
    "CFAO dentaire",
    "prothèse sur mesure",
    "flux numérique dentaire",
    "prothèse conjointe",
    "prothèse amovible",
    "couronne zircone",
    "made in Blois",
  ],
  openGraph: {
    type: "website",
    locale: site.locale,
    url: site.url,
    siteName: site.name,
    title: `${site.name} — Laboratoire de prothèse dentaire`,
    description: site.description,
    images: [
      {
        url: "/brand/logo.png",
        width: 512,
        height: 512,
        alt: "Logo IMPLANTOLAB",
      },
    ],
  },
  twitter: {
    card: "summary_large_image",
    title: `${site.name} — Laboratoire de prothèse dentaire`,
    description: site.description,
    images: ["/brand/logo.png"],
  },
  icons: {
    icon: "/brand/logo.png",
    apple: "/brand/logo.png",
  },
  robots: { index: true, follow: true },
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
};

const organizationJsonLd = {
  "@context": "https://schema.org",
  "@type": "MedicalBusiness",
  name: site.name,
  url: site.url,
  description: site.description,
  telephone: site.contact.phone,
  email: site.contact.email,
  address: {
    "@type": "PostalAddress",
    streetAddress: site.contact.address.line1,
    postalCode: site.contact.address.postalCode,
    addressLocality: site.contact.address.city,
    addressCountry: site.contact.address.country,
  },
  areaServed: { "@type": "Country", name: "France" },
  logo: `${site.url}/brand/logo.png`,
  image: `${site.url}/brand/logo.png`,
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html
      lang="fr"
      className={`${fraunces.variable} ${sourceSans.variable} ${caveat.variable} ${bodoniModa.variable}`}
    >
      <body className="min-h-screen flex flex-col antialiased">
        <script
          type="application/ld+json"
          dangerouslySetInnerHTML={{ __html: JSON.stringify(organizationJsonLd) }}
        />
        <a
          href="#contenu"
          className="sr-only focus:not-sr-only focus:fixed focus:top-3 focus:left-3 focus:z-50 focus:bg-[var(--ink)] focus:text-[var(--bg)] focus:px-4 focus:py-2"
        >
          Aller au contenu
        </a>
        <AuthHashRecovery />
        <SiteHeader />
        <main id="contenu" className="flex-1">
          {children}
        </main>
        <Footer />
      </body>
    </html>
  );
}
