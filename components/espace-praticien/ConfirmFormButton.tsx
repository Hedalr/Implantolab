"use client";

import {
  useEffect,
  useId,
  useRef,
  useState,
  type ReactNode,
} from "react";
import { createPortal } from "react-dom";
import { cn } from "@/lib/cn";

/**
 * Bouton de formulaire (Server Action) avec confirmation dans la DA du site.
 * Pour les actions destructrices (révocation d’accès, suppression, etc.).
 */
export function ConfirmFormButton({
  action,
  hiddenFields,
  confirmTitle,
  confirmMessage,
  className,
  children,
}: {
  action: (formData: FormData) => void | Promise<void>;
  hiddenFields: Record<string, string>;
  /** Titre de la modale (sinon le libellé du bouton). */
  confirmTitle?: string;
  confirmMessage: string;
  className?: string;
  children: ReactNode;
}) {
  const [open, setOpen] = useState(false);
  const [mounted, setMounted] = useState(false);
  const formRef = useRef<HTMLFormElement>(null);
  const cancelRef = useRef<HTMLButtonElement>(null);
  const titleId = useId();
  const descId = useId();

  const confirmLabel =
    typeof children === "string" ? children : "Confirmer";
  const title = confirmTitle ?? confirmLabel;

  useEffect(() => {
    setMounted(true);
  }, []);

  useEffect(() => {
    if (!open) return;

    const previousOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    cancelRef.current?.focus();

    const onKeyDown = (event: KeyboardEvent) => {
      if (event.key === "Escape") {
        setOpen(false);
      }
    };
    window.addEventListener("keydown", onKeyDown);

    return () => {
      document.body.style.overflow = previousOverflow;
      window.removeEventListener("keydown", onKeyDown);
    };
  }, [open]);

  return (
    <>
      <form ref={formRef} action={action} className="hidden" aria-hidden="true">
        {Object.entries(hiddenFields).map(([name, value]) => (
          <input key={name} type="hidden" name={name} value={value} />
        ))}
      </form>

      <button
        type="button"
        className={className}
        onClick={() => setOpen(true)}
      >
        {children}
      </button>

      {mounted && open
        ? createPortal(
            <div
              className="fixed inset-0 z-[200] flex items-center justify-center p-4"
              role="presentation"
            >
              <button
                type="button"
                aria-label="Fermer"
                className="absolute inset-0 bg-[var(--bg-deep)]/50 transition-opacity duration-160 ease-out"
                onClick={() => setOpen(false)}
              />
              <div
                role="dialog"
                aria-modal="true"
                aria-labelledby={titleId}
                aria-describedby={descId}
                className={cn(
                  "relative w-full max-w-md border border-[var(--line)] bg-[var(--bg-elevated)] p-6 md:p-8",
                  "shadow-[0_24px_64px_rgba(0,0,0,0.18)]",
                  "motion-safe:animate-[confirm-dialog-in_180ms_ease-out]",
                )}
              >
                <p className="text-eyebrow">Confirmation</p>
                <h2
                  id={titleId}
                  className="mt-2 font-serif text-xl text-[var(--ink)] tracking-tight"
                >
                  {title}
                </h2>
                <p
                  id={descId}
                  className="mt-3 text-sm text-[var(--ink-muted)] leading-relaxed"
                >
                  {confirmMessage}
                </p>
                <div className="mt-8 flex flex-wrap items-center justify-end gap-3">
                  <button
                    ref={cancelRef}
                    type="button"
                    onClick={() => setOpen(false)}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm tracking-wide",
                      "border border-[var(--line-strong)] text-[var(--ink)] bg-transparent",
                      "hover:border-[var(--ink)] transition-colors duration-160 ease-out",
                      "active:scale-[0.97]",
                    )}
                  >
                    Annuler
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      formRef.current?.requestSubmit();
                    }}
                    className={cn(
                      "inline-flex min-h-11 items-center justify-center px-5 py-2.5 text-sm tracking-wide",
                      "border border-[var(--ink)] bg-[var(--ink)] text-[var(--bg)]",
                      "hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
                      "transition-[color,background-color,border-color,transform] duration-160 ease-out",
                      "active:scale-[0.97]",
                    )}
                  >
                    {confirmLabel}
                  </button>
                </div>
              </div>
            </div>,
            document.body,
          )
        : null}
    </>
  );
}
