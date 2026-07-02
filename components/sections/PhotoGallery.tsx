import { home } from "@/content/fr/home";
import { Container } from "@/components/ui/Container";
import { SectionHeading } from "@/components/ui/SectionHeading";
import { VisualPlaceholder } from "@/components/ui/VisualPlaceholder";
import { Reveal } from "@/components/ui/Reveal";
import { ParallaxImage } from "@/components/ui/ParallaxImage";

export function PhotoGallery() {
  const { eyebrow, title, description, photos } = home.gallery;

  return (
    <section className="relative bg-[var(--bg)] overflow-hidden">
      <Container size="wide" className="py-24 md:py-32">
        <div className="max-w-3xl">
          <Reveal>
            <SectionHeading
              eyebrow={eyebrow}
              title={title}
              description={description}
            />
          </Reveal>
        </div>

        <ul className="mt-16 grid grid-cols-6 gap-4 md:gap-6">
          {photos.map((photo, index) => (
            <Reveal
              as="li"
              key={photo.caption}
              delay={index * 90}
              variant="scale"
              className={spanFor(index)}
            >
              <ParallaxImage offset={parallaxFor(index)}>
                <div className="photo-lift overflow-hidden">
                  <VisualPlaceholder
                    caption={photo.caption}
                    ratio={photo.ratio}
                    tone={photo.tone}
                  />
                </div>
              </ParallaxImage>
            </Reveal>
          ))}
        </ul>
      </Container>

      {/* Ligne séparatrice douce, remplace le border-b brut */}
      <div
        aria-hidden="true"
        className="absolute bottom-0 left-0 right-0 h-px bg-gradient-to-r from-transparent via-[var(--line)] to-transparent"
      />
    </section>
  );
}

function spanFor(index: number): string {
  const patterns = [
    "col-span-6 md:col-span-3 lg:col-span-2",
    "col-span-3 md:col-span-3 lg:col-span-2",
    "col-span-3 md:col-span-2 lg:col-span-2",
    "col-span-6 md:col-span-4 lg:col-span-4",
    "col-span-3 md:col-span-2 lg:col-span-2",
    "col-span-3 md:col-span-6 lg:col-span-6",
  ];
  return patterns[index % patterns.length];
}

/**
 * Amplitudes de parallax alternées pour créer un rythme asymétrique.
 * Les photos ne bougent pas toutes à la même vitesse, ce qui casse
 * l'effet "colonne alignée" typique des blogs.
 */
function parallaxFor(index: number): number {
  const amplitudes = [30, 55, 20, 45, 65, 25];
  return amplitudes[index % amplitudes.length];
}
