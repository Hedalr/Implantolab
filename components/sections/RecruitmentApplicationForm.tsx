"use client";

import Link from "next/link";
import { useState, type FormEvent } from "react";
import { cn } from "@/lib/cn";
import {
  authFieldClassName,
  authLabelClassName,
} from "@/components/auth/authFormStyles";
import { buildMailtoBody, buildMailtoHref, readFormText } from "@/lib/mailto";
import { site } from "@/content/fr/site";
import { UnderlineField } from "@/components/ui/UnderlineField";

type RecruitmentApplicationFormProps = {
  openings: string[];
  defaultPoste?: string;
};

const STAGE_OPTION = "Demande de stage";
const ALTERNANCE_OPTION = "Demande d’alternance";

export function RecruitmentApplicationForm({
  openings,
  defaultPoste,
}: RecruitmentApplicationFormProps) {
  const [opened, setOpened] = useState(false);

  const posteOptions = [...openings, STAGE_OPTION, ALTERNANCE_OPTION];
  const initialPoste = defaultPoste || STAGE_OPTION;

  function handleSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    const data = new FormData(event.currentTarget);
    const name = readFormText(data, "name");
    const poste = readFormText(data, "poste");

    window.location.href = buildMailtoHref({
      to: site.contact.email,
      subject: `Candidature — ${poste}${name ? ` — ${name}` : ""}`,
      body: buildMailtoBody(
        data,
        [
          { label: "Nom et prénom", name: "name" },
          { label: "Email", name: "email" },
          { label: "Téléphone", name: "phone" },
          { label: "Poste visé", name: "poste" },
        ],
        `${readFormText(data, "message")}\n\n(Pensez à joindre votre CV et vos pièces jointes à cet email.)`,
      ),
    });

    setOpened(true);
  }

  return (
    <form onSubmit={handleSubmit} className="flex flex-col gap-7">
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
          Message <span aria-hidden="true">*</span>
        </span>
        <textarea
          name="message"
          required
          rows={6}
          // Au-delà, le lien `mailto:` dépasse la limite d'URL de certains
          // clients mail et le message arrive tronqué sans erreur visible.
          maxLength={1200}
          placeholder="Présentez brièvement votre parcours, votre expérience et ce qui vous motive à rejoindre IMPLANTOLAB."
          className={cn(authFieldClassName, "resize-none border rounded-none p-4 border-b")}
          style={{ borderBottomWidth: "1px" }}
        />
      </label>

      <div className="flex flex-col gap-3 border-t border-[var(--line)] pt-5 text-xs leading-relaxed text-[var(--ink-muted)]">
        <p>
          <span className="text-[var(--ink)]">CV & pièces jointes :</span> ce
          formulaire ouvre votre messagerie avec une candidature pré-remplie
          adressée à{" "}
          <a
            href={`mailto:${site.contact.email}`}
            className="underline underline-offset-4 hover:text-[var(--accent)] transition-colors break-all"
          >
            {site.contact.email}
          </a>
          . Joignez-y votre CV et vos éventuelles pièces jointes (PDF de
          préférence) avant de l’envoyer.
        </p>
        <p>
          Aucune donnée n’est enregistrée sur ce site. Votre candidature est
          traitée conformément à notre{" "}
          <Link
            href="/confidentialite"
            className="underline underline-offset-4 hover:text-[var(--accent)] transition-colors"
          >
            politique de confidentialité
          </Link>
          .
        </p>
      </div>

      <div className="flex flex-wrap items-center gap-6 pt-2">
        <button
          type="submit"
          className="inline-flex items-center gap-3 px-7 py-3.5 text-sm tracking-wide transition-colors border bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]"
        >
          Préparer ma candidature
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
          {opened
            ? `Votre messagerie s’est ouverte : joignez votre CV puis envoyez. Si rien ne se passe, écrivez-nous à ${site.contact.email}.`
            : "Réponse sous 1 semaine ouvrée."}
        </p>
      </div>
    </form>
  );
}
