import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";
import { getLabRequestById } from "@/lib/requests/queries";
import { RequestMediaGallery } from "@/components/requests/RequestMediaGallery";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  markLabRequestClosed,
  markLabRequestOpen,
} from "../actions";

export const metadata: Metadata = {
  title: "Demande — Laboratoire",
  robots: { index: false, follow: false },
};

type RequestMediaRow = {
  id: string;
  original_filename: string | null;
  mime_type: string | null;
};

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

export default async function LabRequestDetailPage({
  params,
  searchParams,
}: {
  params: Promise<{ requestId: string }>;
  searchParams: Promise<{ ok?: string; error?: string }>;
}) {
  await requireLaboStaff();
  const { requestId } = await params;
  const { ok, error } = await searchParams;

  const supabase = await getServerSupabase();
  const request = await getLabRequestById(supabase, requestId);
  if (!request) notFound();

  const { data: mediaData } = await supabase
    .from("request_media")
    .select("id, original_filename, mime_type")
    .eq("request_id", requestId)
    .order("created_at", { ascending: true });

  const media = (mediaData ?? []) as RequestMediaRow[];

  return (
    <div className="flex flex-col gap-8 max-w-3xl">
      <div>
        <Link
          href="/espace-praticien/laboratoire"
          className="text-sm text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
        >
          ← Retour au laboratoire
        </Link>
      </div>

      {ok === "updated" ? (
        <p
          role="status"
          className="border-l-2 border-[var(--accent-warm)] pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)]"
        >
          Statut mis à jour.
        </p>
      ) : null}
      {error ? (
        <p
          role="alert"
          className="border-l-2 border-[var(--ink)] pl-4 py-2 bg-[var(--bg-elevated)] text-sm text-[var(--ink)]"
        >
          Impossible de mettre à jour : {error}
        </p>
      ) : null}

      <header className="flex flex-col gap-3">
        <span className="text-eyebrow flex items-center gap-3">
          <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
          Laboratoire
        </span>
        <h1 className="font-serif text-2xl md:text-3xl text-[var(--ink)] leading-tight">
          {request.practices?.name ?? "Cabinet"}
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          {dateTimeFormatter.format(new Date(request.created_at))}
          {request.creatorName ? ` · ${request.creatorName}` : ""}
          {request.practices?.city ? ` · ${request.practices.city}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge label={request.subject} warm={request.subject === "Urgence"} />
          {request.sectorName ? (
            <Badge label={request.sectorName} color={request.sectorColor} />
          ) : null}
          <Badge
            label={request.status === "open" ? "Ouverte" : "Traitée"}
            warm={request.status === "open"}
          />
        </div>
      </header>

      <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
        <h2 className="text-eyebrow mb-3">Message</h2>
        <p className="text-[var(--ink)] leading-relaxed whitespace-pre-line">
          {request.message}
        </p>
        <RequestMediaGallery
          media={media.map((m) => ({
            id: m.id,
            filename: m.original_filename,
            mimeType: m.mime_type,
          }))}
        />
      </section>

      <form
        action={
          request.status === "open" ? markLabRequestClosed : markLabRequestOpen
        }
        className="flex flex-wrap items-center gap-3"
      >
        <input type="hidden" name="id" value={request.id} />
        <Button type="submit" variant="primary">
          {request.status === "open"
            ? "Marquer comme traitée"
            : "Rouvrir la demande"}
        </Button>
      </form>
    </div>
  );
}

function Badge({
  label,
  warm,
  color,
}: {
  label: string;
  warm?: boolean;
  color?: string | null;
}) {
  return (
    <span
      className={cn(
        "inline-flex items-center gap-2 border px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.18em] shrink-0",
        warm
          ? "border-[var(--accent-warm)] text-[var(--accent-warm)]"
          : "border-[var(--line-strong)] text-[var(--ink)]",
      )}
    >
      {color ? (
        <span
          aria-hidden="true"
          className="h-1.5 w-1.5 rounded-full"
          style={{ backgroundColor: color }}
        />
      ) : null}
      {label}
    </span>
  );
}
