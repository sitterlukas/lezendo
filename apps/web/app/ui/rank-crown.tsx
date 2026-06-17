// Blue crown for the top three leaderboard ranks — darker blue for 1st, lighter
// for 3rd. Renders nothing for rank 4 and below.
const crownColor: Record<number, string> = {
  1: "text-blue-600 dark:text-blue-400",
  2: "text-blue-400 dark:text-blue-300",
  3: "text-blue-300 dark:text-blue-200",
};

export default function RankCrown({
  rank,
  size = 16,
}: {
  rank: number;
  size?: number;
}) {
  const color = crownColor[rank];
  if (!color) return null;
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 24 24"
      fill="currentColor"
      aria-label={`Rank ${rank}`}
      className={`shrink-0 ${color}`}
    >
      {/* crown: side pillars, two valleys, centre peak, flat base */}
      <path d="M3 17 3 8 8 12 12 6 16 12 21 8 21 17 Z" />
      <circle cx="3" cy="7" r="1.4" />
      <circle cx="12" cy="5" r="1.4" />
      <circle cx="21" cy="7" r="1.4" />
    </svg>
  );
}
