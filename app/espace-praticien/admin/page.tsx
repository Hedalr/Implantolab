import Link from "next/link";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import { Container } from "@/components/ui/Container";
import { cn } from "@/lib/cn";

export const dynamic = "force-dynamic";

type RequestRow = {
  id: string;
  subject: string;
  message: string;
  status: "open" | "closed";
  created_at: string;
  practices: { name: string | null; city: string | null } | null;
  profiles: { full_name: string | null; email: string | null } | null;
};

type ClosureRow = {
  id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  practices: { name: string | null; city: string | null } | null;
};

const dateFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "long",
  year: "numeric",
});

const dateTimeFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
  hour: "2-digit",
  minute: "2-digit",
});

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

export default async function AdminDashboardPage() {
  const { profile } = await requireAdmin();
  const supabase = await getServerSupabase();

  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  const todayIso = isoDate(today);
  const inSevenDaysIso = isoDate(inSevenDays);

  const [
    closuresThisWeekRes,
    openRequestsRes,
    practicesRes,
    practitionersRes,
    recentRequestsRes,
    upcomingClosuresRes,
  ] = await Promise.all([
    supabase
      .from("closure_periods")
      .select("id", { count: "exact", head: true })
      .lte("start_date", inSevenDaysIso)
      .gte("end_date", todayIso),
    supabase
      .from("requests")
      .select("id", { count: "exact", head: true })
      .eq("status", "open"),
    supabase.from("practices").select("id", { count: "exact", head: true }),
    supabase
      .from("profiles")
      .select("id", { count: "exact", head: true })
      .eq("role", "practitioner"),
    supabase
      .from("requests")
      .select(
        "id, subject, message, status, created_at, practices(name, city), profiles(full_name, email)",
      )
      .order("created_at", { ascending: false })
      .limit(5),
    supabase
      .from("closure_periods")
      .select("id, start_date, end_date, note, practices(name, city)")
      .gte("start_date", todayIso)
      .order("start_date", { ascending: true })
      .limit(5),
  ]);

  const closuresThisWeek = closuresThisWeekRes.count ?? 0;
  const openRequests = openRequestsRes.count ?? 0;
  const practicesCount = practicesRes.count ?? 0;
  const practitionersCount = practitionersRes.count ?? 0;
  const recentRequests = (recentRequestsRes.data ?? []) as unknown as RequestRow[];
  const upcomingClosures = (upcomingClosuresRes.data ?? []) as unknown as ClosureRow[];

  const displayName = profile.fullName ?? profile.email;

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-10">
        <p className="text-eyebrow">Administration laboratoire</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Bonjour {displayName}
        </h1>
        <p className="mt-2 text-[var(--ink-muted)]">
          Vue d&apos;ensemble du laboratoire.
        </p>
      </header>

      <section
        aria-label="Indicateurs clés"
        className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4"
      >
        <Kpi
          label="Fermetures cette semaine"
          value={closuresThisWeek}
          hint="Cabinets fermés dans les 7 jours"
        />
        <Kpi
          label="Demandes ouvertes"
          value={openRequests}
          hint="À traiter par l'équipe"
        />
        <Kpi
          label="Cabinets actifs"
          value={practicesCount}
          hint="Praticiens partenaires"
        />
        <Kpi
          label="Praticiens"
          value={practitionersCount}
          hint="Comptes praticiens actifs"
        />
      </section>

      <section
        aria-label="Raccourcis"
        className="mt-8 flex flex-wrap gap-3 border-t border-[var(--line)] pt-6"
      >
        <ShortcutLink
          href="/espace-praticien/admin/calendrier"
          label="Calendrier des fermetures"
        />
        <ShortcutLink
          href="/espace-praticien/admin/demandes"
          label="Demandes praticiens"
        />
        <ShortcutLink
          href="/espace-praticien/admin/praticiens"
          label="Praticiens & cabinets"
        />
      </section>

      <div className="mt-10 grid grid-cols-1 lg:grid-cols-2 gap-6">
        <PanelCard title="Demandes récentes" href="/espace-praticien/admin/demandes">
          {recentRequests.length === 0 ? (
            <EmptyState label="Aucune demande pour le moment." />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {recentRequests.map((r) => (
                <li key={r.id} className="py-3">
                  <div className="flex items-baseline justify-between gap-4">
                    <p className="text-sm font-medium text-[var(--ink)] truncate">
                      {r.subject}
                    </p>
                    <StatusBadge status={r.status} />
                  </div>
                  <p className="mt-1 text-xs text-[var(--ink-discreet)]">
                    {r.practices?.name ?? "Cabinet inconnu"}
                    {r.profiles?.full_name ? ` • ${r.profiles.full_name}` : ""} •{" "}
                    {dateTimeFormatter.format(new Date(r.created_at))}
                  </p>
                </li>
              ))}
            </ul>
          )}
        </PanelCard>

        <PanelCard
          title="Prochaines fermetures"
          href="/espace-praticien/admin/calendrier"
        >
          {upcomingClosures.length === 0 ? (
            <EmptyState label="Aucune fermeture programmée." />
          ) : (
            <ul className="divide-y divide-[var(--line)]">
              {upcomingClosures.map((c) => (
                <li key={c.id} className="py-3">
                  <p className="text-sm font-medium text-[var(--ink)]">
                    {c.practices?.name ?? "Cabinet inconnu"}
                  </p>
                  <p className="mt-1 text-xs text-[var(--ink-discreet)] text-numeral">
                    {dateFormatter.format(new Date(c.start_date))} →{" "}
                    {dateFormatter.format(new Date(c.end_date))}
                  </p>
                  {c.note ? (
                    <p className="mt-1 text-xs text-[var(--ink-muted)] line-clamp-2">
                      {c.note}
                    </p>
                  ) : null}
                </li>
              ))}
            </ul>
          )}
        </PanelCard>
      </div>
    </Container>
  );
}

