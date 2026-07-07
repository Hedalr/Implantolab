"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";
import type { CasePriority, CaseStatus } from "@/lib/labo/types";

/**
 * Server actions du module Laboratoire.
 * Toutes les actions requièrent une session admin ou prosthetist et passent
 * par le client Supabase authentifié (donc filtrées par RLS).
 */

const VALID_STATUS: CaseStatus[] = [
  "pending_review",
  "received",
  "in_progress",
  "waiting_info",
  "completed",
  "delivered",
  "archived",
];

const VALID_PRIORITY: CasePriority[] = ["low", "normal", "high", "urgent"];

function coerceStatus(value: FormDataEntryValue | null): CaseStatus | null {
  if (typeof value !== "string") return null;
  return VALID_STATUS.includes(value as CaseStatus) ? (value as CaseStatus) : null;
}

function coercePriority(value: FormDataEntryValue | null): CasePriority | null {
  if (typeof value !== "string") return null;
  return VALID_PRIORITY.includes(value as CasePriority)
    ? (value as CasePriority)
    : null;
}

function s(value: FormDataEntryValue | null): string | null {
  if (typeof value !== "string") return null;
  const trimmed = value.trim();
  return trimmed ? trimmed : null;
}

/**
 * Met à jour un dossier patient : correction des champs extraits par l'IA
 * (patient, dentiste, type de travail, description) + statut + priorité +
 * assignation prothésiste.
 *
 * Marque `needs_review = false` dès qu'un patient_name non vide est fourni
 * et que le statut n'est plus pending_review.
 */
export async function updateCase(formData: FormData): Promise<void> {
  await requireLaboStaff();

  const caseId = String(formData.get("caseId") ?? "").trim();
  if (!caseId) {
    redirect("/espace-praticien/laboratoire?error=case-missing");
  }

  const status = coerceStatus(formData.get("status"));
  const priority = coercePriority(formData.get("priority"));
  const patientName = s(formData.get("patientName"));
  const dentistName = s(formData.get("dentistName"));
  const workType = s(formData.get("workType"));
  const description = s(formData.get("description"));
  const assignedTo = s(formData.get("assignedTo"));

  const patch: Record<string, unknown> = {
    patient_name: patientName,
    dentist_name_raw: dentistName,
    work_type: workType,
    description,
    assigned_prosthetist_id: assignedTo,
  };
  if (status) patch.status = status;
  if (priority) patch.priority = priority;

  // Sortie de la file "à valider" dès que patient renseigné + statut avancé.
  if (patientName && status && status !== "pending_review") {
    patch.needs_review = false;
  }

  const supabase = await getServerSupabase();
  const { error } = await supabase
    .from("patient_cases")
    .update(patch)
    .eq("id", caseId);

  if (error) {
    redirect(
      `/espace-praticien/laboratoire/${caseId}?error=${encodeURIComponent(error.message.slice(0, 60))}`,
    );
  }

  revalidatePath(`/espace-praticien/laboratoire/${caseId}`);
  revalidatePath("/espace-praticien/laboratoire");
  redirect(`/espace-praticien/laboratoire/${caseId}?ok=updated`);
}

/**
 * Ajoute un commentaire interne (message sortant) au dossier.
 * Ne l'envoie PAS au dentiste. Sert d'historique interne prothésiste ↔ admin.
 */
export async function addInternalNote(formData: FormData): Promise<void> {
  const { userId } = await requireLaboStaff();
  const caseId = String(formData.get("caseId") ?? "").trim();
  const body = String(formData.get("body") ?? "").trim();

  if (!caseId || !body) {
    redirect(`/espace-praticien/laboratoire/${caseId}?error=empty-note`);
  }

  const supabase = await getServerSupabase();
  await supabase.from("case_messages").insert({
    case_id: caseId,
    direction: "outbound",
    body,
    raw_payload: { source: "internal_note", user_id: userId },
    received_at: new Date().toISOString(),
  });

  revalidatePath(`/espace-praticien/laboratoire/${caseId}`);
  redirect(`/espace-praticien/laboratoire/${caseId}?ok=note-added`);
}

/**
 * Fusionne un dossier source dans un dossier cible : réassigne messages et
 * médias, puis archive le dossier source. Utile quand l'IA a créé deux
 * dossiers pour le même patient (ex. messages espacés de plus de 30 min).
 */
export async function mergeIntoCase(formData: FormData): Promise<void> {
  await requireLaboStaff();
  const sourceId = String(formData.get("sourceCaseId") ?? "").trim();
  const targetId = String(formData.get("targetCaseId") ?? "").trim();
  if (!sourceId || !targetId || sourceId === targetId) {
    redirect(
      `/espace-praticien/laboratoire/${sourceId}?error=merge-invalid`,
    );
  }

  const supabase = await getServerSupabase();
  await supabase
    .from("case_messages")
    .update({ case_id: targetId })
    .eq("case_id", sourceId);
  await supabase
    .from("case_media")
    .update({ case_id: targetId })
    .eq("case_id", sourceId);
  await supabase
    .from("patient_cases")
    .update({ status: "archived", needs_review: false })
    .eq("id", sourceId);

  revalidatePath(`/espace-praticien/laboratoire/${targetId}`);
  revalidatePath("/espace-praticien/laboratoire");
  redirect(`/espace-praticien/laboratoire/${targetId}?ok=merged`);
}
