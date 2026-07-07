import { cn } from "@/lib/cn";
import { Reveal } from "@/components/ui/Reveal";

type ProcessStep = {
  title: string;
  description?: string;
};

type ProductionChainDiagramProps = {
  steps: ProcessStep[];
  eyebrow?: string;
  footnote?: string;
  className?: string;
};

/**
 * ProductionChainDiagram — Schéma illustré de la chaîne de production,
 * pensé comme un substitut graphique à une photo : étapes numérotées,
 * reliées par des flèches, dans la charte noir / rose du laboratoire.
 */
export function ProductionChainDiagram({
  steps,
  eyebrow,
  footnote,
  className,
}: ProductionChainDiagramProps) {
  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden grain bg-[var(--bg-deep-soft)] px-5 py-8 sm:px-7 sm:py-9 md:px-10 md:py-11",
        className,
      )}
    >
      {eyebrow ? (
        <span className="text-eyebrow flex items-center gap-3 text-[var(--accent-warm-soft)]">
          <span
            aria-hidden="true"
            className="h-px w-8 bg-[var(--accent-warm)]"
          />
          {eyebrow}
        </span>
      ) : null}

      <ol className={cn("relative flex flex-col", eyebrow && "mt-8")}>
        {steps.map((step, index) => {
          const isLast = index === steps.length - 1;
          return (
            <Reveal
              as="li"
              key={step.title}
              delay={index * 90}
              variant="fade"
              className={cn("relative flex items-stretch gap-5", !isLast && "pb-8")}
            >
              <div className="flex flex-col items-center">
                <span className="flex h-11 w-11 shrink-0 items-center justify-center rounded-full border border-[var(--accent-warm)] text-numeral font-serif text-[0.95rem] text-[var(--accent-warm-soft)]">
                  {String(index + 1).padStart(2, "0")}
                </span>
                {!isLast ? (
                  <span
                    aria-hidden="true"
                    className="mt-1.5 flex flex-1 flex-col items-center"
                  >
                    <span className="w-px flex-1 bg-gradient-to-b from-[var(--accent-warm)]/50 to-[var(--accent-warm)]/15" />
                    <svg
                      width="10"
                      height="8"
                      viewBox="0 0 10 8"
                      fill="none"
                      className="shrink-0 -mt-px text-[var(--accent-warm)]"
                    >
                      <path
                        d="M1 3.5L5 7.5L9 3.5"
                        stroke="currentColor"
                        strokeWidth="1.2"
                      />
                    </svg>
                  </span>
                ) : null}
              </div>

              <div className="pt-1">
                <h3 className="font-serif text-base md:text-lg text-white leading-snug transition-colors hover:text-[var(--accent-warm)]">
                  {step.title}
                </h3>
                {step.description ? (
                  <p className="mt-1.5 text-sm text-white/55 leading-relaxed text-pretty">
                    {step.description}
                  </p>
                ) : null}
              </div>
            </Reveal>
          );
        })}
      </ol>

      {footnote ? (
        <div className="relative mt-8 flex items-center gap-3 border-t border-white/10 pt-6 text-xs sm:text-[0.65rem] uppercase tracking-widest sm:tracking-[0.18em] text-white/40">
          <span
            aria-hidden="true"
            className="h-1.5 w-1.5 rounded-full bg-[var(--accent-warm)]"
          />
          {footnote}
        </div>
      ) : null}
    </figure>
  );
}
