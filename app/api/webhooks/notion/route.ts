import { createHmac, timingSafeEqual } from "crypto";
import { Client, isFullPage } from "@notionhq/client";
import { NextResponse } from "next/server";

import { notifyNewActualite } from "@/lib/push/notify";

type NotionWebhookBody = {
  verification_token?: string;
  type?: string;
  entity?: { id?: string };
};

/**
 * Webhook Notion — handshake + push praticiens quand `Publié` = true.
 */
export async function POST(request: Request) {
  const rawBody = await request.text();

  let body: NotionWebhookBody;
  try {
    body = JSON.parse(rawBody) as NotionWebhookBody;
  } catch {
    return NextResponse.json({ error: "Invalid JSON" }, { status: 400 });
  }

  // Handshake : coller le token dans Notion et NOTION_WEBHOOK_SECRET.
  if (typeof body.verification_token === "string" && body.verification_token) {
    console.info(
      "[webhooks/notion] verification_token=",
      body.verification_token,
    );
    return NextResponse.json({ ok: true });
  }

  const secret = process.env.NOTION_WEBHOOK_SECRET;
  if (!secret) {
    return NextResponse.json(
      { error: "NOTION_WEBHOOK_SECRET manquant" },
      { status: 500 },
    );
  }

  const signature = request.headers.get("x-notion-signature");
  if (!verifyNotionSignature(rawBody, signature, secret)) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const eventType = body.type ?? "";
  const pageId = body.entity?.id;
  if (
    !pageId ||
    (eventType !== "page.properties_updated" && eventType !== "page.created")
  ) {
    return NextResponse.json({ ok: true, skipped: true });
  }

  const notionToken = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;
  if (!notionToken || !databaseId) {
    console.warn("[webhooks/notion] NOTION_TOKEN / NOTION_DATABASE_ID absents");
    return NextResponse.json({ ok: true, skipped: true });
  }

  try {
    const notion = new Client({ auth: notionToken });
    const page = await notion.pages.retrieve({ page_id: pageId });
    if (!isFullPage(page)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    if (!pageBelongsToActualitesDb(page.parent, databaseId)) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    const props = page.properties as Record<string, unknown>;
    if (!isPublishedCheckbox(props["Publié"])) {
      return NextResponse.json({ ok: true, skipped: true });
    }

    await notifyNewActualite({
      notionPageId: normalizeNotionId(pageId),
      title: readPlainText(props["Titre"]) || "Nouvelle actualité",
    });

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error("[webhooks/notion] traitement", error);
    return NextResponse.json({ ok: true, error: true });
  }
}

function verifyNotionSignature(
  rawBody: string,
  signatureHeader: string | null,
  verificationToken: string,
): boolean {
  if (!signatureHeader?.startsWith("sha256=")) return false;

  const expected = `sha256=${createHmac("sha256", verificationToken)
    .update(rawBody)
    .digest("hex")}`;

  const a = Buffer.from(expected);
  const b = Buffer.from(signatureHeader);
  if (a.length !== b.length) return false;
  return timingSafeEqual(a, b);
}

function normalizeNotionId(id: string): string {
  return id.replace(/-/g, "").toLowerCase();
}

function pageBelongsToActualitesDb(
  parent: { type: string } & Record<string, unknown>,
  databaseId: string,
): boolean {
  const normalizedDb = normalizeNotionId(databaseId);

  if (parent.type === "database_id" && typeof parent.database_id === "string") {
    return normalizeNotionId(parent.database_id) === normalizedDb;
  }

  // data_source parent : filtre Publié + claim dédup suffisent.
  return parent.type === "data_source_id";
}

function isPublishedCheckbox(prop: unknown): boolean {
  if (!prop || typeof prop !== "object") return false;
  const p = prop as { type?: string; checkbox?: boolean };
  return p.type === "checkbox" && p.checkbox === true;
}

function readPlainText(prop: unknown): string {
  if (!prop || typeof prop !== "object") return "";
  const p = prop as {
    type?: string;
    title?: Array<{ plain_text?: string }>;
    rich_text?: Array<{ plain_text?: string }>;
  };
  const items =
    p.type === "title"
      ? p.title
      : p.type === "rich_text"
        ? p.rich_text
        : undefined;
  if (!Array.isArray(items)) return "";
  return items.map((t) => t.plain_text ?? "").join("");
}
