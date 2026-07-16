"use client";

import { useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { Container } from "@/components/ui/Container";
import { Reveal } from "@/components/ui/Reveal";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { cn } from "@/lib/cn";

type WorkflowStep = {
  title: string;
  description: string;
  photoKey?: string;
};

type Section = {
  eyebrow?: string;
  title: string;
  body: string;
  items?: WorkflowStep[];
};

type Props = {
  section: Section;
};

const springTransition = { type: "spring", stiffness: 300, damping: 30 } as const;

/**
 * FluxNumeriqueWorkflow — Timeline scrollytelling desktop / grille classique mobile.
 *
 * Desktop (lg+) : deux colonnes. Colonne gauche = 4 étapes en cartes verticales
 * de scroll normal (pas de scroll-jack, pas de position:fixed). Colonne droite =
 * un panneau sticky affichant le visuel de l'étape active, détectée via
 * IntersectionObserver. Le crossfade utilise AnimatePresence + layoutId pour
 * un morphing doux entre visuels — même pattern que CaseJourney.
 *
 * Mobile / tablette (<lg) : chaque étape affiche son visuel inline, empilé ;
 * aucun IntersectionObserver requis, aucune surcharge JS.
 */
export function FluxNumeriqueWorkflow({ section }: Props) {
  const steps = section.items ?? [];
  const [activeIndex, setActiveIndex] = useState(0);
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (steps.length === 0) return;

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!isDesktop || motionQuery.matches) return;

    const observer = new IntersectionObserver(
      (entries) => {
        // On garde l'étape la plus visible dans la moitié haute du viewport.
        let bestIndex = -1;
        let bestRatio = 0;
        entries.forEach((entry) => {
          if (entry.isIntersecting && entry.intersectionRatio > bestRatio) {
            const idx = Number(
              (entry.target as HTMLElement).dataset.stepIndex ?? "-1",
            );
            if (idx >= 0) {
              bestRatio = entry.intersectionRatio;
              bestIndex = idx;
            }
          }
        });
        if (bestIndex >= 0) setActiveIndex(bestIndex);
      },
      {
        threshold: [0.4, 0.6, 0.8],
        rootMargin: "-30% 0px -30% 0px",
      },
    );

    stepRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    return () => observer.disconnect();
  }, [steps.length]);

  if (steps.length === 0) return null;

  const active = steps[activeIndex] ?? steps[0];

  return (
    <section
      id="workflow"
      className="bg-[var(--bg)] border-b border-[var(--line)] scroll-mt-24"
    >
      <Container size="wide" className="py-14 md:py-20 lg:py-28">
        <div className="grid gap-10 lg:gap-16 lg:grid-cols-12 items-end">
          <Reveal className="lg:col-span-7 flex flex-col gap-4">
            <span className="text-numeral text-eyebrow text-[var(--accent-warm)]">
              02 — {section.eyebrow}
            </span>
            <h2 className="text-display text-2xl md:text-3xl lg:text-[2.25rem] text-balance">
              {section.title}
            </h2>
          </Reveal>
          <Reveal delay={100} className="lg:col-span-5">
            <p className="text-[var(--ink-muted)] leading-relaxed text-pretty">
              {section.body}
            </p>
          </Reveal>
        </div>

        <div className="mt-14 md:mt-16 grid gap-10 lg:gap-16 lg:grid-cols-12 items-start">
          <ol className="lg:col-span-6 flex flex-col gap-4 lg:gap-8">
            {steps.map((step, index) => {
              const selected = index === activeIndex;
              return (
                <li
                  key={step.title}
                  ref={(node) => {
                    stepRefs.current[index] = node;
                  }}
                  data-step-index={index}
                  className={cn(
                    "relative border bg-[var(--bg-elevated)] p-6 md:p-7 lg:p-8 transition-colors duration-500",
                    selected
                      ? "border-[var(--accent)]"
                      : "border-[var(--line)]",
                  )}
                >
                  <div className="flex items-start gap-4 sm:gap-6">
                    <span
                      className={cn(
                        "text-numeral text-display text-2xl sm:text-3xl md:text-4xl leading-none transition-colors duration-500",
                        selected
                          ? "text-[var(--accent)]"
                          : "text-[var(--ink-discreet)]",
                      )}
                    >
                      {String(index + 1).padStart(2, "0")}
                    </span>
                    <div className="flex flex-col gap-3 flex-1 min-w-0">
                      <h3 className="font-serif text-lg text-[var(--ink)]">
                        {step.title}
                      </h3>
                      <p className="text-sm text-[var(--ink-muted)] leading-relaxed">
                        {step.description}
                      </p>
                    </div>
                  </div>

                  {/* Visuel inline — mobile / tablette uniquement. */}
                  {step.photoKey ? (
                    <div className="mt-5 lg:hidden">
                      <VisualPlaceholder
                        caption={step.title}
                        photoKey={step.photoKey}
                        ratio="landscape"
                        tone="cool"
                      />
                    </div>
                  ) : null}
                </li>
              );
            })}
          </ol>

          {/* Panneau sticky — desktop uniquement. */}
          <div className="hidden lg:block lg:col-span-6">
            <div className="sticky top-24 flex flex-col gap-4">
              <div className="relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.title}
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <motion.div
                      layoutId="flux-workflow-visual"
                      transition={springTransition}
                    >
                      <VisualPlaceholder
                        caption={active.title}
                        photoKey={active.photoKey}
                        ratio="landscape"
                        tone="cool"
                      />
                    </motion.div>
                  </motion.div>
                </AnimatePresence>
              </div>

              <div className="flex items-center gap-3 pt-2">
                {steps.map((_, i) => (
                  <span
                    key={i}
                    aria-hidden="true"
                    className={cn(
                      "block h-1 rounded-full transition-all duration-500",
                      i === activeIndex
                        ? "w-8 bg-[var(--accent)]"
                        : "w-4 bg-[var(--line-strong)]",
                    )}
                  />
                ))}
                <span className="ml-auto text-xs text-[var(--ink-discreet)] tracking-wide">
                  Étape {String(activeIndex + 1).padStart(2, "0")} sur{" "}
                  {String(steps.length).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
