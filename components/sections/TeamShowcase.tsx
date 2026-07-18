"use client";

import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { Reveal } from "@/components/ui/Reveal";
import { Carousel, Card } from "@/components/ui/LinearCarousel";

export function TeamShowcase() {
  const { eyebrow, title, description, footnote, members } = home.team;

  const cards = members.map((member, index) => (
    <Card
      key={`${member.name}-${index}`}
      index={index}
      priority={index === 0}
      card={{
        title: member.name,
        category: member.role,
        photoKey: member.photoKey,
        tone: member.tone ?? "warm",
        content: member.bio ? (
          <p className="leading-relaxed">{member.bio}</p>
        ) : undefined,
      }}
    />
  ));

  return (
    <section className="relative bg-[var(--bg)] overflow-hidden">
      <div
        aria-hidden="true"
        className="pointer-events-none absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
      />
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

        <Reveal delay={120} className="mt-10 md:mt-14">
          <div
            role="region"
            aria-roledescription="carrousel"
            aria-label="Équipe du laboratoire"
          >
            <Carousel items={cards} autoplay autoplaySpeed={0.4} />
            <p className="mt-4 text-center text-xs text-[var(--ink-discreet)] md:hidden">
              Glissez pour parcourir l’équipe
            </p>
          </div>
        </Reveal>

        {footnote ? (
          <Reveal delay={200}>
            <p className="mt-10 text-xs text-[var(--ink-discreet)] tracking-wide md:mt-12">
              {footnote}
            </p>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}
