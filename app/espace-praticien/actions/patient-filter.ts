"use server";

import { redirect } from "next/navigation";
import {
  clearPatientFilterCookie,
  isPatientFilterScope,
  safeEspacePraticienPath,
  sanitizePatientFilter,
  writePatientFilter,
} from "@/lib/requests/patient-filter";

export async function setPatientFilter(formData: FormData): Promise<void> {
  const scope = formData.get("scope");
  if (!isPatientFilterScope(scope)) {
    redirect("/espace-praticien");
  }

  const redirectTo = safeEspacePraticienPath(
    formData.get("redirect_to"),
    defaultRedirectForScope(scope),
  );

  await writePatientFilter(scope, sanitizePatientFilter(formData.get("patient")));
  redirect(redirectTo);
}

export async function clearPatientFilter(formData: FormData): Promise<void> {
  const scope = formData.get("scope");
  if (!isPatientFilterScope(scope)) {
    redirect("/espace-praticien");
  }

  const redirectTo = safeEspacePraticienPath(
    formData.get("redirect_to"),
    defaultRedirectForScope(scope),
  );

  await clearPatientFilterCookie(scope);
  redirect(redirectTo);
}

function defaultRedirectForScope(
  scope: "laboratoire" | "adminDemandes" | "adminProthese",
): string {
  switch (scope) {
    case "laboratoire":
      return "/espace-praticien/laboratoire";
    case "adminDemandes":
      return "/espace-praticien/admin/demandes";
    case "adminProthese":
      return "/espace-praticien/admin/modifications-prothese";
  }
}
