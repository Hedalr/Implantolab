"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/cn";

type HeroVideoProps = {
  src: string;
  poster?: string;
  className?: string;
};

/**
 * HeroVideo — Lecture d'une vidéo d'ambiance en autoplay silencieux.
 * Respecte prefers-reduced-motion (arrête la lecture) et met en pause
 * quand la vidéo sort de l'écran pour économiser les ressources.
 */
export function HeroVideo({ src, poster, className }: HeroVideoProps) {
  const ref = useRef<HTMLVideoElement | null>(null);

  useEffect(() => {
    const video = ref.current;
    if (!video) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");

    const play = () => {
      video.play().catch(() => {
        /* autoplay bloqué : la vidéo reste sur la première frame */
      });
    };
    const pause = () => video.pause();

    if (motionQuery.matches) {
      pause();
    } else {
      play();
    }

    const motionListener = (e: MediaQueryListEvent) => {
      if (e.matches) pause();
      else play();
    };
    motionQuery.addEventListener("change", motionListener);

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (motionQuery.matches) return;
          if (entry.isIntersecting) play();
          else pause();
        });
      },
      { threshold: 0.1 },
    );
    observer.observe(video);

    return () => {
      observer.disconnect();
      motionQuery.removeEventListener("change", motionListener);
    };
  }, []);

  return (
    <div className={cn("relative", className)}>
      <video
        ref={ref}
        src={src}
        poster={poster}
        autoPlay
        loop
        muted
        playsInline
        preload="metadata"
        aria-hidden="true"
        className="absolute inset-0 h-full w-full object-cover"
      />
      {/* Dégradé subtil bas pour lisibilité de la légende, dans le ton du site */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t from-black/25 to-transparent"
      />
    </div>
  );
}
