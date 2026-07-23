"use client";

import { useCallback, useEffect, useRef, useState } from "react";
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

const panelVariants = {
  enter: (direction: number) => ({ opacity: 0, x: direction * 24 }),
  center: { opacity: 1, x: 0 },
  exit: (direction: number) => ({ opacity: 0, x: direction * -24 }),
} as const;

const SWIPE_DISTANCE_THRESHOLD = 60;
const SWIPE_VELOCITY_THRESHOLD = 400;

type DragInfo = {
  offset: { x: number; y: number };
  velocity: { x: number; y: number };
};

/**
 * FluxNumeriqueWorkflow — Timeline scrollytelling desktop / carrousel mobile.
 *
 * Un seul panneau visuel (image + flèches + progression) est repositionné
 * en CSS selon le breakpoint via `order` : au-dessus des étapes en mobile,
 * en colonne sticky à droite en desktop. Trois façons de le piloter :
 *  - clic sur une étape (tab) → met à jour l'image immédiatement (priorité sur le scroll)
 *  - flèches précédent/suivant sur le panneau
 *  - swipe tactile (drag horizontal) sur le panneau, mobile comme desktop
 *  - en complément, le scroll fait progresser l'étape active en desktop
 *    (IntersectionObserver + scroll), sans scroll-jacking ni position fixe.
 */
