import { redirect } from "next/navigation";
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
  if (profile?.role === "admin") {
    redirect("/espace-praticien/admin");
  }

  redirect("/espace-praticien/fermetures");
}
