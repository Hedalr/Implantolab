import "server-only";

import { sendExpoPushMessages, tokensToMessages } from "@/lib/push/expo";
import {
  getAdminAndSectorChefTokens,
  getAllPractitionerTokens,
  getRequestOwnerTokens,
} from "@/lib/push/recipients";
import type { MessagePushRecord, RequestPushRecord } from "@/lib/push/types";
import { isRequestInboxSubject } from "@/lib/requests/types";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";

export type { MessagePushRecord, RequestPushRecord };

/**
 * Notifie admins + chef du secteur d'une nouvelle Question / Urgence.
 */
export async function notifyNewInboxRequest(
  request: RequestPushRecord,
): Promise<void> {
  if (!isRequestInboxSubject(request.subject)) return;

  try {
    const tokens = await getAdminAndSectorChefTokens(request.sector_id);
    if (tokens.length === 0) return;

    const patient = request.patient_name?.trim() || "Patient non renseigné";
    await sendExpoPushMessages(
      tokensToMessages(tokens, {
        title: `Nouvelle ${request.subject}`,
        body: patient,
        data: { type: "new_request", requestId: request.id },
      }),
    );
  } catch (error) {
    console.error("[push/notify] new request", error);
  }
}

/**
 * Notifie le praticien propriétaire quand quelqu'un d'autre répond au fil.
 */
export async function notifyRequestReply(
  message: MessagePushRecord,
): Promise<void> {
  if (!isServiceRoleConfigured()) return;

  try {
    const supabase = getServiceRoleSupabase();
    const { data: request, error } = await supabase
      .from("requests")
      .select("id, subject, profile_id")
      .eq("id", message.request_id)
      .maybeSingle();

    if (error || !request) {
      if (error) console.error("[push/notify] load request", error.message);
      return;
    }

    if (!isRequestInboxSubject(request.subject)) return;
    if (message.sender_id === request.profile_id) return;

    const tokens = await getRequestOwnerTokens(request.profile_id);
    if (tokens.length === 0) return;

    const excerpt =
      message.body.length > 120
        ? `${message.body.slice(0, 117)}…`
        : message.body;

    await sendExpoPushMessages(
      tokensToMessages(tokens, {
        title: `Réponse à votre ${request.subject}`,
        body: excerpt,
        data: { type: "request_reply", requestId: request.id },
      }),
    );
  } catch (error) {
    console.error("[push/notify] request reply", error);
  }
}

/**
 * Claim atomique puis push praticiens pour une actualité publiée.
 * Retourne true si cet appel a pris le claim (même sans tokens).
 */
export async function notifyNewActualite(input: {
  notionPageId: string;
  title: string;
}): Promise<boolean> {
  if (!isServiceRoleConfigured()) return false;

  try {
    const supabase = getServiceRoleSupabase();

    const { error: claimError } = await supabase
      .from("push_actualite_sent")
      .insert({ notion_page_id: input.notionPageId });

    if (claimError) {
      if (claimError.code === "23505") return false;
      console.error("[push/notify] claim actualite", claimError.message);
      return false;
    }

    const tokens = await getAllPractitionerTokens();
    if (tokens.length === 0) return true;

    await sendExpoPushMessages(
      tokensToMessages(tokens, {
        title: "Nouvelle actualité",
        body: input.title || "Une nouvelle actualité est disponible.",
        data: { type: "new_actualite" },
      }),
    );

    return true;
  } catch (error) {
    console.error("[push/notify] new actualite", error);
    return false;
  }
}