function Kpi({
  label,
  value,
  hint,
}: {
  label: string;
  value: number;
  hint: string;
}) {
  return (
    <div className="bg-[var(--bg-elevated)] border border-[var(--line)] p-5">
      <p className="text-eyebrow">{label}</p>
      <p className="mt-3 text-numeral text-4xl md:text-5xl text-[var(--ink)] leading-none">
        {value}
      </p>
      <p className="mt-3 text-xs text-[var(--ink-discreet)]">{hint}</p>
    </div>
  );
}

function ShortcutLink({ href, label }: { href: string; label: string }) {
  return (
    <Link
      href={href}
      className={cn(
        "inline-flex items-center gap-2 px-4 py-2 text-sm border border-[var(--line-strong)]",
        "text-[var(--ink)] hover:border-[var(--ink)] transition-colors",
      )}
    >
      {label}
      <span aria-hidden="true">→</span>
    </Link>
  );
}

function PanelCard({
  title,
  href,
  children,
}: {
  title: string;
  href?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--bg-elevated)] border border-[var(--line)]">
      <header className="flex items-baseline justify-between px-5 pt-4 pb-3 border-b border-[var(--line)]">
        <h2 className="text-lg font-serif text-[var(--ink)]">{title}</h2>
        {href ? (
          <Link
            href={href}
            className="text-xs text-[var(--ink-discreet)] hover:text-[var(--ink)]"
          >
            Tout voir
          </Link>
        ) : null}
      </header>
      <div className="px-5 pb-4">{children}</div>
    </section>
  );
}

function EmptyState({ label }: { label: string }) {
  return (
    <p className="py-8 text-sm text-[var(--ink-discreet)] text-center">{label}</p>
  );
}

function StatusBadge({ status }: { status: "open" | "closed" }) {
  if (status === "open") {
    return (
      <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase bg-[var(--accent-warm)]/10 text-[var(--accent-warm)]">
        Ouverte
      </span>
    );
  }
  return (
    <span className="inline-flex items-center px-2 py-0.5 text-[10px] tracking-widest uppercase bg-[var(--ink-discreet)]/10 text-[var(--ink-discreet)]">
      Traitée
    </span>
  );
}
