"use client";

import { useMemo, useState } from "react";
import { cn } from "@/lib/cn";

const MONTH_LABELS = [
  "Janvier",
  "Février",
  "Mars",
  "Avril",
  "Mai",
  "Juin",
  "Juillet",
  "Août",
  "Septembre",
  "Octobre",
  "Novembre",
  "Décembre",
];

const WEEKDAY_LABELS = ["Lun", "Mar", "Mer", "Jeu", "Ven", "Sam", "Dim"];

const rangeLabelFormatter = new Intl.DateTimeFormat("fr-FR", {
  day: "numeric",
  month: "short",
  year: "numeric",
});

function pad(value: number): string {
  return String(value).padStart(2, "0");
}

function toIso(year: number, month: number, day: number): string {
  return `${year}-${pad(month + 1)}-${pad(day)}`;
}

function parseIso(iso: string): { year: number; month: number; day: number } {
  const [year, month, day] = iso.split("-").map(Number);
  return { year, month: month - 1, day };
}

function parseDateOnly(iso: string): Date {
  const { year, month, day } = parseIso(iso);
  return new Date(year, month, day);
}

function formatRangeLabel(startDate: string, endDate: string): string {
  const start = rangeLabelFormatter.format(parseDateOnly(startDate));
  const end = rangeLabelFormatter.format(parseDateOnly(endDate));
  if (startDate === endDate) return start;
  return `${start} → ${end}`;
}

type DayCell = {
  iso: string;
  day: number;
  inCurrentMonth: boolean;
};

function buildMonthGrid(year: number, month: number): DayCell[] {
  const firstOfMonth = new Date(year, month, 1);
  const leadingBlanks = (firstOfMonth.getDay() + 6) % 7;
  const daysInMonth = new Date(year, month + 1, 0).getDate();
  const daysInPrevMonth = new Date(year, month, 0).getDate();

  const cells: DayCell[] = [];

  for (let i = leadingBlanks - 1; i >= 0; i -= 1) {
    const day = daysInPrevMonth - i;
    const prevMonth = month === 0 ? 11 : month - 1;
    const prevYear = month === 0 ? year - 1 : year;
    cells.push({
      iso: toIso(prevYear, prevMonth, day),
      day,
      inCurrentMonth: false,
    });
  }

  for (let day = 1; day <= daysInMonth; day += 1) {
    cells.push({ iso: toIso(year, month, day), day, inCurrentMonth: true });
  }

  while (cells.length % 7 !== 0 || cells.length < 42) {
    const trailingIndex = cells.length - leadingBlanks - daysInMonth + 1;
    const nextMonth = month === 11 ? 0 : month + 1;
    const nextYear = month === 11 ? year + 1 : year;
    cells.push({
      iso: toIso(nextYear, nextMonth, trailingIndex),
      day: trailingIndex,
      inCurrentMonth: false,
    });
  }

  return cells;
}

type Props = {
  startDate: string;
  endDate: string;
  className?: string;
};

export function LeaveRangePreview({ startDate, endDate, className }: Props) {
  const initial = parseIso(startDate);
  const [visibleYear, setVisibleYear] = useState(initial.year);
  const [visibleMonth, setVisibleMonth] = useState(initial.month);

  const cells = useMemo(
    () => buildMonthGrid(visibleYear, visibleMonth),
    [visibleYear, visibleMonth],
  );

  const todayIso = useMemo(() => {
    const now = new Date();
    return toIso(now.getFullYear(), now.getMonth(), now.getDate());
  }, []);

  const isRange = startDate !== endDate;
  const monthLabel = `${MONTH_LABELS[visibleMonth]} ${visibleYear}`;

  function goToPrevMonth() {
    if (visibleMonth === 0) {
      setVisibleYear((y) => y - 1);
      setVisibleMonth(11);
    } else {
      setVisibleMonth((m) => m - 1);
    }
  }

  function goToNextMonth() {
    if (visibleMonth === 11) {
      setVisibleYear((y) => y + 1);
      setVisibleMonth(0);
    } else {
      setVisibleMonth((m) => m + 1);
    }
  }

  return (
    <div
      className={cn(
        "w-full max-w-[17.5rem] select-none rounded-sm border border-[var(--line)] bg-[var(--bg)] p-3",
        className,
      )}
      aria-label={`Calendrier : ${formatRangeLabel(startDate, endDate)}`}
    >
      <div className="mb-2 flex items-center justify-between gap-2">
        <button
          type="button"
          onClick={goToPrevMonth}
          aria-label="Mois précédent"
          className="inline-flex h-7 w-7 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
        >
          ‹
        </button>
        <p className="text-sm font-medium text-[var(--ink)] text-numeral">
          {monthLabel}
        </p>
        <button
          type="button"
          onClick={goToNextMonth}
          aria-label="Mois suivant"
          className="inline-flex h-7 w-7 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
        >
          ›
        </button>
      </div>

      <div className="mb-1 grid grid-cols-7">
        {WEEKDAY_LABELS.map((label) => (
          <span
            key={label}
            className="py-1 text-center text-[10px] font-semibold uppercase tracking-wide text-[var(--ink-discreet)]"
          >
            {label}
          </span>
        ))}
      </div>

      <div className="grid grid-cols-7">
        {cells.map((cell) => {
          const isStart = cell.iso === startDate;
          const isEnd = cell.iso === endDate;
          const isInRange =
            isRange && cell.iso >= startDate && cell.iso <= endDate;
          const isToday = cell.iso === todayIso;

          return (
            <div
              key={cell.iso}
              className="relative flex h-8 items-center justify-center"
            >
              {isInRange ? (
                <span
                  aria-hidden="true"
                  className={cn(
                    "absolute inset-y-1 left-0 right-0 bg-[var(--accent-warm-soft)]",
                    isStart && "left-1/2",
                    isEnd && "right-1/2",
                  )}
                />
              ) : null}
              <span
                className={cn(
                  "relative z-[1] inline-flex h-7 w-7 items-center justify-center text-xs text-numeral",
                  !cell.inCurrentMonth && "text-[var(--ink-discreet)]/50",
                  cell.inCurrentMonth && "text-[var(--ink)]",
                  (isStart || isEnd) &&
                    "rounded-full bg-[var(--accent)] font-semibold text-white",
                  isToday &&
                    !isStart &&
                    !isEnd &&
                    "rounded-full border border-[var(--accent)]",
                )}
              >
                {cell.day}
              </span>
            </div>
          );
        })}
      </div>

      <p className="mt-2 text-center text-xs font-semibold text-[var(--accent)] text-numeral">
        {formatRangeLabel(startDate, endDate)}
      </p>
    </div>
  );
}
