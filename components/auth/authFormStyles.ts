import { cn } from "@/lib/cn";

/** Underline field styles shared by login + set-password forms. */
export const authFieldClassName = cn(
  "w-full bg-transparent border-b py-3 text-base transition-colors",
  "placeholder:text-[var(--ink-discreet)] focus:outline-none",
  "text-[var(--ink)] border-[var(--line-strong)] focus:border-[var(--ink)]",
);

export const authLabelClassName = "text-eyebrow text-[var(--ink-discreet)]";
