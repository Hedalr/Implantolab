import { cn } from "@/lib/cn";

type Ratio = "portrait" | "landscape" | "square" | "tall";

type VisualPlaceholderProps = {
  caption?: string;
  ratio?: Ratio;
  tone?: "warm" | "cool" | "deep";
  className?: string;
};

const ratioMap: Record<Ratio, string> = {
  portrait: "aspect-[4/5]",
  landscape: "aspect-[16/10]",
  square: "aspect-square",
  tall: "aspect-[3/4]",
};

const toneMap = {
  warm: "bg-[#ece6dc] text-[#7a6a55]",
  cool: "bg-[#e6e9ec] text-[#4d5663]",
  deep: "bg-[#23272d] text-[#a8aeb3]",
} as const;

export function VisualPlaceholder({
  caption,
  ratio = "portrait",
  tone = "warm",
  className,
}: VisualPlaceholderProps) {
  return (
    <figure
      className={cn(
        "relative w-full overflow-hidden grain",
        ratioMap[ratio],
        toneMap[tone],
        className,
      )}
    >
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
      {caption ? (
        <figcaption className="absolute bottom-3 left-3 z-10 text-[0.65rem] uppercase tracking-[0.18em] opacity-70">
          {caption}
        </figcaption>
      ) : null}
      <div
        aria-hidden="true"
        className="absolute inset-x-0 bottom-0 h-px bg-current opacity-20"
      />
    </figure>
  );
}
