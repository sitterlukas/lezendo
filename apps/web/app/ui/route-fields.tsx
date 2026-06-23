"use client";

import { useEffect, useState } from "react";
import Select from "./select";
import GradeSelect from "./grade-select";
import FieldLabel from "@/app/ui/field-label";
import { disciplineOf, type GradeEquivalency } from "@whipperbook/core";

type System = { id: number; name: string; slug: string };

// Route create fields (no <form>, no submit) for use inside CreateModal. Owns
// the style↔grading-system mismatch check and reports validity up so the modal
// can disable its submit button.
export default function RouteFields({
  cragId,
  sectors = [],
  fixedSectorId,
  gradingSystems,
  equivalencies,
  defaultSystemId,
  inputClass,
  onValidityChange,
}: {
  cragId: number;
  sectors?: { id: number; name: string }[];
  fixedSectorId?: number;
  gradingSystems: System[];
  equivalencies: GradeEquivalency[];
  defaultSystemId?: number | null;
  inputClass: string;
  onValidityChange?: (valid: boolean) => void;
}) {
  const [style, setStyle] = useState("sport");
  const [systemId, setSystemId] = useState(
    String(defaultSystemId ?? gradingSystems[0]?.id ?? ""),
  );

  // Boulders take boulder grades; sport/trad take roped — mirrors the server guard.
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

  useEffect(() => {
    onValidityChange?.(!mismatch);
  }, [mismatch, onValidityChange]);

  return (
    <div className="grid gap-4 sm:grid-cols-2">
      <input type="hidden" name="crag_id" value={cragId} />
      {fixedSectorId != null && (
        <input type="hidden" name="sector_id" value={fixedSectorId} />
      )}
      <label className="sm:col-span-2">
        <FieldLabel required hint>
          Route name
        </FieldLabel>
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
        <FieldLabel required hint>
          Type
        </FieldLabel>
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
          <FieldLabel hint>Sector</FieldLabel>
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
        <FieldLabel hint>Length (m)</FieldLabel>
        <input
          name="height_m"
          type="number"
          min="1"
          placeholder="optional"
          className={inputClass}
        />
      </label>
      {style !== "boulder" && (
        <label>
          <FieldLabel hint>Bolts</FieldLabel>
          <input
            name="bolt_count"
            type="number"
            min="0"
            placeholder="optional"
            className={inputClass}
          />
        </label>
      )}
      <label>
        <FieldLabel hint>Pitches</FieldLabel>
        <input
          name="pitches"
          type="number"
          min="1"
          placeholder="1"
          className={inputClass}
        />
      </label>
      <label>
        <FieldLabel hint>First ascent year</FieldLabel>
        <input
          name="first_ascent_year"
          type="number"
          min="1900"
          placeholder="optional"
          className={inputClass}
        />
      </label>
      <label className="sm:col-span-2">
        <FieldLabel hint>First ascensionist</FieldLabel>
        <input
          name="first_ascensionist"
          placeholder="Who made the first ascent (optional)"
          className={inputClass}
        />
      </label>
      {style !== "boulder" && (
        <label className="sm:col-span-2">
          <FieldLabel hint>Gear / protection</FieldLabel>
          <input
            name="gear_notes"
            placeholder="e.g. Sport-bolted with lower-off, or single rack to 3 inches (optional)"
            className={inputClass}
          />
        </label>
      )}
      <label className="sm:col-span-2">
        <FieldLabel hint>Description</FieldLabel>
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
    </div>
  );
}
