"use client";

import { useState } from "react";
import Select from "./select";
import GradeSelect from "./grade-select";
import { disciplineOf, type GradeEquivalency } from "@/lib/grade-conversion";

type System = { id: number; name: string; slug: string };

export default function AddRouteForm({
  action,
  cragId,
  sectors = [],
  fixedSectorId,
  gradingSystems,
  equivalencies,
  defaultSystemId,
  inputClass,
}: {
  action: (formData: FormData) => void | Promise<void>;
  cragId: number;
  sectors?: { id: number; name: string }[];
  fixedSectorId?: number;
  gradingSystems: System[];
  equivalencies: GradeEquivalency[];
  defaultSystemId?: number | null;
  inputClass: string;
}) {
  const [style, setStyle] = useState("sport");
  const [systemId, setSystemId] = useState(
    String(defaultSystemId ?? gradingSystems[0]?.id ?? ""),
  );

  // Cross-check the grading system's discipline against the route type, mirroring
  // the server-side guard. Boulders take boulder grades; sport/trad take roped.
  const systemDiscipline =
    disciplineOf(
      gradingSystems.find((gs) => String(gs.id) === systemId)?.slug ?? "",
      equivalencies,
    ) ?? null;
  const want = style === "boulder" ? "boulder" : "rope";
  const mismatch = systemDiscipline !== null && systemDiscipline !== want;
  const error = mismatch
    ? want === "boulder"
      ? "Boulders must use a boulder grading system (e.g. Font or V-scale)."
      : "Roped routes must use a roped grading system (e.g. French, YDS, UIAA, or British)."
    : null;

  return (
    <form action={action} className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="crag_id" value={cragId} />
      {fixedSectorId != null && (
        <input type="hidden" name="sector_id" value={fixedSectorId} />
      )}
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Route name
        </span>
        <input
          name="name"
          placeholder="e.g. Moonlight Arête"
          required
          className={inputClass}
        />
      </label>
      <GradeSelect
        gradingSystems={gradingSystems}
        equivalencies={equivalencies}
        defaultSystemId={defaultSystemId}
        inputClass={inputClass}
        onSystemChange={setSystemId}
      />
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Type
        </span>
        <Select
          name="style"
          value={style}
          onChange={(e) => setStyle(e.target.value)}
        >
          <option value="sport">Sport climb</option>
          <option value="trad">Trad</option>
          <option value="boulder">Boulder</option>
        </Select>
      </label>
      {fixedSectorId == null && sectors.length > 0 && (
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Sector
          </span>
          <Select name="sector_id">
            <option value="">— no sector —</option>
            {sectors.map((s) => (
              <option key={s.id} value={s.id}>
                {s.name}
              </option>
            ))}
          </Select>
        </label>
      )}
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Height (m)
        </span>
        <input
          name="height_m"
          type="number"
          min="1"
          placeholder="optional"
          className={inputClass}
        />
      </label>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Description
        </span>
        <textarea
          name="description"
          placeholder="Beta, rock type, what makes it good… (optional)"
          rows={2}
          className={inputClass}
        />
      </label>
      {error && (
        <p
          role="alert"
          className="text-sm font-medium text-red-600 sm:col-span-2 dark:text-red-400"
        >
          {error}
        </p>
      )}
      <button
        type="submit"
        disabled={mismatch}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 sm:col-span-2 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        Add route
      </button>
    </form>
  );
}
