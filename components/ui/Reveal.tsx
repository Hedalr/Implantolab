"use client";

import {
  createElement,
  useEffect,
  useRef,
  useState,
  type ElementType,
  type ReactNode,
} from "react";
import { cn } from "@/lib/cn";

type RevealProps = {
  children: ReactNode;
  as?: ElementType;
  delay?: number;
  className?: string;
};

export function Reveal({
  children,
  as: Tag = "div",
  delay = 0,
  className,
}: RevealProps) {
  const ref = useRef<HTMLElement | null>(null);
  const [active, setActive] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;

    const motionQuery = window.matchMedia("(prefers-reduced-motion: reduce)");
    if (motionQuery.matches) return;

    const reveal = () => {
      window.setTimeout(() => {
        node.setAttribute("data-revealed", "true");
      }, delay);
    };

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((entry) => {
          if (entry.isIntersecting) {
            reveal();
            observer.unobserve(entry.target);
          }
        });
      },
      { threshold: 0.12, rootMargin: "0px 0px -40px 0px" },
    );

    const rect = node.getBoundingClientRect();
    const alreadyVisible = rect.top < window.innerHeight * 0.88;

    if (alreadyVisible) {
      reveal();
      return;
    }

    setActive(true);
    node.setAttribute("data-revealed", "false");
    observer.observe(node);
    return () => observer.disconnect();
  }, [delay]);

  return createElement(
    Tag,
    {
      ref,
      className: cn("reveal", active && "reveal--active", className),
      "data-revealed": "true",
    },
    children,
  );
}
