import type { Metadata } from "next";
import { Container } from "@/components/ui/Container";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { SECTOR_LAB_ROLES } from "@/lib/roles";
import { firstRelation } from "@/lib/supabase/relation";
import { equipeHref } from "@/lib/equipe";
import {
  EquipeLeavesPanel,
  EquipeLeaveFeedback,
  mapLeaveRows,
  type EquipeLeaveEmployee,
  type LeaveRequestDbRow,
} from "@/components/espace-praticien/equipe/EquipeLeavesPanel";

export const metadata: Metadata = {
  title: "Congés employés — Espace praticien",
  robots: { index: false, follow: false },
};

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string }>;

type EmployeeRow = {
  id: string;
  full_name: string | null;
  sector_id: string | null;
  sectors: { name: string | null; color: string | null } | null;
};

export default async function AdminCongesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;

  const supabase = await getServerSupabase();

  const [{ data: employeesData }, { data: leavesData }] = await Promise.all([
    supabase
      .from("profiles")
      .select("id, full_name, sector_id, sectors ( name, color )")
      .in("role", [...SECTOR_LAB_ROLES])
      .is("deleted_at", null)
      .order("full_name", { ascending: true }),
    supabase
      .from("leave_requests")
      .select(
        "id, profile_id, start_date, end_date, days_count, note, status, profiles ( full_name, sector_id, sectors ( name, color ) )",
      )
      .order("start_date", { ascending: true }),
  ]);

  const employees: EquipeLeaveEmployee[] = (
    (employeesData ?? []) as unknown as EmployeeRow[]
  ).map((e) => {
    const sector = firstRelation(e.sectors);
    return {
      id: e.id,
      fullName: e.full_name,
      sectorId: e.sector_id,
      sectorName: sector?.name ?? null,
      sectorColor: sector?.color ?? null,
    };
  });

  const leaves = mapLeaveRows(
    (leavesData ?? []) as unknown as LeaveRequestDbRow[],
  );

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Congés des employés
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Validez les demandes en attente, puis consultez le calendrier. Aussi
          disponible dans l’onglet Congés du hub{" "}
          <a
            href={equipeHref("conges")}
            className="underline underline-offset-4 hover:text-[var(--ink)]"
          >
            Équipe
          </a>
          .
        </p>
      </header>

      <EquipeLeaveFeedback ok={ok} error={error} />

      <EquipeLeavesPanel
        leaves={leaves}
        employees={employees}
        returnPath="/espace-praticien/admin/conges"
      />
    </Container>
  );
}
