import type { ElementType, ReactNode } from "react";
import { cn } from "@/lib/cn";

type ContainerProps = {
  children: ReactNode;
  as?: ElementType;
  size?: "narrow" | "base" | "wide";
  className?: string;
};

const sizeMap = {
  narrow: "max-w-[var(--container-narrow)]",
  base: "max-w-[var(--container-base)]",
  wide: "max-w-[var(--container-wide)]",
} as const;

export function Container({
  children,
  as: Tag = "div",
  size = "base",
  className,
}: ContainerProps) {
  return (
    <Tag
      className={cn(
        "mx-auto w-full",
        // `viewportFit: cover` laisse le contenu passer sous l'encoche en paysage :
        // la gouttière ne descend jamais sous la valeur de base.
        "pl-[max(1rem,env(safe-area-inset-left))] pr-[max(1rem,env(safe-area-inset-right))]",
        "sm:pl-[max(1.5rem,env(safe-area-inset-left))] sm:pr-[max(1.5rem,env(safe-area-inset-right))]",
        "md:pl-[max(2.5rem,env(safe-area-inset-left))] md:pr-[max(2.5rem,env(safe-area-inset-right))]",
        sizeMap[size],
        className,
      )}
    >
      {children}
    </Tag>
  );
}
