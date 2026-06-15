"use client";

import { useState } from "react";
import Select from "./select";
import { gradesForSystem, type GradeEquivalency } from "@/lib/grade-conversion";

interface GradingSystem {
  id: number;
  name: string;
  slug: string;
}

interface Props {
  gradingSystems: GradingSystem[];
  equivalencies: GradeEquivalency[];
  defaultSystemId?: number | null;
  defaultGrade?: string;
  inputClass?: string;
}

export default function GradeSelect({
  gradingSystems,
  equivalencies,
  defaultSystemId,
  defaultGrade,
  inputClass,
}: Props) {
  const [systemId, setSystemId] = useState(
    defaultSystemId ? String(defaultSystemId) : "",
  );
  const [grade, setGrade] = useState(defaultGrade ?? "");

  const selectedSlug =
    gradingSystems.find((gs) => String(gs.id) === systemId)?.slug ?? null;
  const gradeOptions = selectedSlug
    ? gradesForSystem(selectedSlug, equivalencies)
    : [];

  function handleSystemChange(e: React.ChangeEvent<HTMLSelectElement>) {
    setSystemId(e.target.value);
    setGrade("");
  }

  return (
    <>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Grading system
        </span>
        <Select
          name="grading_system_id"
          value={systemId}
          onChange={handleSystemChange}
        >
          <option value="">— pick system —</option>
          {gradingSystems.map((gs) => (
            <option key={gs.id} value={gs.id}>
              {gs.name}
            </option>
          ))}
        </Select>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Grade
        </span>
        {gradeOptions.length > 0 ? (
          <Select
            name="grade"
            required
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
          >
            <option value="">— pick grade —</option>
            {gradeOptions.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </Select>
        ) : (
          <input
            name="grade"
            required
            value={grade}
            onChange={(e) => setGrade(e.target.value)}
            placeholder={selectedSlug ? "Enter grade" : "Pick system first"}
            disabled={!selectedSlug && gradeOptions.length === 0}
            className={
              inputClass ??
              "w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm placeholder:text-zinc-400 focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
            }
          />
        )}
      </label>
    </>
  );
}
