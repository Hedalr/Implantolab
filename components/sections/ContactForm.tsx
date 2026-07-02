"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";

type ContactFormProps = {
  theme?: "light" | "dark";
  compact?: boolean;
};

type Status = "idle" | "submitting" | "success" | "error";

export function ContactForm({ theme = "light", compact = false }: ContactFormProps) {
  const [status, setStatus] = useState<Status>("idle");

  const dark = theme === "dark";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setStatus("submitting");
    try {
      await new Promise((resolve) => setTimeout(resolve, 600));
      const form = event.currentTarget;
      form.reset();
      setStatus("success");
    } catch {
      setStatus("error");
    }
  }

  const fieldBase = cn(
    "w-full bg-transparent border-b py-3 text-base transition-colors",
    "placeholder:text-[var(--ink-discreet)] focus:outline-none",
    dark
      ? "text-[var(--ink-invert)] border-[var(--line-invert)] focus:border-[var(--accent-warm-soft)]"
      : "text-[var(--ink)] border-[var(--line-strong)] focus:border-[var(--ink)]",
  );

  const labelBase = cn(
    "text-eyebrow",
    dark ? "text-[var(--ink-invert-muted)]" : "text-[var(--ink-discreet)]",
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn(
        "flex flex-col gap-7",
        dark ? "" : "",
      )}
    >
      <div className="grid gap-7 sm:grid-cols-2">
        <Field label="Nom du praticien" name="name" required labelClass={labelBase} fieldClass={fieldBase} />
        <Field label="Cabinet" name="cabinet" labelClass={labelBase} fieldClass={fieldBase} />
        <Field
          label="Email"
          name="email"
          type="email"
          required
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        {!compact ? (
          <Field
            label="Téléphone"
            name="phone"
            type="tel"
            labelClass={labelBase}
            fieldClass={fieldBase}
          />
        ) : null}
      </div>

      {!compact ? (
        <Field
          label="Sujet"
          name="subject"
          labelClass={labelBase}
          fieldClass={fieldBase}
          as="select"
        >
          <option value="devis">Demande de devis</option>
          <option value="technique">Question technique</option>
          <option value="autre">Autre</option>
        </Field>
      ) : null}

      <label className="flex flex-col gap-3">
        <span className={labelBase}>Message</span>
        <textarea
          name="message"
          required
          rows={compact ? 4 : 6}
          placeholder="Décrivez votre cas, votre besoin ou votre question."
          className={cn(fieldBase, "resize-none border rounded-none p-4 border-b")}
          style={{ borderBottomWidth: "1px" }}
        />
      </label>

      {!compact ? (
        <label className="flex gap-3 items-start text-xs leading-relaxed">
          <input
            type="checkbox"
            name="rgpd"
            required
            className={cn(
              "mt-1 h-4 w-4 shrink-0 appearance-none border bg-transparent transition-colors",
              dark
                ? "border-[var(--line-invert)] checked:bg-[var(--accent-warm-soft)] checked:border-[var(--accent-warm-soft)]"
                : "border-[var(--line-strong)] checked:bg-[var(--ink)] checked:border-[var(--ink)]",
            )}
          />
          <span
            className={cn(
              dark
                ? "text-[var(--ink-invert-muted)]"
                : "text-[var(--ink-muted)]",
            )}
          >
            J’accepte que les informations transmises soient utilisées dans le
            cadre de ma demande de contact, conformément à notre politique de
            confidentialité.
          </span>
        </label>
      ) : null}

      <div className="flex flex-wrap items-center gap-6 pt-2">
        <button
          type="submit"
          disabled={status === "submitting"}
          className={cn(
            "inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-wide transition-colors border",
            dark
              ? "bg-[var(--bg)] text-[var(--ink)] border-[var(--bg)] hover:bg-[var(--accent-warm-soft)] hover:border-[var(--accent-warm-soft)]"
              : "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
            status === "submitting" && "opacity-60 cursor-wait",
          )}
        >
          {status === "submitting" ? "Envoi…" : "Envoyer la demande"}
          <svg width="14" height="14" viewBox="0 0 14 14" fill="none" aria-hidden="true">
            <path d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5" stroke="currentColor" strokeWidth="1.2" strokeLinecap="square" />
          </svg>
        </button>

        <p
          role="status"
          aria-live="polite"
          className={cn(
            "text-xs",
            dark ? "text-[var(--ink-invert-muted)]" : "text-[var(--ink-muted)]",
          )}
        >
          {status === "success"
            ? "Merci, votre message a bien été envoyé. Nous revenons vers vous rapidement."
            : status === "error"
              ? "Une erreur est survenue. Merci de réessayer ou de nous contacter par téléphone."
              : "Réponse sous 1 jour ouvré."}
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
  children,
}: FieldProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className={labelClass}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {as === "select" ? (
        <select name={name} required={required} className={fieldClass}>
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
  if (name === "cabinet") return "organization";
  return undefined;
}
