"use client";

import { useActionState, useEffect, useState } from "react";
import { updateGradingSystem } from "@/app/auth-actions";
import Select from "@/app/ui/select";
import { disciplineOf, type GradeEquivalency } from "@/lib/grade-conversion";

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
  const [state, action, pending] = useActionState(updateGradingSystem, { saved: false });
  const [showToast, setShowToast] = useState(false);

  useEffect(() => {
    if (state.saved && !pending) {
      setShowToast(true);
      const t = setTimeout(() => setShowToast(false), 2500);
      return () => clearTimeout(t);
    }
  }, [state.saved, pending]);

  const ropeSystems = gradingSystems.filter((gs) => disciplineOf(gs.slug, equivalencies) === "rope");
  const boulderSystems = gradingSystems.filter((gs) => disciplineOf(gs.slug, equivalencies) === "boulder");

  return (
    <>
      <form
        action={action}
        className="flex flex-wrap items-end gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800"
      >
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Preferred rope grading system
          </span>
          <Select name="preferred_rope_grading_system_id" defaultValue={ropeDefault ?? ""}>
            <option value="">— no preference —</option>
            {ropeSystems.map((gs) => (
              <option key={gs.id} value={gs.id}>{gs.name}</option>
            ))}
          </Select>
        </label>
        <label className="min-w-[10rem] flex-1">
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Preferred bouldering grading system
          </span>
          <Select name="preferred_boulder_grading_system_id" defaultValue={boulderDefault ?? ""}>
            <option value="">— no preference —</option>
            {boulderSystems.map((gs) => (
              <option key={gs.id} value={gs.id}>{gs.name}</option>
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
          showToast ? "translate-y-0 opacity-100" : "translate-y-3 opacity-0 pointer-events-none"
        }`}
      >
        <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M4 10l5 5 7-8" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" />
        </svg>
        Grading system saved
      </div>
    </>
  );
}
