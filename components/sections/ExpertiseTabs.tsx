"use client";

import { useState } from "react";
import Link from "next/link";
import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { cn } from "@/lib/cn";

export function ExpertiseTabs() {
  const { eyebrow, title, description, tabs } = home.expertises;
  const [activeKey, setActiveKey] = useState(tabs[0].key);
  const active = tabs.find((tab) => tab.key === activeKey) ?? tabs[0];

  return (
    <section className="bg-[var(--bg)] border-b border-[var(--line)]">
      <Container size="wide" className="py-16 md:py-24 lg:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </Reveal>
        </div>

        <Reveal delay={100}>
          <div
            role="tablist"
            aria-label="Choisissez une expertise"
            className="mt-12 flex flex-wrap gap-x-2 gap-y-2 border-b border-[var(--line)]"
          >
            {tabs.map((tab) => {
              const selected = tab.key === activeKey;
              return (
                <button
                  key={tab.key}
                  role="tab"
                  type="button"
                  aria-selected={selected}
                  aria-controls={`expertise-panel-${tab.key}`}
                  id={`expertise-tab-${tab.key}`}
                  onClick={() => setActiveKey(tab.key)}
                  className={cn(
                    "relative px-4 sm:px-5 py-4 min-h-[44px] text-sm tracking-wide transition-colors",
                    selected
                      ? "text-[var(--ink)]"
                      : "text-[var(--ink-discreet)] hover:text-[var(--ink)]",
                  )}
                >
                  {tab.label}
                  <span
                    aria-hidden="true"
                    className={cn(
                      "absolute left-4 right-4 bottom-[-1px] h-px transition-colors",
                      selected ? "bg-[var(--ink)]" : "bg-transparent",
                    )}
                  />
                </button>
              );
            })}
          </div>
        </Reveal>

        <div
          role="tabpanel"
          id={`expertise-panel-${active.key}`}
          aria-labelledby={`expertise-tab-${active.key}`}
          key={active.key}
          className="mt-14 grid gap-12 lg:gap-16 lg:grid-cols-12 items-start"
        >
          <div className="lg:col-span-5 order-2 lg:order-1">
            <div className="reveal reveal--active" data-reveal-variant="scale" data-revealed="true">
              <VisualPlaceholder
                caption={active.photo}
                ratio="portrait"
                tone={active.tone}
              />
            </div>
          </div>

          <div className="lg:col-span-7 order-1 lg:order-2 flex flex-col gap-8">
            <div>
              <h3 className="text-display text-2xl sm:text-3xl md:text-4xl text-[var(--ink)] text-balance">
                {active.title}
              </h3>
              <p className="mt-5 text-[var(--ink-muted)] text-base sm:text-lg leading-relaxed text-pretty max-w-2xl">
                {active.body}
              </p>
            </div>

            <ul className="grid gap-4 sm:grid-cols-2 border-t border-[var(--line)] pt-6">
              {active.bullets.map((bullet) => (
                <li
                  key={bullet}
                  className="flex items-start gap-3 text-sm text-[var(--ink)] leading-relaxed"
                >
                  <span
                    aria-hidden="true"
                    className="mt-2 h-px w-4 bg-[var(--accent-warm)] shrink-0"
                  />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>

            <div>
              <Link
                href={active.href}
                className="tap-link gap-3 text-[var(--ink)] text-sm tracking-wide hover:text-[var(--accent)] transition-colors self-start"
              >
                <span className="inline-flex items-center gap-3 border-b border-current pb-1">
                  En savoir plus sur {active.label.toLowerCase()}
                  <svg width="14" height="10" viewBox="0 0 14 10" fill="none" aria-hidden="true">
                    <path
                      d="M0 5H12M12 5L8 1M12 5L8 9"
                      stroke="currentColor"
                      strokeWidth="1"
                    />
                  </svg>
                </span>
              </Link>
            </div>
          </div>
        </div>
      </Container>
    </section>
  );
}
