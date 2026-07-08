import { Container } from "@/components/ui/Container";
import { Button } from "@/components/ui/Button";
import { cn } from "@/lib/cn";
import {
  getServiceRoleSupabase,
  isServiceRoleConfigured,
} from "@/lib/supabase/admin";
import { getServerSupabase, requireAdmin } from "@/lib/supabase/server";
import {
  createSector,
  deleteSector,
  updateEmployeeLeaveBalance,
  updateEmployeeSector,
  updateSector,
} from "./actions";

export const dynamic = "force-dynamic";

type SearchParams = Promise<{ ok?: string; error?: string }>;

type SectorRow = {
  id: string;
  name: string;
  color: string;
};

type EmployeeRow = {
  id: string;
  full_name: string | null;
  sector_id: string | null;
  leave_balance_days: number | null;
  created_at: string;
};

const FEEDBACK: Record<string, { title: string; message: string }> = {
  "sector-created": {
    title: "Secteur créé",
    message: "Le nouveau secteur d’activité est disponible.",
  },
  "sector-updated": {
    title: "Secteur mis à jour",
    message: "Le nom ou la couleur du secteur ont été enregistrés.",
  },
  "sector-deleted": {
    title: "Secteur supprimé",
    message:
      "Le secteur a été supprimé. Les employés qui y étaient rattachés sont désormais non classés.",
  },
  "employee-sector": {
    title: "Secteur mis à jour",
    message: "Le rattachement de l’employé a bien été enregistré.",
  },
  "employee-balance": {
    title: "Solde mis à jour",
    message: "Le solde de congés de l’employé a été mis à jour.",
  },
  "sector-name": {
    title: "Erreur",
    message: "Le nom du secteur doit contenir entre 2 et 80 caractères.",
  },
  "sector-color": {
    title: "Erreur",
    message: "La couleur du secteur doit être un code hexadécimal valide (ex. #2563eb).",
  },
  "sector-duplicate": {
    title: "Nom déjà utilisé",
    message: "Un autre secteur porte déjà ce nom.",
  },
  "sector-save": {
    title: "Erreur",
    message: "Impossible d’enregistrer le secteur. Merci de réessayer.",
  },
  "sector-delete": {
    title: "Erreur",
    message: "Impossible de supprimer le secteur.",
  },
  "sector-validation": {
    title: "Erreur",
    message: "Secteur invalide.",
  },
  "employee-validation": {
    title: "Erreur",
    message: "Employé invalide.",
  },
  "employee-balance-invalid": {
    title: "Erreur",
    message: "Le solde doit être un nombre entier entre 0 et 365.",
  },
  "employee-save": {
    title: "Erreur",
    message: "Impossible d’enregistrer la modification.",
  },
};

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

