import { SimplePage } from "@/components/layout/SimplePage";
import { implantologie } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: implantologie.title,
  description: implantologie.intro,
  path: "/implantologie",
});

export default function ImplantologiePage() {
  return <SimplePage content={implantologie} />;
}
