"use client";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useReducedMotion } from "framer-motion";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { cn } from "@/lib/cn";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";

type CardData = {
  src?: string;
  photoKey?: string;
  tone?: "warm" | "cool" | "deep";
  title: string;
  category?: string;
  content?: ReactNode;
};

type CarouselProps = {
  items: React.JSX.Element[];
  initialScroll?: number;
  autoplay?: boolean;
  autoplaySpeed?: number;
  className?: string;
};

const CARD_WIDTH_MOBILE = 224;
const CARD_WIDTH_DESKTOP = 320;
const GAP = 16;

function getCardStep() {
  if (typeof window === "undefined") return CARD_WIDTH_DESKTOP + GAP;
  return (window.innerWidth < 768 ? CARD_WIDTH_MOBILE : CARD_WIDTH_DESKTOP) + GAP;
}

export function Carousel({
  items,
  initialScroll = 0,
  autoplay = false,
  autoplaySpeed = 0.45,
  className,
}: CarouselProps) {
  const carouselRef = useRef<HTMLDivElement>(null);
  const animationRef = useRef<number | null>(null);
  const [canScrollLeft, setCanScrollLeft] = useState(false);
  const [canScrollRight, setCanScrollRight] = useState(true);
  const [isPaused, setIsPaused] = useState(false);
  const reduceMotion = useReducedMotion();
  const loopedItems = items.length > 1 ? [...items, ...items] : items;

  const checkScrollability = useCallback(() => {
    const node = carouselRef.current;
    if (!node) return;
    const { scrollLeft, scrollWidth, clientWidth } = node;
    setCanScrollLeft(scrollLeft > 4);
    setCanScrollRight(scrollLeft < scrollWidth - clientWidth - 4);
  }, []);

  useEffect(() => {
    const node = carouselRef.current;
    if (!node) return;
    node.scrollLeft = initialScroll;
    checkScrollability();
  }, [initialScroll, checkScrollability]);

  useEffect(() => {
    if (!autoplay || isPaused || reduceMotion || items.length < 2) {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
      return;
    }

    const scroll = () => {
      const node = carouselRef.current;
      if (!node) return;
      node.scrollLeft += autoplaySpeed;
      if (node.scrollLeft >= node.scrollWidth / 2) {
        node.scrollLeft = 0;
      }
      animationRef.current = requestAnimationFrame(scroll);
    };

    animationRef.current = requestAnimationFrame(scroll);
    return () => {
      if (animationRef.current) cancelAnimationFrame(animationRef.current);
    };
  }, [autoplay, autoplaySpeed, isPaused, reduceMotion, items.length]);

  const scrollByCards = (direction: -1 | 1) => {
    const node = carouselRef.current;
    if (!node) return;
    node.scrollBy({ left: direction * getCardStep(), behavior: "smooth" });
  };

  return (
    <div
      className={cn("relative w-full", className)}
      onMouseEnter={() => setIsPaused(true)}
      onMouseLeave={() => setIsPaused(false)}
      onTouchStart={() => setIsPaused(true)}
      onTouchEnd={() => setIsPaused(false)}
    >
        <div
          ref={carouselRef}
          onScroll={checkScrollability}
          tabIndex={0}
          role="list"
          aria-label="Membres de l’équipe"
          onKeyDown={(event) => {
            if (event.key === "ArrowRight") {
              event.preventDefault();
              scrollByCards(1);
            } else if (event.key === "ArrowLeft") {
              event.preventDefault();
              scrollByCards(-1);
            }
          }}
          className={cn(
            "flex w-full overflow-x-auto overscroll-x-contain scroll-smooth py-6 md:py-10",
            "[scrollbar-width:none] [&::-webkit-scrollbar]:hidden",
            "outline-none focus-visible:ring-2 focus-visible:ring-[var(--accent)] focus-visible:ring-offset-4",
          )}
        >
          <div className="flex flex-row gap-4 pl-1 pr-8 md:pr-12">
            {loopedItems.map((item, index) => (
              <motion.div
                key={`card-${index}`}
                role="listitem"
                initial={reduceMotion ? false : { opacity: 0, y: 16 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  duration: reduceMotion ? 0 : 0.45,
                  delay: reduceMotion ? 0 : 0.08 * (index % items.length),
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="shrink-0"
              >
                {item}
              </motion.div>
            ))}
          </div>
        </div>

        <div className="mt-2 flex items-center justify-center gap-3">
          <button
            type="button"
            aria-label="Faire défiler vers la gauche"
            onClick={() => scrollByCards(-1)}
            disabled={!canScrollLeft}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)]",
              "transition-[color,background-color,border-color,transform,opacity] duration-160 ease-out",
              "active:scale-[0.97] fine-hover:hover:border-[var(--ink)]",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            <ChevronLeft className="h-5 w-5" aria-hidden="true" />
          </button>
          <button
            type="button"
            aria-label="Faire défiler vers la droite"
            onClick={() => scrollByCards(1)}
            disabled={!canScrollRight}
            className={cn(
              "inline-flex h-11 w-11 items-center justify-center border border-[var(--line-strong)] text-[var(--ink)]",
              "transition-[color,background-color,border-color,transform,opacity] duration-160 ease-out",
              "active:scale-[0.97] fine-hover:hover:border-[var(--ink)]",
              "disabled:opacity-40 disabled:pointer-events-none",
            )}
          >
            <ChevronRight className="h-5 w-5" aria-hidden="true" />
          </button>
        </div>
      </div>
  );
}

export function Card({
  card,
  index,
  priority = false,
}: {
  card: CardData;
  index: number;
  priority?: boolean;
}) {
  return (
    <motion.article
      className="relative z-10 w-56 overflow-hidden border border-[var(--line)] bg-[var(--bg-elevated)] md:w-80"
    >
      <VisualPlaceholder
        src={card.src}
        photoKey={card.photoKey}
        tone={card.tone ?? "warm"}
        ratio="portrait"
        alt={`${card.title}${card.category ? ` — ${card.category}` : ""}`}
        priority={priority}
        className="border-0"
      />

      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 z-20 h-2/3 bg-gradient-to-t from-black/75 via-black/35 to-transparent"
      />

      <div className="absolute inset-x-0 bottom-0 z-30 w-full p-5 md:p-7">
        {card.category ? (
          <motion.p
            className="text-left text-[0.65rem] uppercase tracking-[0.16em] text-white/85 md:text-xs"
          >
            {card.category}
          </motion.p>
        ) : null}
        <motion.h3
          className="mt-2 max-w-xs text-left font-serif text-xl text-white md:text-2xl [text-wrap:balance]"
        >
          {card.title}
        </motion.h3>
        {card.content ? (
          <div className="mt-2 text-left text-sm text-white/75">{card.content}</div>
        ) : null}
      </div>

      <span className="sr-only">
        {card.title}
        {card.category ? `, ${card.category}` : ""}
        {`, carte ${index + 1}`}
      </span>
    </motion.article>
  );
}