export default async function AdminEmployesPage({
  searchParams,
}: {
  searchParams: SearchParams;
}) {
  await requireAdmin();
  const { ok, error } = await searchParams;
  const feedbackKey = ok ?? error;
  const feedback = feedbackKey ? FEEDBACK[feedbackKey] : null;
  const canListEmails = isServiceRoleConfigured();

  const supabase = await getServerSupabase();

  const { data: sectorsData } = await supabase
    .from("sectors")
    .select("id, name, color")
    .order("name", { ascending: true });

  const { data: employeesData } = await supabase
    .from("profiles")
    .select("id, full_name, sector_id, leave_balance_days, created_at")
    .eq("role", "prosthetist")
    .order("full_name", { ascending: true });

  const sectors = (sectorsData ?? []) as SectorRow[];
  const employees = (employeesData ?? []) as EmployeeRow[];

  const employeeIds = employees.map((e) => e.id);
  const usedByProfile = new Map<string, number>();
  if (employeeIds.length > 0) {
    const { data: leavesData } = await supabase
      .from("leave_requests")
      .select("profile_id, days_count")
      .in("profile_id", employeeIds);
    for (const row of (leavesData ?? []) as {
      profile_id: string;
      days_count: number;
    }[]) {
      usedByProfile.set(
        row.profile_id,
        (usedByProfile.get(row.profile_id) ?? 0) + row.days_count,
      );
    }
  }

  const emailById = new Map<string, string>();
  if (canListEmails && employeeIds.length > 0) {
    try {
      const admin = getServiceRoleSupabase();
      const { data: listData } = await admin.auth.admin.listUsers({
        page: 1,
        perPage: 1000,
      });
      for (const user of listData.users ?? []) {
        if (user.email) {
          emailById.set(user.id, user.email);
        }
      }
    } catch {
      // Fallback silencieux : l'affichage reste possible sans les e-mails.
    }
  }

  const employeesBySector = new Map<string | null, EmployeeRow[]>();
  for (const emp of employees) {
    const key = emp.sector_id ?? null;
    const bucket = employeesBySector.get(key) ?? [];
    bucket.push(emp);
    employeesBySector.set(key, bucket);
  }

  const sectorSections = sectors
    .map((sector) => ({
      sector,
      employees: employeesBySector.get(sector.id) ?? [],
    }))
    .sort((a, b) => a.sector.name.localeCompare(b.sector.name, "fr"));

  const unclassified = employeesBySector.get(null) ?? [];

  return (
    <Container size="wide" className="py-10 md:py-14">
      <header className="mb-8 max-w-3xl">
        <p className="text-eyebrow">Administration</p>
        <h1 className="mt-3 text-3xl md:text-4xl font-serif text-[var(--ink)]">
          Employés &amp; secteurs
        </h1>
        <p className="mt-2 text-[var(--ink-muted)] leading-relaxed">
          Créez les secteurs d’activité, rattachez chaque employé du labo à un
          secteur (couleur associée) et fixez son solde de jours de congés
          annuel.
        </p>
      </header>

      {feedback ? (
        <div
          role="status"
          className={cn(
            "mb-8 border-l-4 pl-4 py-3 bg-[var(--bg-elevated)] max-w-3xl",
            error ? "border-[var(--ink)]" : "border-[var(--accent-warm)]",
          )}
        >
          <p className="text-sm font-medium text-[var(--ink)]">{feedback.title}</p>
          <p className="mt-1 text-sm text-[var(--ink-muted)]">{feedback.message}</p>
        </div>
      ) : null}

      <div className="grid gap-8 lg:grid-cols-12">
        <div className="lg:col-span-5 flex flex-col gap-8">
          <Panel eyebrow="Étape 1" title="Nouveau secteur">
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              Choisissez un nom (ex. « Prothèse fixe », « Accueil »,
              « Administratif ») et une couleur d’identification. Deux employés
              du même secteur ne pourront pas poser de congés en même temps.
            </p>
            <form action={createSector} className="mt-5 flex flex-col gap-5">
              <Field label="Nom du secteur" htmlFor="sector-name" required>
                <input
                  id="sector-name"
                  name="name"
                  required
                  minLength={2}
                  maxLength={80}
                  placeholder="Prothèse fixe"
                  className={inputStyle}
                />
              </Field>
              <Field label="Couleur" htmlFor="sector-color" required>
                <input
                  id="sector-color"
                  name="color"
                  type="color"
                  defaultValue="#2563eb"
                  className="h-10 w-20 cursor-pointer border border-[var(--line-strong)] bg-transparent"
                />
              </Field>
              <Button type="submit" variant="primary">
                Créer le secteur
              </Button>
            </form>
          </Panel>

          <Panel eyebrow="Répertoire" title={`Secteurs (${sectors.length})`}>
            {sectors.length === 0 ? (
              <Empty label="Aucun secteur enregistré pour l’instant." />
            ) : (
              <ul className="mt-5 divide-y divide-[var(--line)] border-t border-[var(--line)]">
                {sectors.map((s) => {
                  const count = (employeesBySector.get(s.id) ?? []).length;
                  return (
                    <li key={s.id} className="py-4 flex flex-col gap-3">
                      <form
                        action={updateSector}
                        className="flex flex-wrap items-center gap-3"
                      >
                        <input type="hidden" name="id" value={s.id} />
                        <input
                          type="color"
                          name="color"
                          defaultValue={s.color}
                          className="h-9 w-12 cursor-pointer border border-[var(--line-strong)] bg-transparent"
                          aria-label={`Couleur du secteur ${s.name}`}
                        />
                        <input
                          type="text"
                          name="name"
                          defaultValue={s.name}
                          required
                          minLength={2}
                          maxLength={80}
                          className={cn(inputStyle, "flex-1 min-w-40 py-1.5")}
                          aria-label={`Nom du secteur ${s.name}`}
                        />
                        <button
                          type="submit"
                          className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                        >
                          Enregistrer
                        </button>
                      </form>
                      <div className="flex items-center justify-between gap-4">
                        <span className="text-xs text-[var(--ink-discreet)]">
                          {count} employé{count !== 1 ? "s" : ""} rattaché
                          {count !== 1 ? "s" : ""}
                        </span>
                        <form action={deleteSector}>
                          <input type="hidden" name="id" value={s.id} />
                          <button
                            type="submit"
                            className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors"
                          >
                            Supprimer
                          </button>
                        </form>
                      </div>
                    </li>
                  );
                })}
              </ul>
            )}
          </Panel>
        </div>

        <div className="lg:col-span-7 flex flex-col gap-8">
          <Panel eyebrow="Comptes" title={`Employés (${employees.length})`}>
            <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
              Ces comptes correspondent aux utilisateurs invités avec le rôle
              « Prothésiste » depuis la page{" "}
              <a
                href="/espace-praticien/admin/praticiens"
                className="underline underline-offset-4 hover:text-[var(--ink)]"
              >
                Praticiens
              </a>
              .
            </p>

            {employees.length === 0 ? (
              <Empty label="Aucun employé (prothésiste) invité pour le moment." />
            ) : (
              <div className="mt-6 flex flex-col gap-8">
                {sectorSections.map(({ sector, employees: list }) => (
                  <SectorGroup
                    key={sector.id}
                    title={sector.name}
                    color={sector.color}
                    employees={list}
                    sectors={sectors}
                    emailById={emailById}
                    usedByProfile={usedByProfile}
                    inputStyle={inputStyle}
                  />
                ))}
                <SectorGroup
                  key="__unclassified__"
                  title="Non classés"
                  color={null}
                  employees={unclassified}
                  sectors={sectors}
                  emailById={emailById}
                  usedByProfile={usedByProfile}
                  inputStyle={inputStyle}
                />
              </div>
            )}
          </Panel>
        </div>
      </div>
    </Container>
  );
}

