import {
  FileScan,
  MonitorPlay,
  CheckSquare,
  Factory,
  Microscope,
  Truck,
} from "lucide-react";

const steps = [
  {
    id: "01",
    title: "Réception",
    description: "Empreinte ou fichier",
    icon: FileScan,
  },
  {
    id: "02",
    title: "Conception",
    description: "Design CAO",
    icon: MonitorPlay,
  },
  {
    id: "03",
    title: "Validation",
    description: "Accord praticien",
    icon: CheckSquare,
  },
  {
    id: "04",
    title: "Fabrication",
    description: "Usinage & Impression",
    icon: Factory,
  },
  {
    id: "05",
    title: "Contrôle",
    description: "Qualité & finition",
    icon: Microscope,
  },
  {
    id: "06",
    title: "Expédition",
    description: "Livraison cabinet",
    icon: Truck,
  },
];

export function ProcessSchema() {
  return (
    <div className="w-full mt-2 p-6 md:p-8 bg-[var(--bg)] border border-[var(--line)] rounded-xl relative overflow-hidden">
      {/* Decorative background element */}
      <div className="absolute -right-20 -top-20 w-64 h-64 bg-[var(--accent-warm-soft)] rounded-full blur-3xl opacity-20 pointer-events-none" />

      <div className="relative">
        <div className="grid grid-cols-2 md:grid-cols-3 gap-y-10 gap-x-6">
          {steps.map((step, idx) => {
            const isLast = idx === steps.length - 1;
            return (
              <div key={step.id} className="relative flex flex-col gap-3 group">
                {/* Connecting Line Desktop */}
                {idx !== 2 && !isLast && (
                  <div className="hidden md:block absolute top-6 left-16 w-[calc(100%-3rem)] h-[1px] bg-[var(--line)] group-hover:bg-[var(--accent-warm)] transition-colors duration-500" />
                )}
                {/* Connecting Line Mobile */}
                {idx % 2 === 0 && !isLast && (
                  <div className="block md:hidden absolute top-6 left-16 w-[calc(100%-3rem)] h-[1px] bg-[var(--line)] group-hover:bg-[var(--accent-warm)] transition-colors duration-500" />
                )}

                <div className="flex items-center gap-4 relative z-10">
                  <div className="flex items-center justify-center w-12 h-12 rounded-full bg-[var(--bg)] border border-[var(--line)] text-[var(--ink-muted)] group-hover:text-[var(--accent)] group-hover:border-[var(--accent-warm)] group-hover:bg-[var(--accent-warm-soft)] transition-all duration-300 shadow-sm">
                    <step.icon size={20} strokeWidth={1.5} />
                  </div>
                  <span className="text-numeral text-sm font-medium text-[var(--ink-discreet)] group-hover:text-[var(--accent)] transition-colors">
                    {step.id}
                  </span>
                </div>

                <div>
                  <h4 className="font-serif text-[var(--ink)] text-lg mb-1 group-hover:text-[var(--accent-hover)] transition-colors">
                    {step.title}
                  </h4>
                  <p className="text-sm text-[var(--ink-muted)]">
                    {step.description}
                  </p>
                </div>
              </div>
            );
          })}
        </div>

        <div className="mt-10 pt-5 border-t border-[var(--line)] flex items-center justify-between text-sm">
          <span className="text-[var(--ink-muted)] flex items-center gap-2">
            <span className="w-2 h-2 rounded-full bg-[var(--accent)]" />
            Traçabilité garantie
          </span>
          <span className="text-[var(--accent)] font-medium bg-[var(--accent-warm-soft)] px-3 py-1 rounded-full text-xs">
            Suivi étape par étape
          </span>
        </div>
      </div>
    </div>
  );
}
