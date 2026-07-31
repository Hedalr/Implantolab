"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import { buildMailtoBody, buildMailtoHref, readFormText } from "@/lib/mailto";
import { site } from "@/content/fr/site";
import { UnderlineField } from "@/components/ui/UnderlineField";

type ContactFormProps = {
  theme?: "light" | "dark";
  compact?: boolean;
};

/** Le libellé sert à la fois d'option et d'objet de l'email : une seule source. */
const SUBJECTS = [
  "Catalogue & tarifs",
  "Demande de rendez-vous",
  "Demande de devis",
  "Autre",
] as const;

export function ContactForm({ theme = "light", compact = false }: ContactFormProps) {
  const [opened, setOpened] = useState(false);

  const dark = theme === "dark";

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = readFormText(data, "name");
    const subject = readFormText(data, "subject");

    window.location.href = buildMailtoHref({
      to: site.contact.email,
      subject: name ? `${subject} — ${name}` : subject,
      body: buildMailtoBody(
        data,
        [
          { label: "Nom du praticien", name: "name" },
          { label: "Cabinet", name: "cabinet" },
          { label: "Email", name: "email" },
          { label: "Téléphone", name: "phone" },
        ],
        readFormText(data, "message"),
      ),
    });

    setOpened(true);
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
      defaultValue={SUBJECTS[0]}
    >
      {SUBJECTS.map((subject) => (
        <option key={subject} value={subject}>
          {subject}
        </option>
      ))}
    </UnderlineField>
  );

  return (
    <form
      onSubmit={handleSubmit}
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
          // Au-delà, le lien `mailto:` dépasse la limite d'URL de certains
          // clients mail et le message arrive tronqué sans erreur visible.
          maxLength={1200}
          placeholder="Précisez votre besoin : catalogue, tarifs, rendez-vous…"
          className={cn(fieldBase, "resize-none min-h-[7rem]")}
        />
      </label>

      <p
        className={cn(
          "text-xs leading-relaxed",
          dark ? "text-[var(--ink-invert-muted)]" : "text-[var(--ink-muted)]",
        )}
      >
        Ce formulaire ouvre votre messagerie avec un message pré-rempli
        adressé à{" "}
        <a
          href={`mailto:${site.contact.email}`}
          className="underline underline-offset-4 hover:text-[var(--accent)] transition-colors break-all"
        >
          {site.contact.email}
        </a>{" "}
        : aucune donnée n’est enregistrée sur ce site. Votre demande est
        ensuite traitée conformément à notre{" "}
        <Link
          href="/confidentialite"
          className="underline underline-offset-4 hover:text-[var(--accent)] transition-colors"
        >
          politique de confidentialité
        </Link>
        .
      </p>

      <div className="flex flex-wrap items-center gap-5 pt-1">
        <button
          type="submit"
          className={cn(
            "inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-wide transition-colors border",
            dark
              ? "bg-[var(--bg)] text-[var(--ink)] border-[var(--bg)] hover:bg-[var(--accent-warm-soft)] hover:border-[var(--accent-warm-soft)]"
              : "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
          )}
        >
          Prendre contact
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
          {opened
            ? `Votre messagerie s’est ouverte avec le message pré-rempli. Si rien ne se passe, écrivez-nous à ${site.contact.email}.`
            : "Réponse sous 1 jour ouvré."}
        </p>
      </div>
    </form>
  );
}
