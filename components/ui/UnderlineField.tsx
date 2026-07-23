import type { ReactNode } from "react";

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
        <select
          name={name}
          required={required}
          defaultValue={defaultValue}
          className={fieldClass}
        >
          {children}
        </select>
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
