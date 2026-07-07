import type { CaseExtraction, CasePriority } from "@/lib/labo/types";

/**
 * Extraction structurée d'un message dentiste pour peupler un dossier patient.
 *
 * Supporte deux providers via variables d'environnement :
 *   - OPENAI_API_KEY (+ OPENAI_MODEL, défaut "gpt-4o-mini")
 *   - ANTHROPIC_API_KEY (+ ANTHROPIC_MODEL, défaut "claude-3-5-haiku-latest")
 *
 * Si aucun n'est configuré, retourne `null` et l'appelant crée un dossier
 * `pending_review` à compléter manuellement.
 *
 * Volontairement sans SDK — un `fetch` sur l'endpoint /chat/completions
 * (OpenAI) ou /messages (Anthropic) suffit et évite d'imposer une dépendance.
 */

const SYSTEM_PROMPT = `Tu es un assistant spécialisé pour un laboratoire de prothèses dentaires en France.
Tu reçois un message WhatsApp envoyé par un dentiste au laboratoire, avec potentiellement une ou plusieurs photos.
Tu dois extraire des informations structurées pour créer un dossier patient.

Retourne UNIQUEMENT un JSON avec ces champs (aucun texte hors JSON) :
{
  "patientName": string | null,          // Nom + prénom du patient si mentionné (ex. "Marie Dupont"). null si absent.
  "patientNameConfidence": number,        // 0.0 à 1.0. Confiance dans l'identification du patient.
  "dentistName": string | null,          // Nom du dentiste si mentionné (Dr X, cabinet Y). null si absent.
  "workType": string | null,             // Type de travail demandé : couronne, bridge, implant, prothèse amovible, gouttière, provisoire, etc. null si non identifiable.
  "description": string,                 // Résumé factuel de la demande, en français, 1 à 3 phrases. Reprend les indications cliniques mentionnées.
  "priority": "low" | "normal" | "high" | "urgent"  // "urgent" si le dentiste indique une urgence explicite (« urgent », « pour aujourd'hui », « avant congés »). "normal" par défaut.
}

Règles :
- N'invente aucun nom. Si le patient n'est pas nommé, mets null et patientNameConfidence à 0.
- Ne recopie pas les formules de politesse dans description.
- Ne renvoie pas le message original.
- Si le message ne contient qu'un simple "voici les photos", description doit être "Envoi de photos sans indication clinique."`;

function coercePriority(value: unknown): CasePriority | null {
  if (value === "low" || value === "normal" || value === "high" || value === "urgent") {
    return value;
  }
  return null;
}

function parseExtractionJson(raw: string): CaseExtraction | null {
  try {
    const cleaned = raw
      .replace(/^```(?:json)?/i, "")
      .replace(/```$/i, "")
      .trim();
    const parsed = JSON.parse(cleaned) as Record<string, unknown>;

    const patientName =
      typeof parsed.patientName === "string" && parsed.patientName.trim()
        ? parsed.patientName.trim()
        : null;

    const patientNameConfidenceRaw = parsed.patientNameConfidence;
    let patientNameConfidence: number | null = null;
    if (typeof patientNameConfidenceRaw === "number") {
      patientNameConfidence = Math.min(1, Math.max(0, patientNameConfidenceRaw));
    }

    const dentistName =
      typeof parsed.dentistName === "string" && parsed.dentistName.trim()
        ? parsed.dentistName.trim()
        : null;

    const workType =
      typeof parsed.workType === "string" && parsed.workType.trim()
        ? parsed.workType.trim().toLowerCase()
        : null;

    const description =
      typeof parsed.description === "string" && parsed.description.trim()
        ? parsed.description.trim()
        : null;

    return {
      patientName,
      patientNameConfidence,
      dentistName,
      workType,
      description,
      priority: coercePriority(parsed.priority),
    };
  } catch {
    return null;
  }
}

async function extractWithOpenAI(text: string): Promise<CaseExtraction | null> {
  const apiKey = process.env.OPENAI_API_KEY;
  if (!apiKey) return null;

  const model = process.env.OPENAI_MODEL || "gpt-4o-mini";

  const res = await fetch("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      temperature: 0.1,
      response_format: { type: "json_object" },
      messages: [
        { role: "system", content: SYSTEM_PROMPT },
        { role: "user", content: text },
      ],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    choices?: { message?: { content?: string } }[];
  };
  const content = data.choices?.[0]?.message?.content;
  if (!content) return null;

  return parseExtractionJson(content);
}

async function extractWithAnthropic(text: string): Promise<CaseExtraction | null> {
  const apiKey = process.env.ANTHROPIC_API_KEY;
  if (!apiKey) return null;

  const model = process.env.ANTHROPIC_MODEL || "claude-3-5-haiku-latest";

  const res = await fetch("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": apiKey,
      "anthropic-version": "2023-06-01",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model,
      max_tokens: 800,
      system: SYSTEM_PROMPT,
      messages: [{ role: "user", content: text }],
    }),
  });

  if (!res.ok) return null;

  const data = (await res.json()) as {
    content?: { type: string; text?: string }[];
  };
  const chunk = data.content?.find((c) => c.type === "text");
  if (!chunk?.text) return null;

  return parseExtractionJson(chunk.text);
}

/**
 * Extrait les champs d'un dossier à partir du texte agrégé d'un ou plusieurs
 * messages WhatsApp. Utilise OpenAI si dispo, sinon Anthropic, sinon `null`.
 */
export async function extractCaseFromText(
  text: string,
): Promise<CaseExtraction | null> {
  if (!text.trim()) return null;

  const openaiResult = await extractWithOpenAI(text).catch(() => null);
  if (openaiResult) return openaiResult;

  const anthropicResult = await extractWithAnthropic(text).catch(() => null);
  if (anthropicResult) return anthropicResult;

  return null;
}
