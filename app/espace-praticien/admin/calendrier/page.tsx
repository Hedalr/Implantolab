import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { AdminCalendar } from "@/components/espace-praticien/AdminCalendar";

export const dynamic = "force-dynamic";

type ClosureRow = {
  id: string;
  practice_id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  practices: { name: string | null } | null;
};

type PracticeRow = {
  id: string;
  name: string;
  city: string | null;
};

export default async function AdminCalendarPage() {
  await requireAdmin();
  const supabase = await getServerSupabase();

  const [closuresRes, practicesRes] = await Promise.all([
    supabase
      .from("closure_periods")
      .select("id, practice_id, start_date, end_date, note, practices(name)")
      .order("start_date", { ascending: true }),
    supabase
      .from("practices")
      .select("id, name, city")
      .order("name", { ascending: true }),
  ]);

  const rows = (closuresRes.data ?? []) as unknown as ClosureRow[];
  const practiceRows = (practicesRes.data ?? []) as PracticeRow[];

  const closures = rows.map((r) => ({
    id: r.id,
    practiceId: r.practice_id,
    practiceName: r.practices?.name ?? "Cabinet",
    startDate: r.start_date,
    endDate: r.end_date,
    note: r.note,
  }));

  const practices = practiceRows.map((p) => ({
    id: p.id,
    name: p.name,
    city: p.city,
  }));

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-2xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Calendrier des fermetures
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Vue centralisée des dates de fermeture déclarées par les cabinets
          partenaires. Recherchez un cabinet pour afficher uniquement son
          calendrier.
        </p>
      </header>

      <AdminCalendar closures={closures} practices={practices} />
    </Container>
  );
}
