import Link from "next/link";
import type { ClimbStyle } from "@whipperbook/db";
import { typeLabel, typeBadge } from "@/app/ui/style";

// Shared route card used in the routes grid on crag and sector pages. Renders an
// <li>, so place it directly inside a <ul>.
export default function RouteCard({
  route,
  cragId,
  ticked,
}: {
  route: {
    id: number;
    name: string;
    grade: string;
    systemName: string | null;
    style: ClimbStyle;
    height_m: number | null;
    description: string | null;
  };
  cragId: number;
  ticked: boolean;
}) {
  return (
    <li>
      <Link
        href={`/crags/${cragId}/routes/${route.id}`}
        className="flex h-full flex-col rounded border border-zinc-200 bg-white p-4 transition hover:-translate-y-0.5 hover:border-zinc-300 hover:shadow-md dark:border-zinc-800 dark:bg-zinc-900/50 dark:hover:border-zinc-700"
      >
        <div className="flex items-start justify-between gap-3">
          <span className="font-semibold leading-snug">{route.name}</span>
          <span className="shrink-0 rounded bg-zinc-900 px-2 py-0.5 text-center font-mono text-sm font-bold text-white dark:bg-zinc-100 dark:text-zinc-900">
            {route.grade}
          </span>
        </div>
        <div className="mt-2 flex flex-wrap items-center gap-2">
          <span
            className={`rounded px-2 py-0.5 text-xs font-medium ${typeBadge[route.style]}`}
          >
            {typeLabel[route.style]}
          </span>
          {route.systemName && (
            <span className="rounded bg-zinc-100 px-2 py-0.5 text-xs font-medium text-zinc-500 dark:bg-zinc-800 dark:text-zinc-400">
              {route.systemName}
            </span>
          )}
          {route.height_m !== null && (
            <span className="text-xs text-zinc-500">{route.height_m} m</span>
          )}
          {ticked && (
            <span className="rounded bg-green-100 px-2 py-0.5 text-xs font-medium text-green-800 dark:bg-green-900/50 dark:text-green-300">
              Climbed
            </span>
          )}
        </div>
        {route.description && (
          <p className="mt-2 line-clamp-2 text-xs leading-relaxed text-zinc-500 dark:text-zinc-400">
            {route.description}
          </p>
        )}
      </Link>
    </li>
  );
}
