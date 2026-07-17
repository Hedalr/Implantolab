"use client";

import { useEffect, useRef, useState, type ReactNode } from "react";
import {
  motion,
  useReducedMotion,
  useScroll,
  useSpring,
  useTransform,
} from "framer-motion";
import { cn } from "@/lib/cn";

type HeroScrollProps = {
  copy: ReactNode;
  visuals: ReactNode;
  className?: string;
};

/**
 * HeroScroll — profondeur sobre au scroll quand on quitte le hero.
 * Le copy bouge peu (lisible), les visuels partent un peu plus vite + s’adoucissent.
 * Désactivé sur mobile et prefers-reduced-motion.
 */
export function HeroScroll({ copy, visuals, className }: HeroScrollProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const reduceMotion = useReducedMotion();
  const [enabled, setEnabled] = useState(false);

  useEffect(() => {
    const update = () => {
      setEnabled(window.innerWidth >= 768 && !reduceMotion);
    };
    update();
    window.addEventListener("resize", update);
    return () => window.removeEventListener("resize", update);
  }, [reduceMotion]);

  const { scrollYProgress } = useScroll({
    target: ref,
    offset: ["start start", "end start"],
  });

  const copyYRaw = useTransform(scrollYProgress, [0, 1], [0, -18]);
  const visualsYRaw = useTransform(scrollYProgress, [0, 1], [0, -52]);
  const visualsOpacityRaw = useTransform(scrollYProgress, [0, 0.75], [1, 0.62]);
  const haloOpacityRaw = useTransform(scrollYProgress, [0, 1], [1, 0.35]);

  const spring = { stiffness: 120, damping: 28, mass: 0.55 } as const;
  const copyY = useSpring(copyYRaw, spring);
  const visualsY = useSpring(visualsYRaw, spring);
  const visualsOpacity = useSpring(visualsOpacityRaw, spring);
  const haloOpacity = useSpring(haloOpacityRaw, spring);

  return (
    <div ref={ref} className={cn("relative", className)}>
      <motion.div
        aria-hidden="true"
        style={enabled ? { opacity: haloOpacity } : undefined}
        className="pointer-events-none absolute inset-0 -z-0"
      >
        <div className="absolute -top-24 -right-16 h-[38rem] w-[38rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(232,143,172,0.22),transparent_65%)] blur-2xl" />
        <div className="absolute top-24 -left-24 h-[30rem] w-[30rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(201,75,122,0.10),transparent_65%)] blur-2xl" />
        <div className="absolute -bottom-24 left-1/3 h-[28rem] w-[28rem] rounded-full bg-[radial-gradient(circle_at_center,rgba(245,200,216,0.28),transparent_70%)] blur-3xl" />
      </motion.div>

      <div className="relative grid gap-8 sm:gap-12 lg:gap-10 lg:grid-cols-12 items-center">
        <motion.div
          style={enabled ? { y: copyY } : undefined}
          className="lg:col-span-6 flex flex-col gap-8 will-change-transform"
        >
          {copy}
        </motion.div>

        <motion.div
          style={
            enabled
              ? { y: visualsY, opacity: visualsOpacity }
              : undefined
          }
          className="lg:col-span-6 flex flex-col gap-5 sm:gap-6 will-change-transform"
        >
          {visuals}
        </motion.div>
      </div>
    </div>
  );
}
