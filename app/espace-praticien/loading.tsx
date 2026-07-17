function Bone({ className }: { className?: string }) {
  return (
    <div
      aria-hidden="true"
      className={`bg-[var(--line)]/70 animate-pulse ${className ?? ""}`}
    />
  );
}

/**
 * Affiché pendant le chargement des Server Components enfants du layout
 * espace praticien (la barre de nav reste visible).
 */
export default function EspacePraticienLoading() {
  return (
    <div
      role="status"
      aria-live="polite"
      aria-busy="true"
      className="flex flex-col gap-8 max-w-4xl"
    >
      <span className="sr-only">Chargement de la page…</span>

      <header className="flex flex-col gap-3">
        <Bone className="h-3 w-24" />
        <Bone className="h-8 w-64 max-w-full" />
        <Bone className="h-4 w-full max-w-xl" />
      </header>

      <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        <Bone className="h-24 border border-[var(--line)]" />
        <Bone className="h-24 border border-[var(--line)]" />
        <Bone className="h-24 border border-[var(--line)]" />
        <Bone className="h-24 border border-[var(--line)]" />
      </div>

      <div className="border border-[var(--line)] bg-[var(--bg-elevated)] p-6 flex flex-col gap-4">
        <Bone className="h-4 w-40" />
        <Bone className="h-3 w-full" />
        <Bone className="h-3 w-[90%]" />
        <Bone className="h-3 w-[80%]" />
        <Bone className="mt-2 h-3 w-full" />
        <Bone className="h-3 w-3/4" />
      </div>
    </div>
  );
}
