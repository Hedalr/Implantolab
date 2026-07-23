import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { getServerSupabase, requireLaboStaff } from "@/lib/supabase/server";
import {
  fetchRequestMediaItems,
  getLabRequestById,
} from "@/lib/requests/queries";
import { formatRequestCategory } from "@/lib/requests/types";
import { RequestMediaGallery } from "@/components/requests/RequestMediaGallery";
import { Button } from "@/components/ui/Button";
import { Badge } from "../Badge";
import {
  markLabRequestClosed,
  markLabRequestOpen,
} from "../actions";

export const metadata: Metadata = {
  title: "Demande — Laboratoire",
  robots: { index: false, follow: false },
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

  const mediaByRequest = await fetchRequestMediaItems(supabase, [requestId]);
  const media = mediaByRequest.get(requestId) ?? [];

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
          {request.creatorName ?? request.practices?.name ?? "Dentiste"}
          {request.patientName ? (
            <span className="text-[var(--ink-muted)] font-sans text-xl md:text-2xl">
              {" "}
              · {request.patientName}
            </span>
          ) : null}
        </h1>
        <p className="text-sm text-[var(--ink-muted)]">
          {dateTimeFormatter.format(new Date(request.created_at))}
          {request.practices?.name ? ` · ${request.practices.name}` : ""}
          {request.practices?.city ? ` · ${request.practices.city}` : ""}
        </p>
        <div className="flex flex-wrap gap-2">
          <Badge
            label={formatRequestCategory(request.subject)}
            warm={request.subject === "Urgence"}
          />
          {request.sectorName ? (
            <Badge label={request.sectorName} color={request.sectorColor} />
          ) : null}
          <Badge
            label={request.status === "open" ? "Ouverte" : "Traitée"}
            warm={request.status === "open"}
          />
        </div>
      </header>

      {request.patientName ? (
        <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
          <h2 className="text-eyebrow mb-3">Patient</h2>
          <p className="text-[var(--ink)] leading-relaxed">{request.patientName}</p>
        </section>
      ) : null}

      <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
        <h2 className="text-eyebrow mb-3">Message</h2>
        <p className="text-[var(--ink)] leading-relaxed whitespace-pre-line">
          {request.message}
        </p>
        <RequestMediaGallery media={media} />
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
