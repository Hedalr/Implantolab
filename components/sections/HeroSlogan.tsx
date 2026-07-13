import type { CSSProperties, ReactNode } from "react";
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
 * Deux lignes avec décalage typographique : le "n" de la ligne 2
 * s'aligne sous le "i" de "sourire" via un offset invisible (md+).
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
  const baseStyles =
    variant === "signature"
      ? "text-signature text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] leading-tight tracking-tight"
      : "font-serif italic text-xl sm:text-2xl md:text-[1.85rem] lg:text-[2.125rem] text-[var(--accent)] leading-snug tracking-tight";

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
      <span className="block">{line1Rendered.nodes}</span>
      <span className="block">
        {line2Offset ? (
          <span aria-hidden="true" className="hidden md:inline invisible">
            {line2Offset}
          </span>
        ) : null}
        {line2Rendered.nodes}
      </span>
    </p>
  );
}