export function FluxNumeriqueWorkflow({ section }: Props) {
  const steps = section.items ?? [];
  const [{ activeIndex, direction }, setState] = useState({
    activeIndex: 0,
    direction: 1,
  });
  const stepRefs = useRef<Array<HTMLLIElement | null>>([]);
  /** Bloque l'IntersectionObserver après une action utilisateur (clic, flèche, swipe). */
  const userNavigatedUntilRef = useRef(0);

  const USER_NAV_LOCK_MS = 2000;

  const selectStepFromUser = useCallback((nextIndex: number) => {
    userNavigatedUntilRef.current = Date.now() + USER_NAV_LOCK_MS;
    setState((current) => {
      if (nextIndex === current.activeIndex) return current;
      return {
        activeIndex: nextIndex,
        direction: nextIndex > current.activeIndex ? 1 : -1,
      };
    });
  }, []);

  const selectStepFromScroll = useCallback((nextIndex: number) => {
    if (Date.now() < userNavigatedUntilRef.current) return;
    setState((current) => {
      if (nextIndex === current.activeIndex) return current;
      return {
        activeIndex: nextIndex,
        direction: nextIndex > current.activeIndex ? 1 : -1,
      };
    });
  }, []);

  const goTo = useCallback(
    (index: number) => selectStepFromUser(index),
    [selectStepFromUser],
  );
  const goNext = useCallback(
    () => selectStepFromUser((activeIndex + 1) % steps.length),
    [activeIndex, selectStepFromUser, steps.length],
  );
  const goPrev = useCallback(
    () =>
      selectStepFromUser((activeIndex - 1 + steps.length) % steps.length),
    [activeIndex, selectStepFromUser, steps.length],
  );

  const handleDragEnd = useCallback(
    (_event: unknown, info: DragInfo) => {
      if (
        info.offset.x < -SWIPE_DISTANCE_THRESHOLD ||
        info.velocity.x < -SWIPE_VELOCITY_THRESHOLD
      ) {
        goNext();
      } else if (
        info.offset.x > SWIPE_DISTANCE_THRESHOLD ||
        info.velocity.x > SWIPE_VELOCITY_THRESHOLD
      ) {
        goPrev();
      }
    },
    [goNext, goPrev],
  );

  useEffect(() => {
    if (typeof window === "undefined") return;
    if (steps.length === 0) return;

    const isDesktop = window.matchMedia("(min-width: 1024px)").matches;
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (!isDesktop || motionQuery.matches) return;

    const pickStepFromViewport = () => {
      if (Date.now() < userNavigatedUntilRef.current) return;

      const viewportMid = window.innerHeight * 0.42;
      let bestIndex = -1;
      let bestDistance = Infinity;

      stepRefs.current.forEach((node, idx) => {
        if (!node) return;
        const rect = node.getBoundingClientRect();
        if (rect.bottom <= 0 || rect.top >= window.innerHeight) return;

        const center = rect.top + rect.height / 2;
        const distance = Math.abs(center - viewportMid);
        if (distance < bestDistance) {
          bestDistance = distance;
          bestIndex = idx;
        }
      });

      if (bestIndex >= 0) {
        selectStepFromScroll(bestIndex);
      }
    };

    const observer = new IntersectionObserver(
      () => {
        pickStepFromViewport();
      },
      {
        threshold: [0, 0.15, 0.35, 0.55, 0.75, 1],
        rootMargin: "0px",
      },
    );

    stepRefs.current.forEach((node) => {
      if (node) observer.observe(node);
    });

    let rafId = 0;
    const onScroll = () => {
      if (rafId) return;
      rafId = window.requestAnimationFrame(() => {
        rafId = 0;
        pickStepFromViewport();
      });
    };
    window.addEventListener("scroll", onScroll, { passive: true });

    return () => {
      observer.disconnect();
      window.removeEventListener("scroll", onScroll);
      if (rafId) window.cancelAnimationFrame(rafId);
    };
  }, [steps.length, selectStepFromScroll]);

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

        <div className="mt-14 md:mt-16 flex flex-col lg:grid lg:gap-16 lg:grid-cols-12 lg:items-start">
          {/* Panneau visuel — au-dessus des étapes en mobile, colonne sticky
              à droite en desktop (repositionné en CSS, un seul élément). */}
          <div className="order-first lg:order-2 lg:col-span-6 lg:self-start">
            <div className="lg:sticky lg:top-24 flex flex-col gap-4 w-full">
              <motion.div
                id="flux-workflow-panel"
                role="tabpanel"
                aria-labelledby={`flux-workflow-tab-${activeIndex}`}
                className="relative overflow-hidden cursor-grab active:cursor-grabbing touch-pan-y"
                drag="x"
                dragConstraints={{ left: 0, right: 0 }}
                dragElastic={0.5}
                onDragEnd={handleDragEnd}
              >
                <AnimatePresence mode="wait" custom={direction} initial={false}>
                  <motion.div
                    key={active.title}
                    custom={direction}
                    variants={panelVariants}
                    initial="enter"
                    animate="center"
                    exit="exit"
                    transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
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

                <button
                  type="button"
                  aria-label="Étape précédente"
                  onClick={goPrev}
                  className="absolute left-3 sm:left-4 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Étape suivante"
                  onClick={goNext}
                  className="absolute right-3 sm:right-4 top-1/2 -translate-y-1/2 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path d="M0 5H12M12 5L8.5 1.5M12 5L8.5 8.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </motion.div>

              <div className="flex items-center gap-3 pt-2">
                {steps.map((step, i) => (
                  <button
                    key={step.title}
                    type="button"
                    aria-label={`Aller à l’étape ${i + 1} — ${step.title}`}
                    onClick={() => goTo(i)}
                    className="p-2 min-h-11 min-w-6 flex items-center justify-center"
                  >
                    <span
                      aria-hidden="true"
                      className={cn(
                        "block h-1 rounded-full transition-all duration-500",
                        i === activeIndex
                          ? "w-8 bg-[var(--accent)]"
                          : "w-4 bg-[var(--line-strong)]",
                      )}
                    />
                  </button>
                ))}
                <span className="ml-auto text-xs text-[var(--ink-discreet)] tracking-wide">
                  Étape {String(activeIndex + 1).padStart(2, "0")} sur{" "}
                  {String(steps.length).padStart(2, "0")}
                </span>
              </div>
            </div>
          </div>

          <ol
            role="tablist"
            aria-label="Étapes du flux numérique"
            className="order-last lg:order-1 lg:col-span-6 flex flex-col gap-4 lg:gap-8 mt-8 lg:mt-0 lg:pb-[min(42vh,22rem)]"
          >
            {steps.map((step, index) => {
              const selected = index === activeIndex;
              return (
                <li
                  key={step.title}
                  ref={(node) => {
                    stepRefs.current[index] = node;
                  }}
                  data-step-index={index}
                >
                  <button
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls="flux-workflow-panel"
                    id={`flux-workflow-tab-${index}`}
                    onClick={() => goTo(index)}
                    className={cn(
                      "group relative w-full text-left border bg-[var(--bg-elevated)] p-6 md:p-7 lg:p-8 transition-colors duration-500",
                      selected
                        ? "border-[var(--accent)]"
                        : "border-[var(--line)] hover:border-[var(--line-strong)]",
                    )}
                  >
                    <div className="flex items-start gap-4 sm:gap-6">
                      <span
                        className={cn(
                          "text-numeral text-display text-2xl sm:text-3xl md:text-4xl leading-none transition-colors duration-500",
                          selected
                            ? "text-[var(--accent)]"
                            : "text-[var(--ink-discreet)] group-hover:text-[var(--ink-muted)]",
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
                  </button>
                </li>
              );
            })}
          </ol>
        </div>
      </Container>
    </section>
  );
}
