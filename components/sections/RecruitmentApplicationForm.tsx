"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";

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

export function RecruitmentApplicationForm({
  openings,
  defaultPoste,
}: RecruitmentApplicationFormProps) {
  const [status, setStatus] = useState<Status>("idle");
  const [fileError, setFileError] = useState<string | null>(null);
  const [selectedFileName, setSelectedFileName] = useState<string | null>(null);

  const posteOptions = [...openings, "Candidature spontanée"];
  const initialPoste =
    defaultPoste && posteOptions.includes(defaultPoste)
      ? defaultPoste
      : defaultPoste
        ? defaultPoste
        : "Candidature spontanée";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setFileError(null);

    const form = event.currentTarget;
    const fileInput = form.elements.namedItem("cv") as HTMLInputElement;
    const file = fileInput.files?.[0];

    if (!file) {
      setFileError("Merci de joindre votre CV.");
      return;
    }

    if (!ACCEPTED_CV_TYPES.includes(file.type)) {
      setFileError("Format accepté : PDF, DOC ou DOCX.");
      return;
    }

    if (file.size > MAX_CV_SIZE_MB * 1024 * 1024) {
      setFileError(`Le fichier ne doit pas dépasser ${MAX_CV_SIZE_MB} Mo.`);
      return;
    }

    setStatus("submitting");
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      form.reset();
      setSelectedFileName(null);
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const fieldBase = cn(
    "w-full bg-transparent border-b py-3 text-base transition-colors",
    "placeholder:text-[var(--ink-discreet)] focus:outline-none",
    "text-[var(--ink)] border-[var(--line-strong)] focus:border-[var(--ink)]",
  );

  const labelBase = "text-eyebrow text-[var(--ink-discreet)]";

  return (
    <form onSubmit={handleSubmit} noValidate className="flex flex-col gap-7">
      <div className="grid gap-7 sm:grid-cols-2">
        <Field
          label="Nom et prénom"
          name="name"
          required
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        <Field
          label="Téléphone"
          name="phone"
          type="tel"
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        <Field
          label="Poste visé"
          name="poste"
          required
          labelClass={labelBase}
          fieldClass={fieldBase}
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
        </Field>
      </div>

      <label className="flex flex-col gap-3">
        <span className={labelBase}>
          CV <span aria-hidden="true">*</span>
        </span>
        <div className="flex flex-col gap-2">
          <input
            type="file"
            name="cv"
            required
            accept=".pdf,.doc,.docx,application/pdf,application/msword,application/vnd.openxmlformats-officedocument.wordprocessingml.document"
            className={cn(
              fieldBase,
              "cursor-pointer file:mr-4 file:border-0 file:bg-transparent file:text-sm file:tracking-wide file:text-[var(--ink)]",
            )}
            onChange={(event) => {
              setFileError(null);
              const file = event.target.files?.[0];
              setSelectedFileName(file?.name ?? null);
            }}
          />
          <p className="text-xs text-[var(--ink-muted)]">
            PDF, DOC ou DOCX — {MAX_CV_SIZE_MB} Mo maximum
            {selectedFileName ? (
              <span className="block mt-1 text-[var(--ink)]">{selectedFileName}</span>
            ) : null}
          </p>
          {fileError ? (
            <p className="text-xs text-[var(--accent-warm)]" role="alert">
              {fileError}
            </p>
          ) : null}
        </div>
      </label>

      <label className="flex flex-col gap-3">
        <span className={labelBase}>
          Message <span aria-hidden="true">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={6}
          placeholder="Présentez brièvement votre parcours, votre expérience et ce qui vous motive à rejoindre IMPLANTOLAB."
          className={cn(fieldBase, "resize-none border rounded-none p-4 border-b")}
          style={{ borderBottomWidth: "1px" }}
        />
      </label>

      <label className="flex gap-3 items-start text-xs leading-relaxed">
        <input
          type="checkbox"
          name="rgpd"
          required
          className={cn(
            "mt-1 h-4 w-4 shrink-0 appearance-none border bg-transparent transition-colors",
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

type FieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  labelClass: string;
  fieldClass: string;
  as?: "input" | "select";
  defaultValue?: string;
  children?: React.ReactNode;
};

function Field({
  label,
  name,
  type = "text",
  required,
  labelClass,
  fieldClass,
  as = "input",
  defaultValue,
  children,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className={labelClass}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {as === "select" ? (
        <select
          name={name}
          required={required}
          defaultValue={defaultValue}
          className={fieldClass}
        >
          {children}
        </select>
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          autoComplete={autoCompleteFor(name, type)}
          className={fieldClass}
        />
      )}
    </label>
  );
}

function autoCompleteFor(name: string, type: string): string | undefined {
  if (type === "email") return "email";
  if (type === "tel") return "tel";
  if (name === "name") return "name";
  return undefined;
}
