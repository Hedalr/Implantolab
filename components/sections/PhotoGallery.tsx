"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { AnimatePresence, motion } from "framer-motion";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

const AUTOPLAY_DELAY = 5000;

/**
 * PhotoGallery — "L'atelier" en images.
 *
 * Au lieu d'une simple mosaïque statique, on fait défiler les photos de
 * l'atelier dans l'ordre du process de fabrication (conception → usinage →
 * matériaux → finition → contrôle → équipe). Navigation par étapes, flèches
 * ou défilement automatique, avec transition morphing entre les visuels.
 */
export function PhotoGallery() {
  const { eyebrow, title, description, photos } = home.gallery;
  const [index, setIndex] = useState(0);
  const [paused, setPaused] = useState(false);
  const reducedMotionRef = useRef(false);
  const active = photos[index];

  useEffect(() => {
    reducedMotionRef.current = window.matchMedia(
      "(prefers-reduced-motion: reduce)",
    ).matches;
  }, []);

  useEffect(() => {
    if (paused || reducedMotionRef.current) return;
    const timer = window.setInterval(() => {
      setIndex((current) => (current + 1) % photos.length);
    }, AUTOPLAY_DELAY);
    return () => window.clearInterval(timer);
  }, [paused, photos.length]);

  const goTo = useCallback((next: number) => {
    setIndex(((next % photos.length) + photos.length) % photos.length);
  }, [photos.length]);

  return (
    <section className="relative bg-[var(--bg)] overflow-hidden">
      <Container size="wide" className="py-24 md:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <SectionHeading eyebrow={eyebrow} title={title} description={description} />
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div
            className="mt-16 grid gap-10 lg:gap-14 lg:grid-cols-12 items-stretch"
            onMouseEnter={() => setPaused(true)}
            onMouseLeave={() => setPaused(false)}
            onFocus={() => setPaused(true)}
            onBlur={() => setPaused(false)}
          >
            <div
              role="tablist"
              aria-label="Étapes du process de l’atelier"
              className="lg:col-span-4 flex lg:flex-col gap-1 overflow-x-auto lg:overflow-visible -mx-1 px-1 lg:mx-0 lg:px-0"
            >
              {photos.map((photo, i) => {
                const selected = i === index;
                return (
                  <button
                    key={photo.caption}
                    type="button"
                    role="tab"
                    aria-selected={selected}
                    aria-controls={`atelier-stage-${i}`}
                    onClick={() => goTo(i)}
                    className={cn(
                      "group relative flex shrink-0 lg:shrink items-start gap-4 text-left px-4 py-4 border-l-2 transition-colors",
                      selected
                        ? "border-[var(--accent)] bg-[var(--bg-elevated)]"
                        : "border-transparent hover:bg-[var(--bg-elevated)]",
                    )}
                  >
                    {selected ? (
                      <motion.span
                        layoutId="atelier-active-rail"
                        className="absolute inset-y-0 -left-[2px] w-[2px] bg-[var(--accent)]"
                        transition={{ type: "spring", stiffness: 320, damping: 32 }}
                      />
                    ) : null}
                    <span
                      className={cn(
                        "text-numeral text-xs mt-0.5 tracking-wide transition-colors",
                        selected ? "text-[var(--accent)]" : "text-[var(--ink-discreet)]",
                      )}
                    >
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="flex flex-col gap-1 min-w-[9rem] lg:min-w-0">
                      <span
                        className={cn(
                          "text-sm tracking-wide transition-colors",
                          selected
                            ? "text-[var(--ink)]"
                            : "text-[var(--ink-muted)] group-hover:text-[var(--ink)]",
                        )}
                      >
                        {photo.step}
                      </span>
                      <span className="hidden lg:block text-xs text-[var(--ink-discreet)] leading-relaxed">
                        {photo.description}
                      </span>
                    </span>
                  </button>
                );
              })}
            </div>

            <div className="lg:col-span-8">
              <div className="photo-lift relative overflow-hidden">
                <AnimatePresence mode="wait" initial={false}>
                  <motion.div
                    key={active.caption}
                    id={`atelier-stage-${index}`}
                    role="tabpanel"
                    initial={{ opacity: 0, scale: 1.03 }}
                    animate={{ opacity: 1, scale: 1 }}
                    exit={{ opacity: 0, scale: 0.98 }}
                    transition={{ duration: 0.5, ease: [0.22, 1, 0.36, 1] }}
                  >
                    <VisualPlaceholder
                      caption={active.step}
                      photoKey={active.caption}
                      ratio={active.ratio}
                      tone={active.tone}
                      priority={index === 0}
                    />
                  </motion.div>
                </AnimatePresence>

                <button
                  type="button"
                  aria-label="Étape précédente"
                  onClick={() => goTo(index - 1)}
                  className="absolute left-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
                <button
                  type="button"
                  aria-label="Étape suivante"
                  onClick={() => goTo(index + 1)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-black/30 text-white backdrop-blur-sm transition-colors hover:bg-black/50"
                >
                  <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path d="M0 5H12M12 5L8.5 1.5M12 5L8.5 8.5" stroke="currentColor" strokeWidth="1.4" />
                  </svg>
                </button>
              </div>

              <div className="mt-5 flex items-center justify-between gap-4">
                <p className="text-sm text-[var(--ink-muted)] leading-relaxed lg:hidden">
                  {active.description}
                </p>
                <div className="flex gap-2" role="presentation">
                  {photos.map((photo, i) => (
                    <button
                      key={photo.caption}
                      type="button"
                      aria-label={`Aller à l’étape ${i + 1} — ${photo.step}`}
                      onClick={() => goTo(i)}
                      className="p-1.5"
                    >
                      <span
                        className={cn(
                          "block h-1.5 rounded-full transition-all",
                          i === index
                            ? "w-6 bg-[var(--accent)]"
                            : "w-1.5 bg-[var(--line-strong)]",
                        )}
                      />
                    </button>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </Reveal>
      </Container>

      {/* Ligne séparatrice douce, remplace le border-b brut */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
      />
    </section>
  );
}
