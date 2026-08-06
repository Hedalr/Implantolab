import Link from "next/link";
import { cn } from "@/lib/cn";
import {
  EQUIPE_TAB_LABELS,
  EQUIPE_TABS,
  equipeHref,
  type EquipeTab,
} from "@/lib/equipe";

export function EquipeTabs({
  active,
  pendingLeaves = 0,
}: {
  active: EquipeTab;
  pendingLeaves?: number;
}) {
  return (
    <nav
      aria-label="Sections équipe"
      className="flex flex-wrap items-center gap-1 border-b border-[var(--line)]"
    >
      {EQUIPE_TABS.map((tab) => {
        const isActive = tab === active;
        const label =
          tab === "conges" && pendingLeaves > 0
            ? `${EQUIPE_TAB_LABELS[tab]} (${pendingLeaves})`
            : EQUIPE_TAB_LABELS[tab];
        return (
          <Link
            key={tab}
            href={equipeHref(tab)}
            className={cn(
              "px-4 py-3 text-sm tracking-wide transition-colors",
              isActive
                ? "border-b-2 border-[var(--ink)] text-[var(--ink)] -mb-px"
                : "text-[var(--ink-muted)] hover:text-[var(--ink)]",
            )}
            aria-current={isActive ? "page" : undefined}
          >
            {label}
          </Link>
        );
      })}
      <div className="flex-1" />
      {active !== "invitations" ? (
        <Link
          href={equipeHref("invitations")}
          className="mb-px px-4 py-3 text-xs tracking-wide uppercase text-[var(--accent-warm)] hover:text-[var(--ink)] transition-colors"
        >
          + Inviter
        </Link>
      ) : null}
    </nav>
  );
}
