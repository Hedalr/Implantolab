"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import { motion, useScroll, useSpring, useTransform } from "framer-motion";
import { cn } from "@/lib/cn";

type ParallaxImageProps = {
  children: ReactNode;
  className?: string;
  /**
   * Amplitude du décalage en pixels au scroll.
   * Positif = translation vers le haut à mesure qu'on scrolle vers le bas.
   */
  offset?: number;
  /** Désactive le parallax en dessous de ce breakpoint (px). */
  mobileBreakpoint?: number;
};

/**
 * ParallaxImage — Enveloppe un visuel d'un mouvement de parallax doux au scroll.
 * L'élément se translate verticalement sans changer la mise en page, créant
 * un flux visuel asymétrique. Désactivé sur mobile et pour les utilisateurs
 * qui préfèrent des animations réduites.
 */
export function ParallaxImage({
  children,
  className,
  offset = 50,
  mobileBreakpoint = 768,
}: ParallaxImageProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const update = () => {
      const isDesktop = window.innerWidth >= mobileBreakpoint;
      setEnabled(isDesktop && !motionQuery.matches);
    };

    update();
    window.addEventListener("resize", update);
    motionQuery.addEventListener("change", update);
    return () => {
      window.removeEventListener("resize", update);
      motionQuery.removeEventListener("change", update);
    };
  }, [mobileBreakpoint]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start end", "end start"],
  });

  const rawY = useTransform(scrollYProgress, [0, 1], [offset, -offset]);
  const y = useSpring(rawY, {
    stiffness: 90,
    damping: 26,
    mass: 0.6,
  });

  return (
    <motion.div
      ref={ref}
      style={enabled ? { y } : undefined}
      className={cn("will-change-transform", className)}
    >
      {children}
    </motion.div>
  );
}
