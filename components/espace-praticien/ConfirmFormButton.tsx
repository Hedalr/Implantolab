"use client";

import type { ReactNode } from "react";

/**
 * Bouton de formulaire (Server Action) avec confirmation native avant soumission.
 * Pour les actions destructrices (révocation d’accès, suppression, etc.).
 */
export function ConfirmFormButton({
  action,
  hiddenFields,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  return (
    <form
      action={action}
      onSubmit={(event) => {
        if (!window.confirm(confirmMessage)) {
          event.preventDefault();
        }
      }}
    >
      {Object.entries(hiddenFields).map(([name, value]) => (
        <input key={name} type="hidden" name={name} value={value} />
      ))}
      <button type="submit" className={className}>
        {children}
      </button>
    </form>
  );
}
