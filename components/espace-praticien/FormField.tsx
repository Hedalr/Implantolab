import type { ReactNode } from "react";

/** Champ de formulaire (label + hint) partagé par les écrans espace praticien. */
export function FormField({
  label,
  htmlFor,
  hint,
  required,
  children,
}: {
  label: string;
  htmlFor: string;
  hint?: string;
  required?: boolean;
  children: ReactNode;
}) {
  return (
    <div className="flex flex-col gap-2">
      <label htmlFor={htmlFor} className="text-eyebrow">
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </label>
      {children}
      {hint ? (
        <span className="text-xs text-[var(--ink-discreet)]">{hint}</span>
      ) : null}
    </div>
  );
}
