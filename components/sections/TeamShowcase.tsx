"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const EASE = [0.22, 1, 0.36, 1] as const;
const SWIPE_THRESHOLD = 50;
const SWIPE_VELOCITY = 400;

/** Offset circulaire le plus court vers l’actif (−n/2 … +n/2). */
function relativeOffset(index: number, active: number, count: number) {
  let diff = index - active;
  if (diff > Math.floor(count / 2)) diff -= count;
  if (diff < -Math.floor(count / 2)) diff += count;
  return diff;
}

export function TeamShowcase() {
  const { eyebrow, title, description, footnote, members } = home.team;
  const count = members.length;
  const [active, setActive] = useState(0);
  const reduceMotion = useReducedMotion();
  const regionRef = useRef<HTMLDivElement | null>(null);

  const goTo = useCallback(
    (next: number) => {
      if (count === 0) return;
      setActive(((next % count) + count) % count);
    },
    [count],
  );

  const prev = useCallback(() => goTo(active - 1), [goTo, active]);
  const next = useCallback(() => goTo(active + 1), [goTo, active]);

  useEffect(() => {
    const node = regionRef.current;
    if (!node) return;
    const onKey = (event: KeyboardEvent) => {
      if (event.key === "ArrowRight") {
        event.preventDefault();
        next();
      } else if (event.key === "ArrowLeft") {
        event.preventDefault();
        prev();
      }
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [next, prev]);

  const activeMember = members[active];

  return (
    <section className="relative bg-[var(--bg)]">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
      />
      <Container size="wide" className="py-16 md:py-24 lg:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </Reveal>
        </div>

        <Reveal delay={120} className="mt-14">
          <div
            ref={regionRef}
            tabIndex={0}
            role="region"
            aria-roledescription="carrousel"
            aria-label="Équipe du laboratoire"
            className="relative outline-none"
          >
            <div className="relative mx-auto h-[min(82vw,360px)] sm:h-[400px] md:h-[440px] lg:h-[480px] w-full touch-pan-y">
              {members.map((member, index) => {
                const offset = relativeOffset(index, active, count);
                const abs = Math.abs(offset);
                const isActive = offset === 0;
                const visible = abs <= 1;

                return (
                  <motion.div
                    key={member.name + index}
                    className={cn(
                      "absolute top-0 left-1/2 h-full w-[min(82vw,360px)] sm:w-[400px] md:w-[440px] lg:w-[480px]",
                      visible ? "pointer-events-auto" : "pointer-events-none",
                    )}
                    initial={false}
                    animate={{
                      x: `calc(-50% + ${offset * 92}%)`,
                      scale: isActive ? 1 : 0.88,
                      opacity: !visible ? 0 : isActive ? 1 : 0.72,
                      filter: reduceMotion
                        ? "blur(0px)"
                        : isActive
                          ? "blur(0px)"
                          : "blur(2px)",
                      zIndex: 10 - abs,
                    }}
                    transition={{ duration: reduceMotion ? 0.16 : 0.4, ease: EASE }}
                    drag={isActive ? "x" : false}
                    dragConstraints={{ left: 0, right: 0 }}
                    dragElastic={0.18}
                    onDragEnd={(_, info) => {
                      if (
                        info.offset.x < -SWIPE_THRESHOLD ||
                        info.velocity.x < -SWIPE_VELOCITY
                      ) {
                        next();
                      } else if (
                        info.offset.x > SWIPE_THRESHOLD ||
                        info.velocity.x > SWIPE_VELOCITY
                      ) {
                        prev();
                      }
                    }}
                    onClick={() => {
                      if (!isActive) goTo(index);
                    }}
                    aria-hidden={!isActive}
                  >
                    <div
                      className={cn(
                        "overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)]",
                        isActive ? "cursor-grab active:cursor-grabbing" : "cursor-pointer",
                      )}
                    >
                      <VisualPlaceholder
                        ratio="square"
                        tone={member.tone ?? "cool"}
                        photoKey={member.photoKey}
                        caption={member.role}
                        alt={`${member.name} — ${member.role}`}
                        priority={index === 0}
                      />
                    </div>
                  </motion.div>
                );
              })}
            </div>

            <div className="mt-4 flex flex-col items-center gap-4 md:mt-5">
              <div
                aria-live="polite"
                className="flex flex-col items-center gap-1 text-center"
              >
                <h3 className="font-serif text-xl md:text-2xl text-[var(--ink)]">
                  {activeMember?.name}
                </h3>
                <p className="text-sm text-[var(--ink-muted)]">{activeMember?.role}</p>
                {activeMember?.bio ? (
                  <p className="mt-1 max-w-md text-sm text-[var(--ink-muted)] leading-relaxed">
                    {activeMember.bio}
                  </p>
                ) : null}
              </div>

              <div className="flex items-center gap-4">
                <button
                  type="button"
                  onClick={prev}
                  aria-label="Membre précédent"
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)]",
                    "transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97]",
                    "fine-hover:hover:border-[var(--ink)]",
                    "hidden md:inline-flex",
                  )}
                >
                  <svg width="14" height="12" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path
                      d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>

                <div className="flex items-center gap-2" aria-hidden="true">
                  {members.map((_, index) => (
                    <span
                      key={index}
                      className={cn(
                        "block h-1.5 rounded-full transition-[width,background-color] duration-200 ease-out",
                        index === active
                          ? "w-6 bg-[var(--accent)]"
                          : "w-1.5 bg-[var(--line-strong)]",
                      )}
                    />
                  ))}
                </div>

                <button
                  type="button"
                  onClick={next}
                  aria-label="Membre suivant"
                  className={cn(
                    "inline-flex h-11 w-11 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)]",
                    "transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97]",
                    "fine-hover:hover:border-[var(--ink)]",
                    "hidden md:inline-flex",
                  )}
                >
                  <svg width="14" height="12" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path
                      d="M0 5H12M12 5L8.5 1.5M12 5L8.5 8.5"
                      stroke="currentColor"
                      strokeWidth="1.4"
                    />
                  </svg>
                </button>
              </div>

              <p className="text-xs text-[var(--ink-discreet)] md:hidden">
                Glissez pour parcourir l’équipe
              </p>
            </div>
          </div>
        </Reveal>

        {footnote ? (
          <Reveal delay={200}>
            <p className="mt-12 text-xs text-[var(--ink-discreet)] tracking-wide">
              {footnote}
            </p>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}
