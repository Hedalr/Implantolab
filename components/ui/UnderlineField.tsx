import type { ReactNode } from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/cn";

type UnderlineFieldProps = {
  label: string;
  name: string;
  type?: string;
  required?: boolean;
  labelClass: string;
  fieldClass: string;
  as?: "input" | "select";
  defaultValue?: string;
  children?: ReactNode;
};

/** Champ (label + input/select souligné) partagé par les formulaires du site. */
export function UnderlineField({
  label,
  name,
  type = "text",
  required,
  labelClass,
  fieldClass,
  as = "input",
  defaultValue,
  children,
}: UnderlineFieldProps) {
  return (
    <label className="flex flex-col gap-3">
      <span className={labelClass}>
        {label}
        {required ? <span aria-hidden="true"> *</span> : null}
      </span>
      {as === "select" ? (
        <span className="relative block">
          <select
            name={name}
            required={required}
            defaultValue={defaultValue}
            className={cn(
              fieldClass,
              "appearance-none cursor-pointer pr-8",
            )}
          >
            {children}
          </select>
          <ChevronDown
            aria-hidden="true"
            className="pointer-events-none absolute right-0.5 top-1/2 size-3.5 -translate-y-1/2 text-[var(--ink-discreet)]"
          />
        </span>
      ) : (
        <input
          type={type}
          name={name}
          required={required}
          autoComplete={autoCompleteFor(name, type)}
          className={fieldClass}
        />
      )}
    </label>
  );
}

function autoCompleteFor(name: string, type: string): string | undefined {
  if (type === "email") return "email";
  if (type === "tel") return "tel";
  if (name === "name") return "name";
  if (name === "cabinet") return "organization";
  return undefined;
}
