// Shared loading placeholder. Pages compose these (with sizing/shape via
// `className`) to mirror their real layout while data loads. The shimmer sweep
// comes from the `shimmer` utility in globals.css.
const base = {
  block: "bg-zinc-200 dark:bg-zinc-800",
  card: "border border-zinc-200 bg-white dark:border-zinc-800 dark:bg-zinc-900/50",
};

export function Skeleton({
  variant = "block",
  className = "",
}: {
  variant?: "block" | "card";
  className?: string;
}) {
  return (
    <div
      aria-hidden
      className={`shimmer rounded ${base[variant]} ${className}`}
    />
  );
}
