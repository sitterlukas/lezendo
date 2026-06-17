import type { ReactNode } from "react";

export type Fact = { label: string; value: ReactNode };

// A label → value list. Empty values (null/undefined/""/false) are dropped, so
// callers can pass the full set and let blanks disappear. Renders nothing if
// everything is empty.
//   variant "inline"  — horizontal strip (page header / quick facts)
//   variant "stacked" — vertical rows (a facts card)
export default function FactList({
  items,
  variant = "stacked",
  className = "",
}: {
  items: Fact[];
  variant?: "inline" | "stacked";
  className?: string;
}) {
  const facts = items.filter(
    (f) =>
      f.value !== null &&
      f.value !== undefined &&
      f.value !== false &&
      f.value !== "",
  );
  if (facts.length === 0) return null;

  return (
    <dl
      className={`${
        variant === "inline" ? "flex flex-wrap gap-x-8 gap-y-3" : "space-y-3"
      } ${className}`}
    >
      {facts.map((f) => (
        <div key={f.label}>
          <dt className="text-xs uppercase tracking-wider text-zinc-400">
            {f.label}
          </dt>
          <dd className="mt-0.5 font-medium">{f.value}</dd>
        </div>
      ))}
    </dl>
  );
}
