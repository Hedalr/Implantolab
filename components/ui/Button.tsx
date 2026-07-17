import type { ComponentPropsWithoutRef, ReactNode } from "react";
import Link from "next/link";
import { cn } from "@/lib/cn";

type Variant = "primary" | "secondary" | "ghost" | "invert";

type BaseProps = {
  variant?: Variant;
  children: ReactNode;
  className?: string;
};

type ButtonAsLink = BaseProps & {
  href: string;
} & Omit<ComponentPropsWithoutRef<typeof Link>, "href" | "className" | "children">;

type ButtonAsButton = BaseProps & {
  href?: undefined;
} & Omit<ComponentPropsWithoutRef<"button">, "className" | "children">;

type ButtonProps = ButtonAsLink | ButtonAsButton;

const baseStyles =
  "inline-flex items-center justify-center gap-2 px-6 py-3 min-h-11 text-sm tracking-wide border transition-[color,background-color,border-color,transform] duration-160 ease-out active:scale-[0.97]";

const variants: Record<Variant, string> = {
  primary:
    "bg-[var(--ink)] text-[var(--bg)] border-[var(--ink)] hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)]",
  secondary:
    "bg-transparent text-[var(--ink)] border-[var(--line-strong)] hover:border-[var(--ink)]",
  ghost:
    "bg-transparent text-[var(--ink)] border-transparent underline underline-offset-4 decoration-[var(--line-strong)] hover:decoration-[var(--ink)] px-0",
  invert:
    "bg-[var(--bg)] text-[var(--ink)] border-[var(--bg)] hover:bg-[var(--accent-warm)] hover:border-[var(--accent-warm)] hover:text-[var(--bg)]",
};

export function Button(props: ButtonProps) {
  const { variant = "primary", className, children } = props;
  const classes = cn(baseStyles, variants[variant], className);

  if ("href" in props && props.href) {
    const { href, ...rest } = props as ButtonAsLink;
    return (
      <Link href={href} className={classes} {...rest}>
        {children}
        <ArrowIcon />
      </Link>
    );
  }

  const { variant: _v, className: _c, children: _children, ...rest } =
    props as ButtonAsButton & { variant?: Variant; className?: string };
  return (
    <button className={classes} {...rest}>
      {children}
      <ArrowIcon />
    </button>
  );
}

function ArrowIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 14 14"
      fill="none"
      aria-hidden="true"
      className="shrink-0"
    >
      <path
        d="M3 7H11M11 7L7.5 3.5M11 7L7.5 10.5"
        stroke="currentColor"
        strokeWidth="1.2"
        strokeLinecap="square"
      />
    </svg>
  );
}
