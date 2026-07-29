"use client";

import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { UnderlineField } from "@/components/ui/UnderlineField";

type ContactFormProps = {
  theme?: "light" | "dark";
  compact?: boolean;
};

type Status = "idle" | "submitting" | "success";

export function ContactForm({ theme = "light", compact = false }: ContactFormProps) {
  const [status, setStatus] = useState<Status>("idle");

  const dark = theme === "dark";

  async function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const form = event.currentTarget;
    setStatus("submitting");
    await new Promise((resolve) => setTimeout(resolve, 600));
    form.reset();
    setStatus("success");
  }

  const fieldBase = cn(
    "w-full border-0 border-b bg-transparent py-3 text-base transition-colors",
    "rounded-none shadow-none outline-none focus:outline-none",
    "placeholder:text-[var(--ink-discreet)]",
    dark
      ? "text-[var(--ink-invert)] border-[var(--line-invert)] focus:border-[var(--accent-warm-soft)]"
      : "text-[var(--ink)] border-[var(--line-strong)] focus:border-[var(--ink)]",
  );

  const labelBase = cn(
    "text-eyebrow",
    dark ? "text-[var(--ink-invert-muted)]" : "text-[var(--ink-discreet)]",
  );

  const subjectField = (
    <UnderlineField
      label="Sujet"
      name="subject"
      labelClass={labelBase}
      fieldClass={fieldBase}
      as="select"
      defaultValue="catalogue"
    >
      <option value="catalogue">Catalogue & tarifs</option>
      <option value="rdv">Demande de rendez-vous</option>
      <option value="devis">Demande de devis</option>
      <option value="autre">Autre</option>
    </UnderlineField>
  );

  return (
    <form
      onSubmit={handleSubmit}
      noValidate
      className={cn("flex flex-col gap-8", dark && "form-on-deep")}
    >
      <div className="grid gap-8 sm:grid-cols-2">
        <UnderlineField
          label="Nom du praticien"
          name="name"
          required
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        <UnderlineField
          label="Cabinet"
          name="cabinet"
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        <UnderlineField
          label="Email"
          name="email"
          type="email"
          required
          labelClass={labelBase}
          fieldClass={fieldBase}
        />
        {compact ? (
          subjectField
        ) : (
          <UnderlineField
            label="Téléphone"
            name="phone"
            type="tel"
            labelClass={labelBase}
            fieldClass={fieldBase}
          />
        )}
      </div>

      {!compact ? subjectField : null}

      <label className="flex flex-col gap-3">
        <span className={labelBase}>Message</span>
        <textarea
          name="message"
          required
          rows={compact ? 4 : 6}
          placeholder="Précisez votre besoin : catalogue, tarifs, rendez-vous…"
          className={cn(fieldBase, "resize-none min-h-[7rem]")}
        />
      </label>

      {!compact ? (
        <label className="flex gap-3 items-start text-xs leading-relaxed">
          <input
            type="checkbox"
            name="rgpd"
            required
            className={cn(
              "mt-0.5 h-5 w-5 shrink-0 appearance-none border bg-transparent transition-colors",
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

      <div className="flex flex-wrap items-center gap-5 pt-1">
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
          {status === "submitting" ? "Envoi…" : "Prendre contact"}
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
            : "Réponse sous 1 jour ouvré."}
        </p>
      </div>
    </form>
  );
}
