import { redirect } from "next/navigation";
import { homePathForRole } from "@/lib/roles";
import {
  getCurrentProfile,
  getSessionUser,
  isSupabaseConfigured,
} from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

export default async function EspacePraticienIndex() {
  if (!isSupabaseConfigured()) {
    redirect("/espace-praticien/login");
  }

  const user = await getSessionUser();
  if (!user) {
    redirect("/espace-praticien/login");
  }

  const profile = await getCurrentProfile();
  redirect(homePathForRole(profile?.role));
}
