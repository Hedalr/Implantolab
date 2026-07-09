import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";

export function TeamShowcase() {
  const { eyebrow, title, description, footnote, members } = home.team;

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

        <ul className="mt-14 grid gap-8 sm:grid-cols-2 lg:grid-cols-3">
          {members.map((member, index) => (
            <Reveal
              as="li"
              key={member.name + index}
              delay={(index % 3) * 80}
              variant="rise"
              className="flex flex-col gap-4"
            >
              <div className="photo-lift overflow-hidden">
                <VisualPlaceholder
                  ratio="portrait"
                  tone={member.tone ?? "cool"}
                  photoKey={member.photoKey}
                  caption={member.role}
                  alt={`${member.name} — ${member.role}`}
                />
              </div>
              <div className="flex flex-col gap-1">
                <h3 className="font-serif text-lg text-[var(--ink)]">
                  {member.name}
                </h3>
                <p className="text-sm text-[var(--ink-muted)]">
                  {member.role}
                </p>
                {member.bio ? (
                  <p className="mt-1 text-sm text-[var(--ink-muted)] leading-relaxed">
                    {member.bio}
                  </p>
                ) : null}
              </div>
            </Reveal>
          ))}
        </ul>

        {footnote ? (
          <Reveal delay={200}>
            <p className="mt-12 text-xs text-[var(--ink-discreet)] tracking-wide">
              {footnote}
            </p>
          </Reveal>
        ) : null}
      </Container>
    </section>
  );
}
