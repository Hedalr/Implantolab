"use client";

import {
  useEffect,
  useRef,
  useState,
  type CSSProperties,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type HeroSloganProps = {
  line1: string;
  line2: string;
  line2Offset?: string;
  emphasis?: string;
  variant?: "signature" | "italic";
  layout?: "stacked" | "inline";
  className?: string;
};

type CSSVarStyle = CSSProperties & { "--signature-word-index"?: number };

function renderWords(
  text: string,
  startIndex: number,
  emphasis?: string,
): { nodes: ReactNode[]; nextIndex: number } {
  const words = text.split(/(\s+)/);
  let wordIndex = startIndex;
  const nodes = words.map((chunk, i) => {
    if (/^\s+$/.test(chunk)) {
      return <span key={i}>{chunk}</span>;
    }
    const isEmphasis =
      !!emphasis && chunk.replace(/[.,;:!?…]+$/u, "") === emphasis;
    const index = wordIndex++;
    const style: CSSVarStyle = { "--signature-word-index": index };
    return (
      <span
        key={i}
        className={cn(
          "signature-word",
          isEmphasis && "text-signature-emphasis",
        )}
        style={style}
      >
        {chunk}
      </span>
    );
  });
  return { nodes, nextIndex: wordIndex };
}

/**
 * HeroSlogan — Accroche émotionnelle du hero.
 * Deux lignes avec décalage typographique : le "n" de la ligne 2 s'aligne
 * sous le "i" de "sourire" via un indent calculé en JS (md+), sans jamais
 * dupliquer de texte dans le DOM (contrairement à une astuce "texte invisible
 * de même largeur", qui reste lisible par les crawlers, lecteurs d'écran mal
 * configurés ou tout outil qui lit le HTML brut sans exécuter le CSS).
 */
export function HeroSlogan({
  line1,
  line2,
  line2Offset,
  emphasis,
  variant = "signature",
  layout = "stacked",
  className,
}: HeroSloganProps) {
  const line1Ref = useRef<HTMLSpanElement | null>(null);
  const [indent, setIndent] = useState(0);

  const baseStyles =
    variant === "signature"
      ? "text-signature text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-tight tracking-tight"
      : "font-serif italic text-xl sm:text-2xl md:text-[1.85rem] lg:text-[2.125rem] text-[var(--accent)] leading-snug tracking-tight";

  useEffect(() => {
    const node = line1Ref.current;
    if (!node || !line2Offset || layout !== "stacked") return;

    const measure = () => {
      const font = window.getComputedStyle(node).font;
      const canvas = document.createElement("canvas");
      const ctx = canvas.getContext("2d");
      if (!ctx) return;
      ctx.font = font;
      setIndent(ctx.measureText(line2Offset).width);
    };

    measure();
    window.addEventListener("resize", measure);
    return () => window.removeEventListener("resize", measure);
  }, [line2Offset, layout]);

  if (layout === "inline") {
    const fullText = `${line1} ${line2}`;
    const rendered = renderWords(fullText, 0, emphasis);
    return (
      <p className={cn(baseStyles, "w-full text-center", className)}>
        {rendered.nodes}
      </p>
    );
  }

  const line1Rendered = renderWords(line1, 0, emphasis);
  const line2Rendered = renderWords(line2, line1Rendered.nextIndex);

  return (
    <p className={cn(baseStyles, layout === "stacked" && "w-full", className)}>
      <span ref={line1Ref} className="block">
        {line1Rendered.nodes}
      </span>
      <span
        className="block md:pl-(--slogan-indent)"
        style={{ "--slogan-indent": `${indent}px` } as CSSProperties}
      >
        {line2Rendered.nodes}
      </span>
    </p>
  );
}
