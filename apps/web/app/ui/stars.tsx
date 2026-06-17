// Read-only star rating display. Blue filled stars, muted empties.
export default function Stars({
  rating,
  className = "text-base",
}: {
  rating: number;
  className?: string;
}) {
  const filled = Math.round(rating);
  return (
    <span
      className={`font-mono leading-none tracking-tight text-blue-500 ${className}`}
      aria-label={`${rating} out of 5 stars`}
      title={`${rating} out of 5`}
    >
      {"★".repeat(filled)}
      <span className="text-zinc-300 dark:text-zinc-600">
        {"★".repeat(5 - filled)}
      </span>
    </span>
  );
}
