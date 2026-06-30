import { SimplePage } from "@/components/layout/SimplePage";
import { fluxNumerique } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: fluxNumerique.title,
  description: fluxNumerique.intro,
  path: "/flux-numerique",
});

export default function FluxNumeriquePage() {
  return <SimplePage content={fluxNumerique} />;
}
