"use client";

import { useEffect, useRef, useState } from "react";
import { createPortal } from "react-dom";
import { motion } from "framer-motion";

export type RequestMediaItem = {
  id: string;
  filename: string | null;
  mimeType?: string | null;
};

const SWIPE_THRESHOLD = 60;
/** Au-delà de ce déplacement, on considère que c'est un swipe et non un clic. */
const CLICK_MOVE_TOLERANCE = 8;

function isLikelyUnsupported(
  mimeType?: string | null,
  filename?: string | null,
): boolean {
  const mime = (mimeType ?? "").toLowerCase();
  const name = (filename ?? "").toLowerCase();
  return (
    mime.includes("heic") ||
    mime.includes("heif") ||
    name.endsWith(".heic") ||
    name.endsWith(".heif")
  );
}

function fileExtension(filename: string | null): string {
  if (!filename) return "";
  const dot = filename.lastIndexOf(".");
  return dot >= 0 ? filename.slice(dot + 1).toUpperCase() : "";
}

/**
 * Galerie de photos jointes à une demande praticien : miniatures cliquables
 * ouvrant une visionneuse plein écran avec navigation flèches, clavier et
 * swipe (tactile + drag souris), sans jamais déclencher de téléchargement
 * involontaire au clic.
 *
 * Certaines photos envoyées depuis un iPhone arrivent au format HEIC, non
 * décodable par les navigateurs desktop : on affiche alors une vignette de
 * repli avec un lien de téléchargement plutôt qu'une image cassée.
 */
