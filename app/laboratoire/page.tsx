import { SimplePage } from "@/components/layout/SimplePage";
import { laboratoire } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: laboratoire.title,
  description: laboratoire.intro,
  path: "/laboratoire",
});

export default function LaboratoirePage() {
  return <SimplePage content={laboratoire} />;
}
