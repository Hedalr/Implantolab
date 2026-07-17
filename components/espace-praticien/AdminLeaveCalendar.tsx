"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type LeaveStatus = "pending" | "approved" | "rejected";

type Leave = {
  id: string;
  profileId: string;
  employeeName: string;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
  startDate: string;
  endDate: string;
  daysCount: number;
  note: string | null;
  status: LeaveStatus;
};

type Employee = {
  id: string;
  fullName: string | null;
  sectorId: string | null;
  sectorName: string | null;
  sectorColor: string | null;
};

type Props = {
  leaves: Leave[];
  employees: Employee[];
};

const WEEKDAYS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const monthFormatter = new Intl.DateTimeFormat("fr-FR", {
  month: "long",
  year: "numeric",
});

const humanDate = new Intl.DateTimeFormat("fr-FR", {
  day: "2-digit",
  month: "short",
  year: "numeric",
});

const DEFAULT_COLOR = "#94a3b8";

function truncateToMonth(date: Date): Date {
  return new Date(date.getFullYear(), date.getMonth(), 1);
}

function addMonths(date: Date, delta: number): Date {
  return new Date(date.getFullYear(), date.getMonth() + delta, 1);
}

function parseIsoDate(iso: string): Date {
  const [y, m, d] = iso.split("-").map(Number);
  return new Date(y, (m ?? 1) - 1, d ?? 1);
}