function SectorGroup({
  title,
  color,
  employees,
  sectors,
  emailById,
  usedByProfile,
  inputStyle,
}: {
  title: string;
  color: string | null;
  employees: EmployeeRow[];
  sectors: SectorRow[];
  emailById: Map<string, string>;
  usedByProfile: Map<string, number>;
  inputStyle: string;
}) {
  if (employees.length === 0 && color !== null) {
    return (
      <div className="flex flex-col gap-2">
        <SectorHeader title={title} color={color} count={0} />
        <p className="text-sm text-[var(--ink-discreet)] pl-6">
          Aucun employé rattaché.
        </p>
      </div>
    );
  }

  if (employees.length === 0) {
    return null;
  }

  return (
    <div className="flex flex-col gap-3">
      <SectorHeader title={title} color={color} count={employees.length} />
      <ul className="flex flex-col divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {employees.map((emp) => (
          <EmployeeRowItem
            key={emp.id}
            employee={emp}
            sectors={sectors}
            emailById={emailById}
            usedByProfile={usedByProfile}
            inputStyle={inputStyle}
          />
        ))}
      </ul>
    </div>
  );
}

function SectorHeader({
  title,
  color,
  count,
}: {
  title: string;
  color: string | null;
  count: number;
}) {
  return (
    <div className="flex items-center gap-3">
      <span
        aria-hidden="true"
        className="inline-block h-3 w-3 shrink-0 border border-[var(--line-strong)]"
        style={{ backgroundColor: color ?? "transparent" }}
      />
      <h3 className="font-serif text-lg text-[var(--ink)]">{title}</h3>
      <span className="text-xs text-[var(--ink-discreet)]">
        {count} employé{count !== 1 ? "s" : ""}
      </span>
    </div>
  );
}

function EmployeeRowItem({
  employee,
  sectors,
  emailById,
  usedByProfile,
  inputStyle,
}: {
  employee: EmployeeRow;
  sectors: SectorRow[];
  emailById: Map<string, string>;
  usedByProfile: Map<string, number>;
  inputStyle: string;
}) {
  const used = usedByProfile.get(employee.id) ?? 0;
  const balance = employee.leave_balance_days ?? 0;
  const remaining = Math.max(balance - used, 0);
  const email = emailById.get(employee.id);

  return (
    <li className="py-5 flex flex-col gap-3 md:flex-row md:items-start md:justify-between md:gap-6">
      <div className="min-w-0">
        <p className="text-[var(--ink)]">
          {employee.full_name ?? "Sans nom"}
        </p>
        <p className="text-xs text-[var(--ink-discreet)] break-all">
          {email ?? "E-mail non disponible"}
        </p>
        <p className="mt-1 text-xs text-[var(--ink-muted)]">
          {used} / {balance} jour{balance > 1 ? "s" : ""} utilisé
          {used > 1 ? "s" : ""} · reste {remaining} jour
          {remaining > 1 ? "s" : ""}
        </p>
      </div>
      <div className="flex flex-col gap-3 sm:flex-row sm:items-end md:min-w-96">
        <form
          action={updateEmployeeSector}
          className="flex flex-1 flex-col gap-1"
        >
          <input type="hidden" name="profile_id" value={employee.id} />
          <label
            htmlFor={`sector-${employee.id}`}
            className="text-eyebrow text-[10px]"
          >
            Secteur
          </label>
          <div className="flex items-center gap-2">
            <select
              id={`sector-${employee.id}`}
              name="sector_id"
              defaultValue={employee.sector_id ?? ""}
              className={cn(inputStyle, "cursor-pointer py-1.5")}
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
              className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
            >
              OK
            </button>
          </div>
        </form>
        <form
          action={updateEmployeeLeaveBalance}
          className="flex flex-col gap-1"
        >
          <input type="hidden" name="profile_id" value={employee.id} />
          <label
            htmlFor={`balance-${employee.id}`}
            className="text-eyebrow text-[10px]"
          >
            Solde total (jours)
          </label>
          <div className="flex items-center gap-2">
            <input
              id={`balance-${employee.id}`}
              name="leave_balance_days"
              type="number"
              min={0}
              max={365}
              step={1}
              defaultValue={balance}
              className={cn(inputStyle, "w-24 py-1.5 text-numeral")}
            />
            <button
              type="submit"
              className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors whitespace-nowrap"
            >
              OK
            </button>
          </div>
        </form>
      </div>
    </li>
  );
}

function Panel({
  eyebrow,
  title,
  children,
}: {
  eyebrow: string;
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8">
      <p className="text-eyebrow">{eyebrow}</p>
      <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">{title}</h2>
      {children}
    </section>
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

function Empty({ label }: { label: string }) {
  return (
    <p className="mt-5 py-6 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
      {label}
    </p>
  );
}
