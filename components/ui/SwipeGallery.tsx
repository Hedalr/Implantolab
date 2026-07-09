"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import Image from "next/image";
import { AnimatePresence, motion } from "framer-motion";
import { cn } from "@/lib/cn";

export type GallerySlide =
  | { type: "image"; src: string; alt: string; caption?: string }
  | { type: "video"; src: string; poster?: string; caption?: string };

type Ratio = "portrait" | "landscape" | "square";

type SwipeGalleryProps = {
  slides: GallerySlide[];
  ratio?: Ratio;
  className?: string;
  /** Légende de contexte affichée en surimpression (ex. nom du cas). */
  label?: string;
};

const ratioMap: Record<Ratio, string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[4/3]",
  square: "aspect-square",
};

const SWIPE_THRESHOLD = 60;
/** Au-delà de ce déplacement, on considère que c'est un swipe et non un clic. */
const CLICK_MOVE_TOLERANCE = 8;

/**
 * SwipeGallery — carrousel léger avec navigation au swipe (tactile + drag
 * souris), flèches, points et clavier. Seule la slide active est montée, ce
 * qui évite de charger toutes les images d'un coup (site plus léger).
 *
 * Rendu hybride : les visuels s'affichent en plein cadre (object-cover) pour
 * un rendu uniforme ; un clic ouvre la photo en plein écran (lightbox) où
 * elle est visible en entier (object-contain). Les slides peuvent être des
 * images ou une vidéo.
 */
export function SwipeGallery({
  slides,
  ratio = "landscape",
  className,
  label,
}: SwipeGalleryProps) {
  const [index, setIndex] = useState(0);
  const [direction, setDirection] = useState(0);
  const [lightbox, setLightbox] = useState(false);
  const [mounted, setMounted] = useState(false);
  const containerRef = useRef<HTMLDivElement | null>(null);
  const draggedRef = useRef(false);

  const count = slides.length;
  const active = slides[index];

  useEffect(() => setMounted(true), []);

  const goTo = useCallback(
    (next: number, dir: number) => {
      setDirection(dir);
      setIndex(((next % count) + count) % count);
    },
    [count],
  );

  const next = useCallback(() => goTo(index + 1, 1), [goTo, index]);
  const prev = useCallback(() => goTo(index - 1, -1), [goTo, index]);

  useEffect(() => {
    const node = containerRef.current;
    if (!node) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    node.addEventListener("keydown", onKey);
    return () => node.removeEventListener("keydown", onKey);
  }, [next, prev]);

  // Clavier + verrouillage du scroll quand la lightbox est ouverte.
  useEffect(() => {
    if (!lightbox) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setLightbox(false);
      else if (e.key === "ArrowRight") next();
      else if (e.key === "ArrowLeft") prev();
    };
    window.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      window.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [lightbox, next, prev]);

  if (count === 0) return null;

  return (
    <div
      ref={containerRef}
      tabIndex={0}
      role="group"
      aria-roledescription="carrousel"
      aria-label={label ?? "Galerie de réalisations"}
      className={cn("group relative outline-none", className)}
    >
      <div
        className={cn(
          "relative overflow-hidden bg-[var(--bg-elevated)]",
          ratioMap[ratio],
        )}
      >
        <AnimatePresence initial={false} custom={direction} mode="popLayout">
          <motion.div
            key={index}
            custom={direction}
            initial={{ opacity: 0, x: direction > 0 ? 40 : -40 }}
            animate={{ opacity: 1, x: 0 }}
            exit={{ opacity: 0, x: direction > 0 ? -40 : 40 }}
            transition={{ duration: 0.4, ease: [0.22, 1, 0.36, 1] }}
            drag="x"
            dragConstraints={{ left: 0, right: 0 }}
            dragElastic={0.2}
            onDragStart={() => {
              draggedRef.current = false;
            }}
            onDrag={(_, info) => {
              if (Math.abs(info.offset.x) > CLICK_MOVE_TOLERANCE) {
                draggedRef.current = true;
              }
            }}
            onDragEnd={(_, info) => {
              if (info.offset.x < -SWIPE_THRESHOLD) next();
              else if (info.offset.x > SWIPE_THRESHOLD) prev();
            }}
            className={cn(
              "absolute inset-0",
              active.type === "image"
                ? "cursor-zoom-in active:cursor-grabbing"
                : "cursor-grab active:cursor-grabbing",
            )}
          >
            {active.type === "image" ? (
              <button
                type="button"
                onClick={() => {
                  if (!draggedRef.current) setLightbox(true);
                }}
                aria-label="Agrandir la photo"
                className="absolute inset-0 h-full w-full"
              >
                <Image
                  src={active.src}
                  alt={active.alt}
                  fill
                  draggable={false}
                  sizes="(max-width: 768px) 100vw, (max-width: 1200px) 60vw, 640px"
                  className="object-cover select-none pointer-events-none"
                />
              </button>
            ) : (
              <video
                src={active.src}
                poster={active.poster}
                controls
                playsInline
                preload="metadata"
                className="absolute inset-0 h-full w-full object-cover bg-black"
              />
            )}
          </motion.div>
        </AnimatePresence>

        {label ? (
          <span className="pointer-events-none absolute left-3 top-3 z-10 bg-black/45 px-2.5 py-1 text-[0.65rem] uppercase tracking-[0.14em] text-white/90 backdrop-blur-sm">
            {label}
          </span>
        ) : null}

        {active.type === "image" ? (
          <span
            aria-hidden="true"
            className="pointer-events-none absolute bottom-3 right-3 z-10 flex h-8 w-8 items-center justify-center rounded-full bg-black/40 text-white opacity-0 backdrop-blur-sm transition-opacity group-hover:opacity-100"
          >
            <svg width="14" height="14" viewBox="0 0 16 16" fill="none" aria-hidden="true">
              <path d="M6.5 6.5L2 2M2 2V5.5M2 2H5.5M9.5 9.5L14 14M14 14V10.5M14 14H10.5" stroke="currentColor" strokeWidth="1.3" strokeLinecap="round" />
            </svg>
          </span>
        ) : null}

        {active.caption ? (
          <span className="pointer-events-none absolute bottom-3 left-3 right-14 z-10 text-[0.75rem] leading-snug text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.8)]">
            {active.caption}
          </span>
        ) : null}

        {count > 1 ? (
          <>
            <button
              type="button"
              aria-label="Image précédente"
              onClick={prev}
              className="absolute left-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:bg-black/55"
            >
              <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
            <button
              type="button"
              aria-label="Image suivante"
              onClick={next}
              className="absolute right-3 top-1/2 z-20 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-black/35 text-white backdrop-blur-sm transition-colors hover:bg-black/55 focus-visible:bg-black/55"
            >
              <svg width="12" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                <path d="M0 5H12M12 5L8.5 1.5M12 5L8.5 8.5" stroke="currentColor" strokeWidth="1.4" />
              </svg>
            </button>
          </>
        ) : null}

        <span className="pointer-events-none absolute right-3 top-3 z-10 bg-black/45 px-2 py-0.5 text-[0.65rem] tabular-nums tracking-wide text-white/90 backdrop-blur-sm">
          {index + 1} / {count}
        </span>
      </div>

      {count > 1 ? (
        <div className="mt-4 flex justify-center gap-1" role="presentation">
          {slides.map((slide, i) => (
            <button
              key={`${slide.type}-${i}`}
              type="button"
              aria-label={`Aller à l’image ${i + 1}`}
              aria-current={i === index}
              onClick={() => goTo(i, i > index ? 1 : -1)}
              className="flex min-h-11 min-w-11 items-center justify-center p-3"
            >
              <span
                className={cn(
                  "block h-1.5 rounded-full transition-all",
                  i === index ? "w-6 bg-[var(--accent)]" : "w-1.5 bg-[var(--line-strong)]",
                )}
              />
            </button>
          ))}
        </div>
      ) : null}

      {mounted && lightbox
        ? createPortal(
            <Lightbox
              slide={active}
              index={index}
              count={count}
              onClose={() => setLightbox(false)}
              onPrev={prev}
              onNext={next}
            />,
            document.body,
          )
        : null}
    </div>
  );
}

