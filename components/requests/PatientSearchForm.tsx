import {
  clearPatientFilter,
  setPatientFilter,
} from "@/app/espace-praticien/actions/patient-filter";
import type { PatientFilterScope } from "@/lib/requests/patient-filter";
import { cn } from "@/lib/cn";

type PatientSearchFormProps = {
  scope: PatientFilterScope;
  /** Chemin de retour sans `patient` (status / sector / page conservés). */
  redirectTo: string;
  defaultValue: string;
  className?: string;
};

export function PatientSearchForm({
  scope,
  redirectTo,
  defaultValue,
  className,
}: PatientSearchFormProps) {
  return (
    <form
      action={setPatientFilter}
      className={cn(
        "flex flex-col gap-2 sm:flex-row sm:items-end sm:gap-3",
        className,
      )}
    >
      <input type="hidden" name="scope" value={scope} />
      <input type="hidden" name="redirect_to" value={redirectTo} />
      <label className="flex flex-col gap-1.5 flex-1 max-w-md">
        <span className="text-eyebrow">Patient</span>
        <input
          type="search"
          name="patient"
          defaultValue={defaultValue}
          placeholder="Début du nom du patient…"
          autoComplete="off"
          maxLength={120}
          className={cn(
            "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
            "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
          )}
        />
      </label>
      <button
        type="submit"
        className="self-start sm:self-auto px-4 py-2.5 text-xs uppercase tracking-[0.16em] border border-[var(--line-strong)] text-[var(--ink)] hover:border-[var(--ink)] transition-colors"
      >
        Rechercher
      </button>
      {defaultValue ? (
        <button
          type="submit"
          formAction={clearPatientFilter}
          className="self-start sm:self-auto px-3 py-2.5 text-xs uppercase tracking-[0.16em] text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
        >
          Effacer
        </button>
      ) : null}
    </form>
  );
}
