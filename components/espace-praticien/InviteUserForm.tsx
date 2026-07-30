"use client";

import { useState } from "react";
import { useFormStatus } from "react-dom";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import type { LabSector } from "@/lib/sectors";
import { isSectorLabRole, type InviteRole } from "@/lib/roles";
import { invitePractitioner } from "@/app/espace-praticien/admin/praticiens/actions";

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

export function InviteUserForm({
  sectors,
  canInvite,
}: {
  sectors: LabSector[];
  canInvite: boolean;
}) {
  const [role, setRole] = useState<InviteRole>("practitioner");
  const needsSector = isSectorLabRole(role);

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
              Accès à ses fermetures et demandes.
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
              Accès aux demandes du secteur choisi.
            </span>
          </span>
        </label>
        <label className="flex items-start gap-3 cursor-pointer">
          <input
            type="radio"
            name="role"
            value="chef_de_secteur"
            checked={role === "chef_de_secteur"}
            onChange={() => setRole("chef_de_secteur")}
            disabled={!canInvite}
            className="mt-1 accent-[var(--accent-warm)]"
          />
          <span className="flex flex-col">
            <span className="text-sm text-[var(--ink)]">Chef de secteur</span>
            <span className="text-xs text-[var(--ink-discreet)]">
              Questions/urgences et file labo du secteur choisi.
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
          placeholder="dr.martin@exemple.fr"
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

      {needsSector ? (
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
      ) : null}

      <InviteSubmitButton canInvite={canInvite} />
    </form>
  );
}

function InviteSubmitButton({ canInvite }: { canInvite: boolean }) {
  const { pending } = useFormStatus();
  return (
    <Button type="submit" variant="primary" disabled={!canInvite || pending}>
      {pending ? "Envoi en cours…" : "Envoyer l’invitation"}
    </Button>
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
