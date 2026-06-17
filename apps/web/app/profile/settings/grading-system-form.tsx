"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import Select from "@/app/ui/select";
import { disciplineOf, type GradeEquivalency } from "@whipperbook/core";

export default function GradingSystemForm({
  gradingSystems,
  equivalencies,
  ropeDefault,
  boulderDefault,
}: {
  gradingSystems: { id: number; name: string; slug: string }[];
  equivalencies: GradeEquivalency[];
  ropeDefault: number | null;
  boulderDefault: number | null;
}) {
  const router = useRouter();
  const ropeSystems = gradingSystems.filter(
    (gs) => disciplineOf(gs.slug, equivalencies) === "rope",
  );
  const boulderSystems = gradingSystems.filter(
    (gs) => disciplineOf(gs.slug, equivalencies) === "boulder",
  );

  // Preferences are seeded with DB defaults (UIAA / Fontainebleau) and never
  // cleared by this form, so the incoming values are always set.
  const [rope, setRope] = useState(String(ropeDefault ?? ""));
  const [boulder, setBoulder] = useState(String(boulderDefault ?? ""));
  const [pending, startTransition] = useTransition();
  const [showToast, setShowToast] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    // Submit manually instead of via a form action: React's automatic form
    // reset after an action briefly flips the controlled selects back to their
    // first option before our state re-applies, which reads as a flicker.
    e.preventDefault();
    startTransition(async () => {
      await apiFetch("/api/me", {
        method: "PATCH",
        body: {
          preferred_rope_grading_system_id: rope ? Number(rope) : null,
          preferred_boulder_grading_system_id: boulder ? Number(boulder) : null,
        },
      });
      // Re-fetch server components so the new preference shows everywhere
      // without a manual page refresh.
      router.refresh();
      setShowToast(true);
      setTimeout(() => setShowToast(false), 2500);
    });
  }

  return (
    <>
      <form
        onSubmit={handleSubmit}
        className="flex flex-wrap items-end gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800"
      >
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Preferred rope grading system
          </span>
          <Select
            name="preferred_rope_grading_system_id"
            value={rope}
            onChange={(e) => setRope(e.target.value)}
          >
            {ropeSystems.map((gs) => (
              <option key={gs.id} value={gs.id}>
                {gs.name}
              </option>
            ))}
          </Select>
        </label>
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Preferred bouldering grading system
          </span>
          <Select
            name="preferred_boulder_grading_system_id"
            value={boulder}
            onChange={(e) => setBoulder(e.target.value)}
          >
            {boulderSystems.map((gs) => (
              <option key={gs.id} value={gs.id}>
                {gs.name}
              </option>
            ))}
          </Select>
        </label>
        <button
          type="submit"
          disabled={pending}
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          {pending ? "Saving…" : "Save"}
        </button>
      </form>

      <div
        role="status"
        aria-live="polite"
        className={`fixed bottom-6 left-1/2 z-50 flex -translate-x-1/2 items-center gap-2 rounded-full bg-zinc-900 px-4 py-2 text-sm font-medium text-white shadow-lg transition-all duration-300 dark:bg-zinc-100 dark:text-zinc-900 ${
          showToast
            ? "translate-y-0 opacity-100"
            : "pointer-events-none translate-y-3 opacity-0"
        }`}
      >
        <svg
          width="14"
          height="14"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M4 10l5 5 7-8"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        Grading system saved
      </div>
    </>
  );
}
