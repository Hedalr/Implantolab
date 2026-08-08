import "server-only";

import { getSql } from "@/lib/db/client";
import { listLabRequestsPg } from "@/lib/requests/pg";
import type { AdminRequestRow } from "@/lib/requests/queries";
import { REQUEST_INBOX_SUBJECTS } from "@/lib/requests/types";

export type AdminDashboardClosureRow = {
  id: string;
  start_date: string;
  end_date: string;
  note: string | null;
  full_name: string | null;
};

export type AdminDashboardStats = {
  closuresThisWeek: number;
  openRequests: number;
  practitionersCount: number;
  recentRequests: AdminRequestRow[];
  upcomingClosures: AdminDashboardClosureRow[];
};

function toDateString(value: Date | string): string {
  if (typeof value === "string") return value.slice(0, 10);
  return value.toISOString().slice(0, 10);
}

function isoDate(date: Date): string {
  const y = date.getFullYear();
  const m = String(date.getMonth() + 1).padStart(2, "0");
  const d = String(date.getDate()).padStart(2, "0");
  return `${y}-${m}-${d}`;
}

/** Bornes [aujourd'hui, +7j] en date locale (aligné page admin). */
export function adminDashboardDateWindow(now = new Date()): {
  todayIso: string;
  inSevenDaysIso: string;
} {
  const today = new Date(now);
  today.setHours(0, 0, 0, 0);
  const inSevenDays = new Date(today);
  inSevenDays.setDate(inSevenDays.getDate() + 7);
  return {
    todayIso: isoDate(today),
    inSevenDaysIso: isoDate(inSevenDays),
  };
}

export async function getAdminDashboardStatsPg(
  now = new Date(),
): Promise<AdminDashboardStats> {
  const sql = getSql();
  const { todayIso, inSevenDaysIso } = adminDashboardDateWindow(now);
  const inboxSubjects = [...REQUEST_INBOX_SUBJECTS];

  const [
    closuresThisWeekRows,
    openRequestsRows,
    practitionersRows,
    recentPage,
    upcomingRows,
  ] = await Promise.all([
    sql<{ count: number }[]>`
      select count(*)::int as count
        from public.closure_periods
       where start_date <= ${inSevenDaysIso}::date
         and end_date >= ${todayIso}::date
    `,
    sql<{ count: number }[]>`
      select count(*)::int as count
        from public.requests
       where status = 'open'
         and subject = any(${inboxSubjects}::text[])
    `,
    sql<{ count: number }[]>`
      select count(*)::int as count
        from public.profiles
       where role = 'practitioner'
         and deleted_at is null
    `,
    listLabRequestsPg({
      scope: "admin",
      status: "all",
      page: 1,
      pageSize: 5,
      subjects: REQUEST_INBOX_SUBJECTS,
    }),
    sql<
      {
        id: string;
        start_date: Date | string;
        end_date: Date | string;
        note: string | null;
        full_name: string | null;
      }[]
    >`
      select cp.id::text,
             cp.start_date,
             cp.end_date,
             cp.note,
             p.full_name
        from public.closure_periods cp
        join public.profiles p on p.id = cp.profile_id
       where cp.start_date >= ${todayIso}::date
       order by cp.start_date asc
       limit 5
    `,
  ]);

  return {
    closuresThisWeek: closuresThisWeekRows[0]?.count ?? 0,
    openRequests: openRequestsRows[0]?.count ?? 0,
    practitionersCount: practitionersRows[0]?.count ?? 0,
    recentRequests: recentPage.rows,
    upcomingClosures: upcomingRows.map((row) => ({
      id: row.id,
      start_date: toDateString(row.start_date),
      end_date: toDateString(row.end_date),
      note: row.note,
      full_name: row.full_name,
    })),
  };
}
