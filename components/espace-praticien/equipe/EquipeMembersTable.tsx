"use client";

import { useMemo, useState } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";
import { roleLabel, type SectorLabRole } from "@/lib/roles";
import { equipeHref } from "@/lib/equipe";
import {
  updateEmployeeLeaveBalance,
  updateEmployeeSector,
} from "@/app/espace-praticien/admin/employes/actions";
import {
  deletePractitioner,
  resendInvite,
} from "@/app/espace-praticien/admin/praticiens/actions";
import { ConfirmFormButton } from "@/components/espace-praticien/ConfirmFormButton";

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-1.5 text-sm text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

export type EquipeMember = {
  id: string;
  fullName: string | null;
  email: string | null;
  role: SectorLabRole;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  leaveBalanceDays: number;
  usedDays: number;
  invitePending?: boolean;
};

export type EquipeSectorOption = {
  id: string;
  name: string;
  color: string;
};

type RowAction = "sector" | "balance";

export function EquipeMembersTable({
  members,
  sectors,
}: {
  members: EquipeMember[];
  sectors: EquipeSectorOption[];
}) {
  const [query, setQuery] = useState("");
  const [sectorFilter, setSectorFilter] = useState("all");
  const [roleFilter, setRoleFilter] = useState("all");
  const [openAction, setOpenAction] = useState<{
    id: string;
    action: RowAction;
  } | null>(null);

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    return members.filter((m) => {
      if (sectorFilter === "none" && m.sectorId) return false;
      if (
        sectorFilter !== "all" &&
        sectorFilter !== "none" &&
        m.sectorId !== sectorFilter
      ) {
        return false;
      }
      if (roleFilter !== "all" && m.role !== roleFilter) return false;
      if (!q) return true;
      const hay = `${m.fullName ?? ""} ${m.email ?? ""}`.toLowerCase();
      return hay.includes(q);
    });
  }, [members, query, sectorFilter, roleFilter]);

  return (
    <div className="flex flex-col gap-5">
      <div className="flex flex-col gap-3 sm:flex-row sm:flex-wrap sm:items-end">
        <label className="flex flex-1 flex-col gap-1 min-w-48">
          <span className="text-eyebrow text-[10px]">Recherche</span>
          <input
            type="search"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder="Nom ou e-mail"
            className={inputStyle}
          />
        </label>
        <label className="flex flex-col gap-1 min-w-36">
          <span className="text-eyebrow text-[10px]">Secteur</span>
          <select
            value={sectorFilter}
            onChange={(e) => setSectorFilter(e.target.value)}
            className={cn(inputStyle, "cursor-pointer")}
          >
            <option value="all">Tous</option>
            <option value="none">Non classés</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </select>
        </label>
        <label className="flex flex-col gap-1 min-w-36">
          <span className="text-eyebrow text-[10px]">Rôle</span>
          <select
            value={roleFilter}
            onChange={(e) => setRoleFilter(e.target.value)}
            className={cn(inputStyle, "cursor-pointer")}
          >
            <option value="all">Tous</option>
            <option value="prosthetist">Prothésiste</option>
            <option value="chef_de_secteur">Chef de secteur</option>
          </select>
        </label>
      </div>

      {filtered.length === 0 ? (
        <p className="py-8 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
          {members.length === 0
            ? "Aucun membre labo pour le moment. Invitez un prothésiste ou un chef de secteur."
            : "Aucun résultat pour ces filtres."}
        </p>
      ) : (
        <div className="overflow-x-auto border-t border-[var(--line)]">
          <table className="w-full min-w-[640px] text-left">
            <thead>
              <tr className="border-b border-[var(--line)] text-eyebrow text-[10px]">
                <th className="py-3 pr-4 font-normal">Nom</th>
                <th className="py-3 pr-4 font-normal">Rôle</th>
                <th className="py-3 pr-4 font-normal">Secteur</th>
                <th className="py-3 pr-4 font-normal">Solde</th>
                <th className="py-3 font-normal text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--line)]">
              {filtered.map((m) => {
                const remaining = Math.max(m.leaveBalanceDays - m.usedDays, 0);
                const isSectorOpen =
                  openAction?.id === m.id && openAction.action === "sector";
                const isBalanceOpen =
                  openAction?.id === m.id && openAction.action === "balance";
                return (
                  <tr key={m.id} className="align-top">
                    <td className="py-4 pr-4">
                      <p className="text-[var(--ink)]">
                        {m.fullName ?? "Sans nom"}
                      </p>
                      <p className="text-xs text-[var(--ink-discreet)] break-all">
                        {m.email ?? "E-mail non disponible"}
                      </p>
                    </td>
                    <td className="py-4 pr-4 text-sm text-[var(--ink-muted)]">
                      {roleLabel(m.role)}
                    </td>
                    <td className="py-4 pr-4">
                      <span className="inline-flex items-center gap-2 text-sm text-[var(--ink-muted)]">
                        <span
                          aria-hidden="true"
                          className="inline-block h-2.5 w-2.5 shrink-0 border border-[var(--line-strong)]"
                          style={{
                            backgroundColor: m.sectorColor ?? "transparent",
                          }}
                        />
                        {m.sectorName ?? "Non classé"}
                      </span>
                      {isSectorOpen ? (
                        <form
                          action={updateEmployeeSector}
                          className="mt-3 flex items-center gap-2"
                        >
                          <input type="hidden" name="profile_id" value={m.id} />
                          <select
                            name="sector_id"
                            defaultValue={m.sectorId ?? ""}
                            className={cn(inputStyle, "cursor-pointer max-w-48")}
                          >
                            <option value="">— Non classé —</option>
                            {sectors.map((s) => (
                              <option key={s.id} value={s.id}>
                                {s.name}
                              </option>
                            ))}
                          </select>
                          <button
                            type="submit"
                            className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)]"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenAction(null)}
                            className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--ink)]"
                          >
                            Annuler
                          </button>
                        </form>
                      ) : null}
                    </td>
                    <td className="py-4 pr-4 text-sm text-[var(--ink-muted)]">
                      <span className="text-numeral">
                        {remaining} / {m.leaveBalanceDays} j
                      </span>
                      <p className="text-xs text-[var(--ink-discreet)]">
                        {m.usedDays} utilisé{m.usedDays > 1 ? "s" : ""}
                      </p>
                      {isBalanceOpen ? (
                        <form
                          action={updateEmployeeLeaveBalance}
                          className="mt-3 flex items-center gap-2"
                        >
                          <input type="hidden" name="profile_id" value={m.id} />
                          <input
                            name="leave_balance_days"
                            type="number"
                            min={0}
                            max={365}
                            step={1}
                            defaultValue={m.leaveBalanceDays}
                            className={cn(inputStyle, "w-20 text-numeral")}
                          />
                          <button
                            type="submit"
                            className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)]"
                          >
                            OK
                          </button>
                          <button
                            type="button"
                            onClick={() => setOpenAction(null)}
                            className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--ink)]"
                          >
                            Annuler
                          </button>
                        </form>
                      ) : null}
                    </td>
                    <td className="py-4 text-right">
                      <div className="inline-flex flex-col items-end gap-2">
                        {m.invitePending ? (
                          <form action={resendInvite}>
                            <input
                              type="hidden"
                              name="profile_id"
                              value={m.id}
                            />
                            <input
                              type="hidden"
                              name="return_path"
                              value={equipeHref("membres")}
                            />
                            <button
                              type="submit"
                              className="text-xs tracking-wide uppercase text-[var(--ink)] hover:text-[var(--accent-warm)]"
                            >
                              Renvoyer l’invitation
                            </button>
                          </form>
                        ) : null}
                        <button
                          type="button"
                          onClick={() =>
                            setOpenAction(
                              isSectorOpen
                                ? null
                                : { id: m.id, action: "sector" },
                            )
                          }
                          className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)]"
                        >
                          Secteur
                        </button>
                        <button
                          type="button"
                          onClick={() =>
                            setOpenAction(
                              isBalanceOpen
                                ? null
                                : { id: m.id, action: "balance" },
                            )
                          }
                          className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)]"
                        >
                          Solde
                        </button>
                        <Link
                          href={equipeHref("conges")}
                          className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)]"
                        >
                          Congés
                        </Link>
                        <ConfirmFormButton
                          action={deletePractitioner}
                          hiddenFields={{
                            profile_id: m.id,
                            return_path: equipeHref("membres"),
                          }}
                          confirmTitle={`Désactiver ${m.fullName ?? "ce membre"} ?`}
                          confirmMessage="Il n’aura plus accès ; son historique est conservé et vous pourrez le réactiver."
                          className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)]"
                        >
                          Désactiver
                        </ConfirmFormButton>
                      </div>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
