import { getCurrentProfile } from "@/lib/supabase/server";
import { Header } from "@/components/layout/Header";

export async function SiteHeader() {
  const profile = await getCurrentProfile();
  const userDisplayName = profile
    ? profile.fullName ?? profile.email
    : null;

  return <Header userDisplayName={userDisplayName} />;
}
