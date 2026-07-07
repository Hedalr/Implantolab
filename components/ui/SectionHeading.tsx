import type { ReactNode } from "react";
import { cn } from "@/lib/cn";

type SectionHeadingProps = {
  eyebrow?: string;
  title: ReactNode;
  description?: ReactNode;
  align?: "start" | "center";
  className?: string;
};

export function SectionHeading({
  eyebrow,
  title,
  description,
  align = "start",
  className,
}: SectionHeadingProps) {
  return (
    <header
      className={cn(
        "flex flex-col gap-5 max-w-2xl",
        align === "center" && "mx-auto text-center items-center",
        className,
      )}
    >
      {eyebrow ? (
        <span className="text-eyebrow flex items-center gap-3">
          <span
            aria-hidden="true"
            className="h-px w-8 bg-[var(--accent-warm)]"
          />
          {eyebrow}
        </span>
      ) : null}
      <h2 className="text-display text-2xl sm:text-3xl md:text-4xl lg:text-[2.75rem] text-balance">
        {title}
      </h2>
      {description ? (
        <p className="text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty">
          {description}
        </p>
      ) : null}
    </header>
  );
}
