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
    <Tag className={cn("mx-auto w-full px-4 sm:px-6 md:px-10", sizeMap[size], className)}>
      {children}
    </Tag>
  );
}
