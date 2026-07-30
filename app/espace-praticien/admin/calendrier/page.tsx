import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { AdminCalendar } from "@/components/espace-praticien/AdminCalendar";

export const dynamic = "force-dynamic";

type ClosureRow = {
  id: string;
  profile_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  profiles: { full_name: string | null } | null;
};

type DentistRow = {
  id: string;
  full_name: string | null;
};

export default async function AdminCalendarPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();

  const [closuresRes, dentistsRes] = await Promise.all([
    supabase
      .from("closure_periods")
      .select("id, profile_id, start_date, end_date, note, profiles(full_name)")
      .order("start_date", { ascending: true }),
    supabase
      .from("profiles")
      .select("id, full_name")
      .eq("role", "practitioner")
      .order("full_name", { ascending: true }),
  ]);

  const rows = (closuresRes.data ?? []) as unknown as ClosureRow[];
  const dentistRows = (dentistsRes.data ?? []) as DentistRow[];

  const closures = rows.map((r) => ({
    id: r.id,
    dentistId: r.profile_id,
    dentistName: r.profiles?.full_name ?? "Dentiste",
    startDate: r.start_date,
    endDate: r.end_date,
    note: r.note,
  }));

  const dentists = dentistRows.map((d) => ({
    id: d.id,
    name: d.full_name ?? "Dentiste",
  }));

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Calendrier des fermetures
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Vue centralisée des dates de fermeture déclarées par les dentistes
          partenaires. Recherchez un dentiste pour afficher uniquement son
          calendrier.
        </p>
      </header>

      <AdminCalendar closures={closures} dentists={dentists} />
    </Container>
  );
}
