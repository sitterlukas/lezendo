"use client";

import { useEffect, useRef, useState } from "react";
import { useRouter } from "next/navigation";
import {
  disciplines,
  disciplineLabel,
  type Discipline,
} from "@/lib/leaderboard";

/**
 * Discipline filter as a custom dropdown (a styled popover, not a native
 * <select> — so the open menu can be themed). Selecting an option navigates to
 * the same path with the chosen discipline, preserving the current period.
 * `hash`/`scroll` let the homepage widget keep its scroll position.
 */
export default function DisciplineSelect({
  value,
  period,
  basePath,
  hash = "",
  scroll = true,
}: {
  value: Discipline;
  period: string;
  basePath: string;
  hash?: string;
  scroll?: boolean;
}) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const ref = useRef<HTMLDivElement>(null);

  // Close on outside click or Escape.
  useEffect(() => {
    if (!open) return;
    function onPointerDown(e: MouseEvent) {
      if (ref.current && !ref.current.contains(e.target as Node))
        setOpen(false);
    }
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") setOpen(false);
    }
    document.addEventListener("mousedown", onPointerDown);
    document.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onPointerDown);
      document.removeEventListener("keydown", onKey);
    };
  }, [open]);

  function select(d: Discipline) {
    setOpen(false);
    if (d === value) return;
    router.push(`${basePath}?period=${period}&discipline=${d}${hash}`, {
      scroll,
    });
  }

  return (
    <div ref={ref} className="relative">
      <button
        type="button"
        aria-label="Discipline"
        aria-haspopup="listbox"
        aria-expanded={open}
        onClick={() => setOpen((o) => !o)}
        className="inline-flex w-36 items-center justify-between gap-2 rounded border border-zinc-300 bg-white py-2 pl-3 pr-2.5 text-sm font-medium transition hover:border-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 dark:hover:border-zinc-500"
      >
        {disciplineLabel[value]}
        <svg
          className={`text-zinc-400 transition-transform ${open ? "rotate-180" : ""}`}
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M5 7.5l5 5 5-5"
            stroke="currentColor"
            strokeWidth="1.5"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      {open && (
        <ul
          role="listbox"
          className="absolute right-0 z-20 mt-1.5 w-44 origin-top-right overflow-hidden rounded-lg border border-zinc-200 bg-white p-1 shadow-lg ring-1 ring-black/5 dark:border-zinc-700 dark:bg-zinc-900 dark:ring-white/10"
        >
          {disciplines.map((d) => {
            const active = d === value;
            return (
              <li key={d} role="option" aria-selected={active}>
                <button
                  type="button"
                  onClick={() => select(d)}
                  className={`flex w-full items-center justify-between gap-2 rounded-md px-3 py-2 text-left text-sm transition ${
                    active
                      ? "bg-zinc-100 font-semibold text-zinc-900 dark:bg-zinc-800 dark:text-zinc-100"
                      : "text-zinc-600 hover:bg-zinc-50 dark:text-zinc-300 dark:hover:bg-zinc-800/60"
                  }`}
                >
                  {disciplineLabel[d]}
                  {active && (
                    <svg
                      width="15"
                      height="15"
                      viewBox="0 0 20 20"
                      fill="none"
                      aria-hidden="true"
                    >
                      <path
                        d="M4 10.5l4 4 8-9"
                        stroke="currentColor"
                        strokeWidth="2"
                        strokeLinecap="round"
                        strokeLinejoin="round"
                      />
                    </svg>
                  )}
                </button>
              </li>
            );
          })}
        </ul>
      )}
    </div>
  );
}