type LightboxProps = {
  slide: GallerySlide;
  index: number;
  count: number;
  onClose: () => void;
  onPrev: () => void;
  onNext: () => void;
};

function Lightbox({ slide, index, count, onClose, onPrev, onNext }: LightboxProps) {
  const draggedRef = useRef(false);

  return (
    <motion.div
      initial={{ opacity: 0 }}
      animate={{ opacity: 1 }}
      exit={{ opacity: 0 }}
      transition={{ duration: 0.2 }}
      role="dialog"
      aria-modal="true"
      aria-label="Photo agrandie"
      onClick={onClose}
      className="fixed inset-0 z-[100] flex items-center justify-center bg-black/90 p-4 sm:p-8"
    >
      <button
        type="button"
        aria-label="Fermer"
        onClick={onClose}
        className="absolute right-4 top-4 z-10 flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
          <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
        </svg>
      </button>

      <motion.div
        key={index}
        drag="x"
        dragConstraints={{ left: 0, right: 0 }}
        dragElastic={0.2}
        onDragStart={() => {
          draggedRef.current = false;
        }}
        onDrag={(_, info) => {
          if (Math.abs(info.offset.x) > CLICK_MOVE_TOLERANCE) draggedRef.current = true;
        }}
        onDragEnd={(_, info) => {
          if (info.offset.x < -SWIPE_THRESHOLD) onNext();
          else if (info.offset.x > SWIPE_THRESHOLD) onPrev();
        }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-5xl items-center justify-center"
      >
        {slide.type === "image" ? (
          // eslint-disable-next-line @next/next/no-img-element -- viewer plein écran : ratio libre, next/image inadapté ici
          <img
            src={slide.src}
            alt={slide.alt}
            draggable={false}
            className="max-h-[85vh] w-auto max-w-full select-none object-contain"
          />
        ) : (
          <video
            src={slide.src}
            poster={slide.poster}
            controls
            autoPlay
            playsInline
            className="max-h-[85vh] w-auto max-w-full bg-black"
          />
        )}

        {slide.caption ? (
          <span className="pointer-events-none absolute bottom-3 left-3 right-3 text-center text-sm text-white drop-shadow-[0_1px_3px_rgba(0,0,0,0.9)]">
            {slide.caption}
          </span>
        ) : null}
      </motion.div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Image précédente"
            onClick={(e) => {
              e.stopPropagation();
              onPrev();
            }}
            className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg width="14" height="12" viewBox="0 0 14 10" fill="none" aria-hidden="true">
              <path d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Image suivante"
            onClick={(e) => {
              e.stopPropagation();
              onNext();
            }}
            className="absolute right-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg width="14" height="12" viewBox="0 0 14 10" fill="none" aria-hidden="true">
              <path d="M0 5H12M12 5L8.5 1.5M12 5L8.5 8.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <span className="pointer-events-none absolute bottom-4 left-1/2 -translate-x-1/2 text-xs tabular-nums text-white/80">
            {index + 1} / {count}
          </span>
        </>
      ) : null}
    </motion.div>
  );
}
