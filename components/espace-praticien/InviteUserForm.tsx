"use client";

import { useState } from "react";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LabSector } from "@/lib/sectors";
import { invitePractitioner } from "@/app/espace-praticien/admin/praticiens/actions";

type PracticeOption = {
  id: string;
  name: string;
  city: string | null;
};

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

export function InviteUserForm({
  practices,
  sectors,
  canInvite,
}: {
  practices: PracticeOption[];
  sectors: LabSector[];
  canInvite: boolean;
}) {
  const [role, setRole] = useState<"practitioner" | "prosthetist">(
    "practitioner",
  );

  return (
    <form action={invitePractitioner} className="mt-5 flex flex-col gap-5">
      <fieldset className="flex flex-col gap-2">
        <legend className="text-eyebrow mb-1">Type de compte *</legend>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="role"
            value="practitioner"
            checked={role === "practitioner"}
            onChange={() => setRole("practitioner")}
            disabled={!canInvite}
            className="mt-1 accent-[var(--accent-warm)]"
          />
          <span className="flex flex-col">
            <span className="text-sm text-[var(--ink)]">
              Praticien (dentiste)
            </span>
            <span className="text-xs text-[var(--ink-discreet)]">
              Accès à ses fermetures et demandes, rattaché à un cabinet.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="role"
            value="prosthetist"
            checked={role === "prosthetist"}
            onChange={() => setRole("prosthetist")}
            disabled={!canInvite}
            className="mt-1 accent-[var(--accent-warm)]"
          />
          <span className="flex flex-col">
            <span className="text-sm text-[var(--ink)]">
              Prothésiste (collaborateur labo)
            </span>
            <span className="text-xs text-[var(--ink-discreet)]">
              Accès aux demandes du secteur choisi. Aucun cabinet à sélectionner.
            </span>
          </span>
        </label>
      </fieldset>

      <Field label="E-mail" htmlFor="invite-email" required>
        <input
          id="invite-email"
          name="email"
          type="email"
          required
          disabled={!canInvite}
          placeholder="dr.martin@cabinet.fr"
          className={inputStyle}
        />
      </Field>
      <Field label="Nom complet" htmlFor="invite-name">
        <input
          id="invite-name"
          name="full_name"
          disabled={!canInvite}
          placeholder="Dr. Jean Martin"
          className={inputStyle}
        />
      </Field>

      {role === "practitioner" ? (
        <Field label="Cabinet" htmlFor="invite-practice" required>
          <select
            id="invite-practice"
            name="practice_id"
            required
            disabled={!canInvite || practices.length === 0}
            className={cn(inputStyle, "cursor-pointer")}
            defaultValue=""
          >
            <option value="">
              {practices.length === 0
                ? "Créez d’abord un cabinet"
                : "Sélectionner un cabinet"}
            </option>
            {practices.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
                {p.city ? ` — ${p.city}` : ""}
              </option>
            ))}
          </select>
        </Field>
      ) : (
        <Field label="Secteur" htmlFor="invite-sector" required>
          <select
            id="invite-sector"
            name="sector_id"
            required
            disabled={!canInvite || sectors.length === 0}
            className={cn(inputStyle, "cursor-pointer")}
            defaultValue=""
          >
            <option value="">
              {sectors.length === 0
                ? "Aucun secteur disponible"
                : "Sélectionner un secteur"}
            </option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </Field>
      )}

      <Button type="submit" variant="primary" disabled={!canInvite}>
        Envoyer l’invitation
      </Button>
    </form>
  );
}

function Field({
  label,
  htmlFor,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  required?: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-eyebrow">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
    </div>
  );
}
