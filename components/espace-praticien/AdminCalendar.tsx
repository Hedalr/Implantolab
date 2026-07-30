"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { cn } from "@/lib/cn";

type Closure = {
  id: string;
  dentistId: string;
  dentistName: string;
  startDate: string;
  endDate: string;
  note: string | null;
};

type Dentist = {
  id: string;
  name: string;
};

type Props = {
  closures: Closure[];
  dentists: Dentist[];
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

function hashHue(id: string): number {
  let h = 0;
  for (let i = 0; i < id.length; i++) {
    h = (h * 31 + id.charCodeAt(i)) >>> 0;
  }
  return h % 360;
}

function dentistColor(id: string): string {
  return `hsl(${hashHue(id)}, 55%, 65%)`;
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

export function AdminCalendar({ closures, dentists }: Props) {
  const [monthStart, setMonthStart] = useState<Date>(() =>
    truncateToMonth(new Date()),
  );
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedDentistId, setSelectedDentistId] = useState<string | null>(
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

  const dentistDirectory = useMemo(() => {
    const map = new Map<string, Dentist>();
    for (const d of dentists) {
      map.set(d.id, d);
    }
    for (const c of closures) {
      if (!map.has(c.dentistId)) {
        map.set(c.dentistId, {
          id: c.dentistId,
          name: c.dentistName,
        });
      }
    }
    return Array.from(map.values()).sort((a, b) =>
      a.name.localeCompare(b.name, "fr"),
    );
  }, [dentists, closures]);

  const parsedClosures = useMemo(
    () =>
      closures.map((c) => ({
        ...c,
        start: parseIsoDate(c.startDate),
        end: parseIsoDate(c.endDate),
      })),
    [closures],
  );

  const filteredClosures = useMemo(() => {
    if (selectedDentistId) {
      return parsedClosures.filter((c) => c.dentistId === selectedDentistId);
    }

    const q = normalizeSearch(searchQuery);
    if (!q) return parsedClosures;

    const matchingIds = new Set(
      dentistDirectory
        .filter((d) => normalizeSearch(d.name).includes(q))
        .map((d) => d.id),
    );

    return parsedClosures.filter((c) => matchingIds.has(c.dentistId));
  }, [parsedClosures, selectedDentistId, searchQuery, dentistDirectory]);

  const suggestions = useMemo(() => {
    const q = normalizeSearch(searchQuery);
    if (!q) return dentistDirectory.slice(0, 8);

    return dentistDirectory
      .filter((d) => normalizeSearch(d.name).includes(q))
      .slice(0, 8);
  }, [searchQuery, dentistDirectory]);

  const selectedDentist = selectedDentistId
    ? dentistDirectory.find((d) => d.id === selectedDentistId) ?? null
    : null;

  const isFiltered = Boolean(selectedDentistId || normalizeSearch(searchQuery));

  const selectedDentistClosures = useMemo(() => {
    if (!selectedDentistId) return [];
    return parsedClosures
      .filter((c) => c.dentistId === selectedDentistId)
      .sort((a, b) => a.startDate.localeCompare(b.startDate));
  }, [parsedClosures, selectedDentistId]);

  const hasClosureInMonth = useMemo(
    () =>
      filteredClosures.some((c) => {
        const monthEnd = new Date(
          monthStart.getFullYear(),
          monthStart.getMonth() + 1,
          0,
        );
        return c.start <= monthEnd && c.end >= monthStart;
      }),
    [filteredClosures, monthStart],
  );

  const grid = useMemo(() => buildGrid(monthStart), [monthStart]);

  const closuresByDay = useMemo(() => {
    const map = new Map<string, typeof filteredClosures>();
    for (const cell of grid) {
      const list = filteredClosures.filter(
        (c) => cell.date >= c.start && cell.date <= c.end,
      );
      if (list.length) map.set(cell.key, list);
    }
    return map;
  }, [grid, filteredClosures]);

  const dentistsInMonth = useMemo(() => {
    const seen = new Map<
      string,
      { dentistId: string; dentistName: string; color: string }
    >();
    for (const cell of grid) {
      if (!cell.inMonth) continue;
      const list = closuresByDay.get(cell.key);
      if (!list) continue;
      for (const c of list) {
        if (!seen.has(c.dentistId)) {
          seen.set(c.dentistId, {
            dentistId: c.dentistId,
            dentistName: c.dentistName,
            color: dentistColor(c.dentistId),
          });
        }
      }
    }
    return Array.from(seen.values()).sort((a, b) =>
      a.dentistName.localeCompare(b.dentistName, "fr"),
    );
  }, [grid, closuresByDay]);

  useEffect(() => {
    function onPointerDown(event: MouseEvent) {
      if (!searchRef.current?.contains(event.target as Node)) {
        setSuggestionsOpen(false);
      }
    }
    document.addEventListener("pointerdown", onPointerDown);
    return () => document.removeEventListener("pointerdown", onPointerDown);
  }, []);

  function focusDentist(dentistId: string) {
    const dentist = dentistDirectory.find((d) => d.id === dentistId);
    if (!dentist) return;

    setSelectedDentistId(dentistId);
    setSearchQuery(dentist.name);
    setSuggestionsOpen(false);

    const dentistClosures = parsedClosures.filter(
      (c) => c.dentistId === dentistId,
    );
    if (dentistClosures.length === 0) return;

    const upcoming =
      dentistClosures.find((c) => c.endDate >= todayIso) ??
      dentistClosures[dentistClosures.length - 1];

    setMonthStart(truncateToMonth(upcoming.start));
  }

  function clearSearch() {
    setSearchQuery("");
    setSelectedDentistId(null);
    setSuggestionsOpen(false);
  }

  function jumpToClosure(startDate: string) {
    setMonthStart(truncateToMonth(parseIsoDate(startDate)));
  }

  const monthLabel = monthFormatter.format(monthStart);
  const monthLabelCap = monthLabel.charAt(0).toUpperCase() + monthLabel.slice(1);

  return (
    <div className="flex flex-col gap-4">
      <div ref={searchRef} className="flex flex-col sm:flex-row sm:items-end gap-3">
        <div className="relative flex-1 max-w-lg">
          <label htmlFor="calendar-search" className="text-eyebrow">
            Rechercher un dentiste
          </label>
          <input
            id="calendar-search"
            type="search"
            value={searchQuery}
            onChange={(e) => {
              setSearchQuery(e.target.value);
              setSelectedDentistId(null);
              setSuggestionsOpen(true);
            }}
            onFocus={() => setSuggestionsOpen(true)}
            onKeyDown={(e) => {
              if (e.key === "Enter" && suggestions.length === 1) {
                e.preventDefault();
                focusDentist(suggestions[0].id);
              }
              if (e.key === "Escape") {
                setSuggestionsOpen(false);
              }
            }}
            placeholder="Ex. Dr. Martin…"
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
              {suggestions.map((d) => (
                <li key={d.id} role="option">
                  <button
                    type="button"
                    onClick={() => focusDentist(d.id)}
                    className="w-full text-left px-4 py-3 text-sm text-[var(--ink)] hover:bg-[var(--bg)] transition-colors"
                  >
                    <span className="font-medium">{d.name}</span>
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
            Voir tous les dentistes
          </button>
        ) : null}
      </div>

      {selectedDentist ? (
        <DentistSummary
          dentist={selectedDentist}
          closures={selectedDentistClosures}
          todayIso={todayIso}
          onJump={jumpToClosure}
          color={dentistColor(selectedDentist.id)}
        />
      ) : null}

      <div className="bg-[var(--bg-elevated)] border border-[var(--line)]">
        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between px-5 py-4 border-b border-[var(--line)]">
          <div>
            <h2 className="text-lg font-serif text-[var(--ink)] text-numeral">
              {monthLabelCap}
            </h2>
            {selectedDentist ? (
              <p className="mt-0.5 text-xs text-[var(--ink-discreet)]">
                Calendrier de {selectedDentist.name}
              </p>
            ) : isFiltered ? (
              <p className="mt-0.5 text-xs text-[var(--ink-discreet)]">
                {filteredClosures.length} fermeture
                {filteredClosures.length !== 1 ? "s" : ""} correspondante
                {filteredClosures.length !== 1 ? "s" : ""}
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

        {isFiltered && !hasClosureInMonth ? (
          <div className="px-5 py-4 border-b border-[var(--line)] bg-[var(--bg)]/50">
            <p className="text-sm text-[var(--ink-muted)]">
              Aucune fermeture sur ce mois pour la sélection en cours.
              {selectedDentistClosures.length > 0
                ? " Consultez le récapitulatif ci-dessus ou changez de mois."
                : " Ce dentiste n’a déclaré aucune fermeture pour l’instant."}
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
            const list = closuresByDay.get(cell.key) ?? [];
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
                  {visible.map((c) => {
                    const bg = dentistColor(c.dentistId);
                    const title = `${c.dentistName} • ${humanDate.format(c.start)} → ${humanDate.format(c.end)}${c.note ? ` • ${c.note}` : ""}`;
                    return (
                      <span
                        key={`${cell.key}-${c.id}`}
                        title={title}
                        className="block truncate text-[10px] leading-4 px-1.5 py-0.5 text-black"
                        style={{ backgroundColor: bg }}
                      >
                        {c.dentistName}
                      </span>
                    );
                  })}
                  {overflow > 0 ? (
                    <span
                      title={list
                        .slice(visible.length)
                        .map(
                          (c) =>
                            `${c.dentistName} • ${humanDate.format(c.start)} → ${humanDate.format(c.end)}`,
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
            {isFiltered ? "Dentistes affichés" : "Dentistes présents ce mois"}
          </p>
          {dentistsInMonth.length === 0 ? (
            <p className="text-sm text-[var(--ink-discreet)]">
              {isFiltered
                ? "Aucune fermeture visible sur ce mois."
                : "Aucune fermeture déclarée sur ce mois."}
            </p>
          ) : (
            <ul className="flex flex-wrap gap-x-5 gap-y-2">
              {dentistsInMonth.map((d) => (
                <li
                  key={d.dentistId}
                  className="inline-flex items-center gap-2 text-sm text-[var(--ink)]"
                >
                  <span
                    aria-hidden="true"
                    className="inline-block w-3 h-3"
                    style={{ backgroundColor: d.color }}
                  />
                  {d.dentistName}
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>
    </div>
  );
}

function DentistSummary({
  dentist,
  closures,
  todayIso,
  onJump,
  color,
}: {
  dentist: Dentist;
  closures: Array<
    Closure & { start: Date; end: Date }
  >;
  todayIso: string;
  onJump: (startDate: string) => void;
  color: string;
}) {
  const upcoming = closures.filter((c) => c.endDate >= todayIso);
  const past = closures.filter((c) => c.endDate < todayIso).reverse();

  return (
    <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-5 md:p-6">
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-eyebrow">Dentiste sélectionné</p>
          <div className="mt-2 flex items-center gap-3">
            <span
              aria-hidden="true"
              className="inline-block w-3 h-3 shrink-0"
              style={{ backgroundColor: color }}
            />
            <h3 className="font-serif text-xl text-[var(--ink)]">{dentist.name}</h3>
          </div>
        </div>
        <p className="text-sm text-[var(--ink-muted)]">
          {closures.length === 0
            ? "Aucune fermeture déclarée"
            : upcoming.length > 0
              ? `${upcoming.length} fermeture${upcoming.length > 1 ? "s" : ""} à venir`
              : "Toutes les fermetures sont passées"}
        </p>
      </div>

      {closures.length === 0 ? (
        <p className="mt-4 text-sm text-[var(--ink-discreet)]">
          Ce dentiste n’a pas encore déclaré de période de fermeture.
        </p>
      ) : (
        <div className="mt-5 grid gap-6 md:grid-cols-2">
          <ClosureList
            title="À venir"
            items={upcoming}
            emptyLabel="Aucune fermeture programmée."
            onJump={onJump}
          />
          {past.length > 0 ? (
            <ClosureList
              title="Passées"
              items={past.slice(0, 5)}
              emptyLabel=""
              onJump={onJump}
              muted
            />
          ) : null}
        </div>
      )}
    </section>
  );
}

function ClosureList({
  title,
  items,
  emptyLabel,
  onJump,
  muted = false,
}: {
  title: string;
  items: Array<Closure & { start: Date; end: Date }>;
  emptyLabel: string;
  onJump: (startDate: string) => void;
  muted?: boolean;
}) {
  if (items.length === 0 && emptyLabel) {
    return (
      <div>
        <p className="text-eyebrow">{title}</p>
        <p className="mt-2 text-sm text-[var(--ink-discreet)]">{emptyLabel}</p>
      </div>
    );
  }

  if (items.length === 0) return null;

  return (
    <div>
      <p className="text-eyebrow">{title}</p>
      <ul className="mt-2 divide-y divide-[var(--line)] border-t border-[var(--line)]">
        {items.map((c) => (
          <li key={c.id} className="py-3">
            <button
              type="button"
              onClick={() => onJump(c.startDate)}
              className={cn(
                "text-left w-full group",
                muted ? "text-[var(--ink-discreet)]" : "text-[var(--ink)]",
              )}
            >
              <span className="text-sm group-hover:underline underline-offset-4">
                {humanDate.format(c.start)} → {humanDate.format(c.end)}
              </span>
              {c.note ? (
                <span className="mt-1 block text-xs text-[var(--ink-muted)] line-clamp-2">
                  {c.note}
                </span>
              ) : null}
            </button>
          </li>
        ))}
      </ul>
    </div>
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
