"use client";

import { useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { caseJourney } from "@/content/fr/pages";
import { cn } from "@/lib/cn";

const springTransition = { type: "spring", stiffness: 320, damping: 32 } as const;

/**
 * CaseJourney — Parcours cas clinique interactif.
 *
 * Tabs "Scan → Design → Usinage → Livraison" avec un indicateur d'étape et
 * un visuel qui se morphent d'une étape à l'autre via des layoutId
 * framer-motion (shared layout animation), plutôt qu'un simple crossfade.
 */
export function CaseJourney() {
  const { eyebrow, title, description, steps } = caseJourney;
  const [activeKey, setActiveKey] = useState(steps[0].key);
  const activeIndex = steps.findIndex((step) => step.key === activeKey);
  const active = steps[activeIndex] ?? steps[0];

  return (
    <section className="relative bg-[var(--bg-elevated)] border-b border-[var(--line)] overflow-hidden">
      <Container size="wide" className="py-24 md:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <SectionHeading eyebrow={eyebrow} title={title} description={description} />
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div
            role="tablist"
            aria-label="Étapes du parcours d’un cas clinique"
            className="relative mt-16 grid grid-cols-4 gap-2 md:gap-4"
          >
            <div
              aria-hidden="true"
              className="absolute left-0 right-0 top-5 hidden h-px bg-[var(--line)] md:block"
            />
            <motion.div
              aria-hidden="true"
              className="absolute top-5 left-0 hidden h-px bg-[var(--accent)] md:block"
              animate={{
                width: `${(activeIndex / (steps.length - 1)) * 100}%`,
              }}
              transition={springTransition}
            />

            {steps.map((step, index) => {
              const selected = step.key === activeKey;
              return (
                <button
                  key={step.key}
                  type="button"
                  role="tab"
                  aria-selected={selected}
                  aria-controls={`journey-panel-${step.key}`}
                  id={`journey-tab-${step.key}`}
                  onClick={() => setActiveKey(step.key)}
                  className="group relative z-10 flex flex-col items-center gap-3 text-center"
                >
                  <span className="relative flex h-9 w-9 md:h-11 md:w-11 items-center justify-center rounded-full border border-[var(--line-strong)] bg-[var(--bg-elevated)] transition-colors group-hover:border-[var(--accent)]">
                    {selected ? (
                      <motion.span
                        layoutId="journey-active-dot"
                        className="absolute inset-0 rounded-full bg-[var(--accent)]"
                        transition={springTransition}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "text-numeral relative z-10 text-xs md:text-sm transition-colors",
                        selected ? "text-white" : "text-[var(--ink-muted)] group-hover:text-[var(--ink)]",
                      )}
                    >
                      {index + 1}
                    </span>
                  </span>
                  <span
                    className={cn(
                      "text-xs md:text-sm tracking-wide transition-colors",
                      selected ? "text-[var(--ink)]" : "text-[var(--ink-discreet)] group-hover:text-[var(--ink)]",
                    )}
                  >
                    {step.label}
                  </span>
                </button>
              );
            })}
          </div>
        </Reveal>

        <div className="relative mt-14 md:mt-16 min-h-[420px] md:min-h-[380px]">
          <AnimatePresence mode="wait">
            <motion.div
              key={active.key}
              id={`journey-panel-${active.key}`}
              role="tabpanel"
              aria-labelledby={`journey-tab-${active.key}`}
              initial={{ opacity: 0, y: 16 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -16 }}
              transition={{ duration: 0.35, ease: [0.22, 1, 0.36, 1] }}
              className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-start"
            >
              <div className="lg:col-span-5 order-2 lg:order-1">
                <motion.div layoutId="journey-visual" transition={springTransition}>
                  <VisualPlaceholder photoKey={active.photoKey} ratio="portrait" tone="deep" />
                </motion.div>
              </div>

              <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-8">
                <div className="flex flex-col gap-3">
                  <span className="text-eyebrow flex items-center gap-3 text-[var(--accent-warm)]">
                    <span aria-hidden="true" className="h-px w-8 bg-[var(--accent-warm)]" />
                    Étape {active.number} — {active.duration}
                  </span>
                  <h3 className="text-display text-3xl md:text-4xl text-[var(--ink)] text-balance">
                    {active.title}
                  </h3>
                  <p className="text-[var(--ink-muted)] text-lg leading-relaxed text-pretty max-w-2xl">
                    {active.description}
                  </p>
                </div>

                <ul className="grid gap-4 sm:grid-cols-2 border-t border-[var(--line)] pt-6">
                  {active.details.map((detail) => (
                    <li
                      key={detail}
                      className="flex items-start gap-3 text-sm text-[var(--ink)] leading-relaxed"
                    >
                      <span aria-hidden="true" className="mt-2 h-px w-4 bg-[var(--accent-warm)] shrink-0" />
                      <span>{detail}</span>
                    </li>
                  ))}
                </ul>

                <div className="flex items-center gap-4 pt-2">
                  <button
                    type="button"
                    onClick={() => setActiveKey(steps[Math.max(activeIndex - 1, 0)].key)}
                    disabled={activeIndex === 0}
                    className="inline-flex items-center gap-2 text-sm tracking-wide text-[var(--ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--accent)] transition-colors"
                  >
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                      <path d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                    Précédent
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      setActiveKey(steps[Math.min(activeIndex + 1, steps.length - 1)].key)
                    }
                    disabled={activeIndex === steps.length - 1}
                    className="inline-flex items-center gap-2 text-sm tracking-wide text-[var(--ink)] disabled:opacity-30 disabled:cursor-not-allowed hover:text-[var(--accent)] transition-colors"
                  >
                    Étape suivante
                    <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                      <path d="M0 5H12M12 5L8.5 1.5M12 5L8.5 8.5" stroke="currentColor" strokeWidth="1" />
                    </svg>
                  </button>
                </div>
              </div>
            </motion.div>
          </AnimatePresence>
        </div>

        <p className="mt-10 text-xs text-[var(--ink-discreet)] border-l border-[var(--line)] pl-4 max-w-2xl">
          Illustrations à partir de photos de prévisualisation en attendant les visuels définitifs
          du laboratoire.
        </p>
      </Container>
    </section>
  );
}
