import { cn } from "@/lib/cn";
import {
  createSector,
  deleteSector,
  updateSector,
} from "@/app/espace-praticien/admin/employes/actions";
import { Button } from "@/components/ui/Button";
import { FormField } from "@/components/espace-praticien/FormField";

const inputStyle = cn(
  "w-full bg-transparent border-b border-[var(--line-strong)] py-2.5 text-base text-[var(--ink)]",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none focus:border-[var(--ink)] transition-colors",
);

export type EquipeSectorCard = {
  id: string;
  name: string;
  color: string;
  memberCount: number;
  chefCount: number;
};

export function EquipeSectorsPanel({ sectors }: { sectors: EquipeSectorCard[] }) {
  return (
    <div className="flex flex-col gap-8">
      <section className="bg-[var(--bg-elevated)] border border-[var(--line)] p-6 md:p-8 max-w-xl">
        <p className="text-eyebrow">Nouveau</p>
        <h2 className="mt-1 font-serif text-xl text-[var(--ink)]">
          Créer un secteur
        </h2>
        <p className="mt-2 text-sm text-[var(--ink-muted)] leading-relaxed">
          Deux employés du même secteur ne pourront pas poser de congés qui se
          chevauchent.
        </p>
        <form action={createSector} className="mt-5 flex flex-col gap-5">
          <input type="hidden" name="return_tab" value="secteurs" />
          <FormField label="Nom du secteur" htmlFor="sector-name" required>
            <input
              id="sector-name"
              name="name"
              required
              minLength={2}
              maxLength={80}
              placeholder="Prothèse fixe"
              className={inputStyle}
            />
          </FormField>
          <FormField label="Couleur" htmlFor="sector-color" required>
            <input
              id="sector-color"
              name="color"
              type="color"
              defaultValue="#2563eb"
              className="h-10 w-20 cursor-pointer border border-[var(--line-strong)] bg-transparent"
            />
          </FormField>
          <Button type="submit" variant="primary">
            Créer le secteur
          </Button>
        </form>
      </section>

      {sectors.length === 0 ? (
        <p className="py-8 text-sm text-[var(--ink-discreet)] text-center border border-dashed border-[var(--line-strong)]">
          Aucun secteur enregistré pour l’instant.
        </p>
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {sectors.map((s) => (
            <article
              key={s.id}
              className="bg-[var(--bg-elevated)] border border-[var(--line)] p-5 flex flex-col gap-4"
            >
              <div className="flex items-start gap-3">
                <span
                  aria-hidden="true"
                  className="mt-1 inline-block h-4 w-4 shrink-0 border border-[var(--line-strong)]"
                  style={{ backgroundColor: s.color }}
                />
                <div className="min-w-0">
                  <h3 className="font-serif text-lg text-[var(--ink)] truncate">
                    {s.name}
                  </h3>
                  <p className="mt-1 text-sm text-[var(--ink-muted)]">
                    {s.memberCount} personne{s.memberCount !== 1 ? "s" : ""}
                    {s.chefCount > 0
                      ? ` · ${s.chefCount} chef${s.chefCount > 1 ? "s" : ""}`
                      : ""}
                  </p>
                </div>
              </div>

              <form
                action={updateSector}
                className="flex flex-wrap items-center gap-3"
              >
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="return_tab" value="secteurs" />
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
                  className={cn(inputStyle, "flex-1 min-w-28 py-1.5")}
                  aria-label={`Nom du secteur ${s.name}`}
                />
                <button
                  type="submit"
                  className="text-xs tracking-wide uppercase text-[var(--ink-muted)] hover:text-[var(--ink)] transition-colors"
                >
                  Enregistrer
                </button>
              </form>

              <form action={deleteSector} className="pt-1">
                <input type="hidden" name="id" value={s.id} />
                <input type="hidden" name="return_tab" value="secteurs" />
                <button
                  type="submit"
                  className="text-xs tracking-wide uppercase text-[var(--ink-discreet)] hover:text-[var(--accent-warm)] transition-colors"
                >
                  Supprimer
                </button>
              </form>
            </article>
          ))}
        </div>
      )}
    </div>
  );
}