export function RequestMediaGallery({ media }: { media: RequestMediaItem[] }) {
  const [openIndex, setOpenIndex] = useState<number | null>(null);
  const [mounted, setMounted] = useState(false);
  const [brokenIds, setBrokenIds] = useState<Set<string>>(new Set());

  useEffect(() => setMounted(true), []);

  if (media.length === 0) return null;

  const markBroken = (id: string) => {
    setBrokenIds((prev) => {
      if (prev.has(id)) return prev;
      const next = new Set(prev);
      next.add(id);
      return next;
    });
  };

  return (
    <>
      <ul className="mt-3 flex flex-wrap gap-2">
        {media.map((m, i) => {
          const unsupported =
            isLikelyUnsupported(m.mimeType, m.filename) || brokenIds.has(m.id);
          return (
            <li key={m.id}>
              <button
                type="button"
                onClick={() => setOpenIndex(i)}
                aria-label={`Agrandir ${m.filename ?? "la photo"}`}
                className="group relative block h-16 w-16 overflow-hidden border border-[var(--line)] bg-[var(--bg)]"
              >
                {unsupported ? (
                  <UnsupportedThumb filename={m.filename} />
                ) : (
                  // eslint-disable-next-line @next/next/no-img-element
                  <img
                    src={`/api/request-media/${m.id}`}
                    alt={m.filename ?? "Photo jointe"}
                    className="h-full w-full object-cover transition-transform group-hover:scale-105"
                    loading="lazy"
                    onError={() => markBroken(m.id)}
                  />
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {mounted && openIndex !== null
        ? createPortal(
            <MediaLightbox
              media={media}
              index={openIndex}
              brokenIds={brokenIds}
              onBroken={markBroken}
              onClose={() => setOpenIndex(null)}
              onIndexChange={setOpenIndex}
            />,
            document.body,
          )
        : null}
    </>
  );
}

function UnsupportedThumb({ filename }: { filename: string | null }) {
  const ext = fileExtension(filename) || "?";
  return (
    <div className="flex h-full w-full flex-col items-center justify-center gap-1 bg-[var(--bg-elevated)] text-[var(--ink-discreet)]">
      <svg width="18" height="18" viewBox="0 0 24 24" fill="none" aria-hidden="true">
        <path
          d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
          stroke="currentColor"
          strokeWidth="1.4"
        />
        <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.4" />
      </svg>
      <span className="text-[9px] font-medium tracking-wide">{ext}</span>
    </div>
  );
}

type MediaLightboxProps = {
  media: RequestMediaItem[];
  index: number;
  brokenIds: Set<string>;
  onBroken: (id: string) => void;
  onClose: () => void;
  onIndexChange: (index: number) => void;
};

function MediaLightbox({
  media,
  index,
  brokenIds,
  onBroken,
  onClose,
  onIndexChange,
}: MediaLightboxProps) {
  const count = media.length;
  const draggedRef = useRef(false);

  const goTo = (next: number) => onIndexChange(((next % count) + count) % count);
  const next = () => goTo(index + 1);
  const prev = () => goTo(index - 1);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") onClose();
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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [index, count]);

  const current = media[index];
  const unsupported = isLikelyUnsupported(current.mimeType, current.filename) || brokenIds.has(current.id);

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
      <div className="absolute right-4 top-4 z-10 flex items-center gap-2">
        <a
          href={`/api/request-media/${current.id}?download=1`}
          onClick={(e) => e.stopPropagation()}
          aria-label="Télécharger la photo"
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path
              d="M8 1v9m0 0 3.5-3.5M8 10 4.5 6.5M2 13h12"
              stroke="currentColor"
              strokeWidth="1.4"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </a>
        <button
          type="button"
          aria-label="Fermer"
          onClick={onClose}
          className="flex h-11 w-11 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
        >
          <svg width="16" height="16" viewBox="0 0 16 16" fill="none" aria-hidden="true">
            <path d="M2 2L14 14M14 2L2 14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
        </button>
      </div>

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
          if (info.offset.x < -SWIPE_THRESHOLD) next();
          else if (info.offset.x > SWIPE_THRESHOLD) prev();
        }}
        onClick={(e) => e.stopPropagation()}
        className="relative flex max-h-[85vh] w-full max-w-5xl flex-col items-center justify-center gap-4"
      >
        {unsupported ? (
          <div className="flex flex-col items-center gap-3 bg-white/5 px-10 py-14 text-center text-white">
            <svg width="40" height="40" viewBox="0 0 24 24" fill="none" aria-hidden="true">
              <path
                d="M5 4h9l5 5v11a1 1 0 0 1-1 1H5a1 1 0 0 1-1-1V5a1 1 0 0 1 1-1Z"
                stroke="currentColor"
                strokeWidth="1.3"
              />
              <path d="M14 4v5h5" stroke="currentColor" strokeWidth="1.3" />
            </svg>
            <p className="max-w-xs text-sm text-white/80">
              Format {fileExtension(current.filename) || "inconnu"} non pris en charge par
              l&apos;aperçu du navigateur.
            </p>
            <a
              href={`/api/request-media/${current.id}?download=1`}
              onClick={(e) => e.stopPropagation()}
              className="inline-flex items-center px-4 py-2 text-xs uppercase tracking-widest border border-white/30 text-white hover:border-white transition-colors"
            >
              Télécharger la photo
            </a>
          </div>
        ) : (
          // eslint-disable-next-line @next/next/no-img-element -- viewer plein écran : ratio libre
          <img
            src={`/api/request-media/${current.id}`}
            alt={current.filename ?? "Photo jointe"}
            draggable={false}
            className="max-h-[85vh] w-auto max-w-full select-none object-contain"
            onError={() => onBroken(current.id)}
          />
        )}

        {current.filename ? (
          <span className="pointer-events-none text-center text-xs text-white/70">
            {current.filename}
          </span>
        ) : null}
      </motion.div>

      {count > 1 ? (
        <>
          <button
            type="button"
            aria-label="Photo précédente"
            onClick={(e) => {
              e.stopPropagation();
              prev();
            }}
            className="absolute left-3 top-1/2 flex h-12 w-12 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition-colors hover:bg-white/20"
          >
            <svg width="14" height="12" viewBox="0 0 14 10" fill="none" aria-hidden="true">
              <path d="M14 5H2M2 5L5.5 1.5M2 5L5.5 8.5" stroke="currentColor" strokeWidth="1.4" />
            </svg>
          </button>
          <button
            type="button"
            aria-label="Photo suivante"
            onClick={(e) => {
              e.stopPropagation();
              next();
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