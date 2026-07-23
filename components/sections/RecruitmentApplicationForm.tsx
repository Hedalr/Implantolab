"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import {
  authFieldClassName,
  authLabelClassName,
} from "@/components/auth/authFormStyles";
import { UnderlineField } from "@/components/ui/UnderlineField";

type RecruitmentApplicationFormProps = {
  openings: string[];
  defaultPoste?: string;
};

type Status = "idle" | "submitting" | "success" | "error";

const ACCEPTED_CV_TYPES = [
  "application/pdf",
  "application/msword",
  "application/vnd.openxmlformats-officedocument.wordprocessingml.document",
];

const MAX_CV_SIZE_MB = 5;
const MAX_ATTACHMENTS = 4;

const STAGE_OPTION = "Demande de stage";
const ALTERNANCE_OPTION = "Demande d’alternance";

export function RecruitmentApplicationForm({
  openings,
  defaultPoste,
}: RecruitmentApplicationFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileNames, setSelectedFileNames] = useState<string[]>([]);

  const posteOptions = [...openings, STAGE_OPTION, ALTERNANCE_OPTION];
  const initialPoste = defaultPoste || STAGE_OPTION;

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFileError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("cv") as HTMLInputElement;
    const files = Array.from(fileInput.files ?? []);

    if (files.length === 0) {
      setFileError("Merci de joindre votre CV.");
      return;
    }

    if (files.length > MAX_ATTACHMENTS) {
      setFileError(
        `Vous pouvez joindre jusqu’à ${MAX_ATTACHMENTS} fichiers (CV, lettre, convention de stage…).`,
      );
      return;
    }

    for (const file of files) {
      if (!ACCEPTED_CV_TYPES.includes(file.type)) {
        setFileError("Format accepté : PDF, DOC ou DOCX pour chaque pièce jointe.");
        return;
      }
      if (file.size > MAX_CV_SIZE_MB * 1024 * 1024) {
        setFileError(`Chaque fichier doit peser moins de ${MAX_CV_SIZE_MB} Mo.`);
        return;
      }
    }

    setStatus("submitting");
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      form.reset();
      setSelectedFileNames([]);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <div className="grid gap-7 sm:grid-cols-2">
        <UnderlineField
          label="Nom et prénom"
          name="name"
          required
          labelClass={authLabelClassName}
          fieldClass={authFieldClassName}
        />
        <UnderlineField
          label="Téléphone"
          name="phone"
          type="tel"
          labelClass={authLabelClassName}
          fieldClass={authFieldClassName}
        />
        <UnderlineField
          label="Email"
          name="email"
          type="email"
          required
          labelClass={authLabelClassName}
          fieldClass={authFieldClassName}
        />
        <UnderlineField
          label="Poste visé"
          name="poste"
          required
          labelClass={authLabelClassName}
          fieldClass={authFieldClassName}
          as="select"
          defaultValue={initialPoste}
        >
          {posteOptions.map((role) => (
            <option key={role} value={role}>
              {role}
            </option>
          ))}
          {defaultPoste && !posteOptions.includes(defaultPoste) ? (
            <option value={defaultPoste}>{defaultPoste}</option>
          ) : null}
        </UnderlineField>
      </div>

      <label className="flex flex-col gap-3">
        <span className={authLabelClassName}>
          CV & pièces jointes <span aria-hidden="true">*</span>
        </span>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            name="cv"
            required
            multiple
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={cn(
              authFieldClassName,
              "cursor-pointer file:mr-4 file:border-0 file:bg-transparent file:text-sm file:tracking-wide file:text-[var(--ink)]",
            )}
            onChange={(event) => {
              setFileError(null);
              const files = Array.from(event.target.files ?? []);
              setSelectedFileNames(files.map((file) => file.name));
            }}
          />
          <p className="text-xs text-[var(--ink-muted)]">
            CV, lettre de motivation, convention de stage… PDF, DOC ou DOCX —{" "}
            {MAX_CV_SIZE_MB} Mo par fichier, {MAX_ATTACHMENTS} fichiers max.
          </p>
          {selectedFileNames.length > 0 ? (
            <ul className="mt-1 flex flex-col gap-1 text-xs text-[var(--ink)]">
              {selectedFileNames.map((name) => (
                <li key={name} className="flex items-start gap-2">
                  <span
                    aria-hidden="true"
                    className="mt-2 h-px w-3 bg-[var(--accent)] shrink-0"
                  />
                  <span className="break-all">{name}</span>
                </li>
              ))}
            </ul>
          ) : null}
          {fileError ? (
            <p className="text-xs text-[var(--accent)]" role="alert">
              {fileError}
            </p>
          ) : null}
        </div>
      </label>

      <label className="flex flex-col gap-3">
        <span className={authLabelClassName}>
          Message <span aria-hidden="true">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={6}
          placeholder="Présentez brièvement votre parcours, votre expérience et ce qui vous motive à rejoindre IMPLANTOLAB."
          className={cn(authFieldClassName, "resize-none border rounded-none p-4 border-b")}
          style={{ borderBottomWidth: "1px" }}
        />
      </label>

      <label className="flex gap-3 items-start text-xs leading-relaxed">
        <input
          type="checkbox"
          name="rgpd"
          required
          className={cn(
            "mt-0.5 h-5 w-5 shrink-0 appearance-none border bg-transparent transition-colors",
            "border-[var(--line-strong)] checked:bg-[var(--ink)] checked:border-[var(--ink)]",
          )}
        />
        <span className="text-[var(--ink-muted)]">
          J’accepte que les informations transmises, y compris mon CV, soient
          utilisées dans le cadre de ma candidature, conformément à notre
          politique de confidentialité.
        </span>
      </label>

      <div className="flex flex-wrap items-center gap-6 pt-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-wide transition-colors border",
            "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
            status === "submitting" && "opacity-60 cursor-wait",
          )}
        >
          {status === "submitting" ? "Envoi…" : "Envoyer ma candidature"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path
              d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
              stroke="currentColor"
              strokeWidth="1.2"
              strokeLinecap="square"
            />
          </svg>
        </button>

        <p
          role="status"
          aria-live="polite"
          className="text-xs text-[var(--ink-muted)]"
        >
          {status === "success"
            ? "Merci, votre candidature a bien été envoyée. Nous revenons vers vous rapidement."
            : status === "error"
              ? "Une erreur est survenue. Merci de réessayer ou de nous écrire par email."
              : "Réponse sous 1 semaine ouvrée."}
        </p>
      </div>
    </form>
  );
}
