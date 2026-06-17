import type { ClimbStyle } from "@whipperbook/db";

export const typeLabel: Record<ClimbStyle, string> = {
  sport: "Sport climb",
  trad: "Trad",
  boulder: "Boulder",
};

export const typeBadge: Record<ClimbStyle, string> = {
  sport: "bg-sky-100 text-sky-800 dark:bg-sky-900/50 dark:text-sky-300",
  trad: "bg-amber-100 text-amber-800 dark:bg-amber-900/50 dark:text-amber-300",
  boulder:
    "bg-emerald-100 text-emerald-800 dark:bg-emerald-900/50 dark:text-emerald-300",
};

export const inputClass =
  "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900";