function isoDay(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

function isSameDay(a: Date, b: Date): boolean {
  return (
    a.getFullYear() === b.getFullYear() &&
    a.getMonth() === b.getMonth() &&
    a.getDate() === b.getDate()
  );
}

function normalizeSearch(value: string): string {
  return value
    .trim()
    .toLowerCase()
    .normalize("NFD")
    .replace(/\p{Diacritic}/gu, "");
}

type DayCell = {
  date: Date;
  inMonth: boolean;
  key: string;
};

function buildGrid(monthStart: Date): DayCell[] {
  const firstWeekday = (monthStart.getDay() + 6) % 7;
  const daysInMonth = new Date(
    monthStart.getFullYear(),
    monthStart.getMonth() + 1,
    0,
  ).getDate();

  const cells: DayCell[] = [];

  for (let i = firstWeekday - 1; i >= 0; i--) {
    const d = new Date(monthStart);
    d.setDate(-i);
    cells.push({ date: d, inMonth: false, key: isoDay(d) });
  }

  for (let day = 1; day <= daysInMonth; day++) {
    const d = new Date(monthStart.getFullYear(), monthStart.getMonth(), day);
    cells.push({ date: d, inMonth: true, key: isoDay(d) });
  }

  while (cells.length % 7 !== 0) {
    const last = cells[cells.length - 1].date;
    const next = new Date(last);
    next.setDate(last.getDate() + 1);
    cells.push({ date: next, inMonth: false, key: isoDay(next) });
  }

  const totalRows = cells.length / 7;
  if (totalRows < 6) {
    const last = cells[cells.length - 1].date;
    for (let i = 1; i <= 7; i++) {
      const next = new Date(last);
      next.setDate(last.getDate() + i);
      cells.push({ date: next, inMonth: false, key: isoDay(next) });
    }
  }

  return cells;
}

export function AdminLeaveCalendar({ leaves, employees }: Props) {
  const [monthStart, setMonthStart] = useState<Date>(() =>
    truncateToMonth(new Date()),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedEmployeeId, setSelectedEmployeeId] = useState<string | null>(
    null,
  );
  const [suggestionsOpen, setSuggestionsOpen] = useState(false);
  const searchRef = useRef<HTMLDivElement>(null);

  const today = useMemo(() => {
    const t = new Date();
    t.setHours(0, 0, 0, 0);
    return t;
  }, []);

  const todayIso = isoDay(today);

  const employeeDirectory = useMemo(() => {
    const map = new Map<string, Employee>();
    for (const e of employees) {
      map.set(e.id, e);
    }
    for (const l of leaves) {
      if (!map.has(l.profileId)) {
        map.set(l.profileId, {
          id: l.profileId,
          fullName: l.employeeName,
          sectorId: l.sectorId,
          sectorName: l.sectorName,
          sectorColor: l.sectorColor,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      (a.fullName ?? "").localeCompare(b.fullName ?? "", "fr"),
    );
  }, [employees, leaves]);

  const parsedLeaves = useMemo(
    () =>
      leaves.map((l) => ({
        ...l,
        start: parseIsoDate(l.startDate),
        end: parseIsoDate(l.endDate),
      })),
    [leaves],
  );

  const filteredLeaves = useMemo(() => {
    if (selectedEmployeeId) {
      return parsedLeaves.filter((l) => l.profileId === selectedEmployeeId);
    }

    const q = normalizeSearch(searchQuery);
    if (!q) return parsedLeaves;

    const matchingIds = new Set(
      employeeDirectory
        .filter((e) => {
          const haystack = normalizeSearch(
            `${e.fullName ?? ""} ${e.sectorName ?? ""}`,
          );
          return haystack.includes(q);
        })
        .map((e) => e.id),
    );

    return parsedLeaves.filter((l) => matchingIds.has(l.profileId));
  }, [parsedLeaves, selectedEmployeeId, searchQuery, employeeDirectory]);

  const suggestions = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (!q) return employeeDirectory.slice(0, 8);

    return employeeDirectory
      .filter((e) => {
        const haystack = normalizeSearch(
          `${e.fullName ?? ""} ${e.sectorName ?? ""}`,
        );
        return haystack.includes(q);
      })
      .slice(0, 8);
  }, [searchQuery, employeeDirectory]);

  const selectedEmployee = selectedEmployeeId
    ? employeeDirectory.find((e) => e.id === selectedEmployeeId) ?? null
    : null;

  const isFiltered = Boolean(
    selectedEmployeeId || normalizeSearch(searchQuery),
  );

  const grid = useMemo(() => buildGrid(monthStart), [monthStart]);

  const leavesByDay = useMemo(() => {
    const map = new Map<string, typeof filteredLeaves>();
    for (const cell of grid) {
      const list = filteredLeaves.filter(
        (l) => cell.date >= l.start && cell.date <= l.end,
      );
      if (list.length) map.set(cell.key, list);
    }
    return map;
  }, [grid, filteredLeaves]);

  const hasLeaveInMonth = useMemo(
    () =>
      filteredLeaves.some((l) => {
        const monthEnd = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth() + 1,
          0,
        );
        return l.start <= monthEnd && l.end >= monthStart;
      }),
    [filteredLeaves, monthStart],
  );

  const sectorsInMonth = useMemo(() => {
    const seen = new Map<
      string,
      { key: string; label: string; color: string }
    >();
    for (const cell of grid) {
      if (!cell.inMonth) continue;
      const list = leavesByDay.get(cell.key);
      if (!list) continue;
      for (const l of list) {
        const key = l.sectorId ?? "__none__";
        if (!seen.has(key)) {
          seen.set(key, {
            key,
            label: l.sectorName ?? "Non classé",
            color: l.sectorColor ?? DEFAULT_COLOR,
          });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.label.localeCompare(b.label, "fr"),
    );
  }, [grid, leavesByDay]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function focusEmployee(id: string) {
    const employee = employeeDirectory.find((e) => e.id === id);
    if (!employee) return;

    setSelectedEmployeeId(id);
    setSearchQuery(employee.fullName ?? "");
    setSuggestionsOpen(false);

    const employeeLeaves = parsedLeaves.filter((l) => l.profileId === id);
    if (employeeLeaves.length === 0) return;

    const upcoming =
      employeeLeaves.find((l) => l.endDate >= todayIso) ??
      employeeLeaves[employeeLeaves.length - 1];
    setMonthStart(truncateToMonth(upcoming.start));
  }

  function clearSearch() {
    setSearchQuery("");
    setSelectedEmployeeId(null);
    setSuggestionsOpen(false);
  }

  const monthLabel = monthFormatter.format(monthStart);
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex flex-col gap-4">
      <div
        ref={searchRef}
        className="flex flex-col sm:flex-row sm:items-end gap-3"
      >
        <div className="relative flex-1 max-w-lg">
          <label htmlFor="leave-search" className="text-eyebrow">
            Rechercher un employé
          </label>
          <input
            id="leave-search"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedEmployeeId(null);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length === 1) {
                e.preventDefault();
                focusEmployee(suggestions[0].id);
              }
              if (e.key === "Escape") {
                setSuggestionsOpen(false);
              }
            }}
            placeholder="Ex. Camille, Prothèse fixe…"
            autoComplete="off"
            className={cn(
              "mt-2 w-full bg-[var(--bg-elevated)] border border-[var(--line-strong)] px-4 py-3 text-base text-[var(--ink)]",
              "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
            )}
          />

          {suggestionsOpen && suggestions.length > 0 && searchQuery.trim() ? (
            <ul
              role="listbox"
              className="absolute z-20 left-0 right-0 mt-1 bg-[var(--bg-elevated)] border border-[var(--line-strong)] shadow-sm max-h-64 overflow-y-auto"
            >
              {suggestions.map((e) => (
                <li key={e.id} role="option">
                  <button
                    type="button"
                    onClick={() => focusEmployee(e.id)}
                    className="w-full text-left px-4 py-3 text-sm text-[var(--ink)] hover:bg-[var(--bg)] transition-colors flex items-center gap-3"
                  >
                    <span
                      aria-hidden="true"
                      className="inline-block h-3 w-3 shrink-0 border border-[var(--line-strong)]"
                      style={{ backgroundColor: e.sectorColor ?? DEFAULT_COLOR }}
                    />
                    <span className="font-medium">{e.fullName ?? "Sans nom"}</span>
                    {e.sectorName ? (
                      <span className="text-[var(--ink-discreet)]">
                        · {e.sectorName}
                      </span>
                    ) : null}
                  </button>
                </li>
              ))}
            </ul>
          ) : null}
        </div>

        {isFiltered ? (
          <button
            type="button"
            onClick={clearSearch}
            className="inline-flex items-center justify-center px-4 py-3 text-sm border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors whitespace-nowrap"
          >
            Voir tous les employés
          </button>
        ) : null}
      </div>

      {selectedEmployee ? (
        <EmployeeSummary
          employee={selectedEmployee}
          leaves={parsedLeaves.filter(
            (l) => l.profileId === selectedEmployee.id,
          )}
          todayIso={todayIso}
        />
      ) : null}

      <div className="bg-[var(--bg-elevated)] border border-[var(--line)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[var(--line)]">
          <div>
            <h2 className="text-lg font-serif text-[var(--ink)] text-numeral">
              {monthLabelCap}
            </h2>
            {selectedEmployee ? (
              <p className="mt-0.5 text-xs text-[var(--ink-discreet)]">
                Calendrier de {selectedEmployee.fullName ?? "l’employé"}
              </p>
            ) : isFiltered ? (
              <p className="mt-0.5 text-xs text-[var(--ink-discreet)]">
                {filteredLeaves.length} congé
                {filteredLeaves.length !== 1 ? "s" : ""} correspondant
                {filteredLeaves.length !== 1 ? "s" : ""}
              </p>
            ) : null}
          </div>
          <div className="flex items-center gap-1">
            <NavButton
              label="Mois précédent"
              onClick={() => setMonthStart((m) => addMonths(m, -1))}
            >
              ‹
            </NavButton>
            <NavButton
              label="Mois courant"
              onClick={() => setMonthStart(truncateToMonth(new Date()))}
            >
              <span className="px-1 text-xs uppercase tracking-widest">
                Aujourd&apos;hui
              </span>
            </NavButton>
            <NavButton
              label="Mois suivant"
              onClick={() => setMonthStart((m) => addMonths(m, 1))}
            >
              ›
            </NavButton>
          </div>
        </div>

        {isFiltered && !hasLeaveInMonth ? (
          <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--bg)]/50">
            <p className="text-sm text-[var(--ink-muted)]">
              Aucun congé sur ce mois pour la sélection en cours.
            </p>
          </div>
        ) : null}

        <div className="grid grid-cols-7 border-b border-[var(--line)]">
          {WEEKDAYS.map((d) => (
            <div
              key={d}
              className="text-eyebrow px-2 py-2 text-center border-r border-[var(--line)] last:border-r-0"
            >
              {d}
            </div>
          ))}
        </div>

        <div className="grid grid-cols-7">
          {grid.map((cell, idx) => {
            const list = leavesByDay.get(cell.key) ?? [];
            const visible = list.slice(0, isFiltered ? 6 : 3);
            const overflow = list.length - visible.length;
            const isToday = isSameDay(cell.date, today);
            const isLastRow = idx >= grid.length - 7;

            return (
              <div
                key={`${cell.key}-${idx}`}
                className={cn(
                  "min-h-24 border-r border-b border-[var(--line)] p-1.5 flex flex-col gap-1",
                  (idx + 1) % 7 === 0 && "border-r-0",
                  isLastRow && "border-b-0",
                  !cell.inMonth && "bg-[var(--bg)]/40",
                )}
              >
                <div className="flex items-center justify-between">
                  <span
                    className={cn(
                      "text-xs text-numeral leading-none",
                      cell.inMonth
                        ? "text-[var(--ink-muted)]"
                        : "text-[var(--ink-discreet)]/60",
                      isToday &&
                        cell.inMonth &&
                        "inline-flex items-center justify-center w-5 h-5 bg-[var(--ink)] text-[var(--bg)] rounded-full text-[10px]",
                    )}
                  >
                    {cell.date.getDate()}
                  </span>
                </div>

                <div className="flex flex-col gap-0.5 min-h-0">
                  {visible.map((l) => {
                    const bg = l.sectorColor ?? DEFAULT_COLOR;
                    const isPending = l.status === "pending";
                    const title = `${l.employeeName}${l.sectorName ? ` (${l.sectorName})` : ""} • ${isPending ? "en attente • " : ""}${humanDate.format(l.start)} → ${humanDate.format(l.end)}${l.note ? ` • ${l.note}` : ""}`;
                    return (
                      <span
                        key={`${cell.key}-${l.id}`}
                        title={title}
                        className={cn(
                          "block truncate text-[10px] leading-4 px-1.5 py-0.5 text-black",
                          isPending && "opacity-55 border border-dashed border-black/40",
                        )}
                        style={{ backgroundColor: bg }}
                      >
                        {isPending ? `… ${l.employeeName}` : l.employeeName}
                      </span>
                    );
                  })}
                  {overflow > 0 ? (
                    <span
                      title={list
                        .slice(visible.length)
                        .map(
                          (l) =>
                            `${l.employeeName} • ${humanDate.format(l.start)} → ${humanDate.format(l.end)}`,
                        )
                        .join("\n")}
                      className="text-[10px] leading-4 px-1.5 py-0.5 text-[var(--ink-muted)] border border-[var(--line)]"
                    >
                      +{overflow}
                    </span>
                  ) : null}
                </div>
              </div>
            );
          })}
        </div>

        <div className="px-5 py-4 border-t border-[var(--line)]">
          <p className="text-eyebrow mb-3">
            {isFiltered ? "Secteurs affichés" : "Secteurs présents ce mois"}
          </p>
          {sectorsInMonth.length === 0 ? (
            <p className="text-sm text-[var(--ink-discreet)]">
              {isFiltered
                ? "Aucun congé visible sur ce mois."
                : "Aucun congé déclaré sur ce mois."}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {sectorsInMonth.map((s) => (
                <li
                  key={s.key}
                  className="inline-flex items-center gap-2 text-sm text-[var(--ink)]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block w-3 h-3"
                    style={{ backgroundColor: s.color }}
                  />
                  {s.label}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function EmployeeSummary({
  employee,
  leaves,
  todayIso,
}: {
  employee: Employee;
  leaves: Array<Leave & { start: Date; end: Date }>;
  todayIso: string;
}) {
  const upcoming = leaves.filter((l) => l.endDate >= todayIso);
  const pendingCount = leaves.filter((l) => l.status === "pending").length;

  return (
    <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow">Employé sélectionné</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 shrink-0"
              style={{ backgroundColor: employee.sectorColor ?? DEFAULT_COLOR }}
            />
            <h3 className="font-serif text-xl text-[var(--ink)]">
              {employee.fullName ?? "Sans nom"}
            </h3>
            {employee.sectorName ? (
              <span className="text-sm text-[var(--ink-discreet)]">
                {employee.sectorName}
              </span>
            ) : (
              <span className="text-xs tracking-wide uppercase text-[var(--accent-warm)]">
                Non classé
              </span>
            )}
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {leaves.length === 0
            ? "Aucune demande"
            : pendingCount > 0
              ? `${pendingCount} en attente · ${upcoming.length} à venir`
              : upcoming.length > 0
                ? `${upcoming.length} congé${upcoming.length > 1 ? "s" : ""} à venir`
                : "Tous les congés sont passés"}
        </p>
      </div>
    </section>
  );
}

function NavButton({
  children,
  onClick,
  label,
}: {
  children: React.ReactNode;
  onClick: () => void;
  label: string;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      className="inline-flex items-center justify-center min-w-8 h-8 px-2 border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
    >
      {children}
    </button>
  );
}
