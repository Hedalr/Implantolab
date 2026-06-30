import { SimplePage } from "@/components/layout/SimplePage";
import { protheses } from "@/content/fr/pages";
import { pageMetadata } from "@/lib/metadata";

export const metadata = pageMetadata({
  title: protheses.title,
  description: protheses.intro,
  path: "/protheses",
});

export default function ProthesesPage() {
  return <SimplePage content={protheses} />;
}
