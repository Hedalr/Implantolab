import Image from "next/image";
import { cn } from "@/lib/cn";
import { resolveSitePhoto } from "@/content/fr/site-photos";

type Ratio = "portrait" | "landscape" | "square" | "tall";

type VisualPlaceholderProps = {
  caption?: string;
  src?: string;
  photoKey?: string;
  alt?: string;
  ratio?: Ratio;
  tone?: "warm" | "cool" | "deep";
  className?: string;
  priority?: boolean;
};

const ratioMap: Record<Ratio, string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[16/10]",
  square: "aspect-square",
  tall: "aspect-[3/4]",
};

const toneMap = {
  warm: "bg-[#fbe4ed] text-[#9c3a63]",
  cool: "bg-[#f4f4f4] text-[#525252]",
  deep: "bg-[#171717] text-[#a3a3a3]",
} as const;

export function VisualPlaceholder({
  caption,
  src,
  photoKey,
  alt,
  ratio = "portrait",
  tone = "warm",
  className,
  priority = false,
}: VisualPlaceholderProps) {
  const resolvedSrc =
    src ?? (photoKey ? resolveSitePhoto(photoKey) : caption ? resolveSitePhoto(caption) : undefined);

  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden grain",
        ratioMap[ratio],
        !resolvedSrc && toneMap[tone],
        className,
      )}
    >
      {resolvedSrc ? (
        <Image
          src={resolvedSrc}
          alt={alt ?? caption ?? ""}
          fill
          priority={priority}
          sizes="(max-width: 768px) 100vw, (max-width: 1200px) 50vw, 33vw"
          className="object-cover"
        />
      ) : (
        <div
          aria-hidden="true"
          className="absolute inset-0 flex items-center justify-center"
        >
          <svg
            width="48"
            height="48"
            viewBox="0 0 48 48"
            fill="none"
            className="opacity-30"
          >
            <rect
              x="6"
              y="6"
              width="36"
              height="36"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <path
              d="M6 36L18 24L26 30L42 14"
              stroke="currentColor"
              strokeWidth="0.8"
            />
            <circle cx="32" cy="16" r="2" fill="currentColor" />
          </svg>
        </div>
      )}

      {caption ? (
        <figcaption className="absolute bottom-3 left-3 z-10 text-[0.7rem] sm:text-[0.65rem] uppercase tracking-widest sm:tracking-[0.18em] text-white/90 drop-shadow-[0_1px_2px_rgba(0,0,0,0.6)]">
          {caption}
        </figcaption>
      ) : null}

      <div
        aria-hidden="true"
        className={cn(
          "absolute inset-x-0 bottom-0 h-16 bg-gradient-to-t to-transparent pointer-events-none",
          resolvedSrc ? "from-black/35" : "from-current opacity-10",
        )}
      />
    </figure>
  );
}
