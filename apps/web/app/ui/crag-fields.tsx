import { inputClass } from "@/app/ui/style";
import FieldLabel from "@/app/ui/field-label";

// The guidebook info fields shared by the add + edit crag forms. Added
// alongside the existing name/area/country/description inputs.
// `showRequiredHints` adds optional markers (on for create); all here optional.
export default function CragFields({
  defaults,
  showRequiredHints = false,
}: {
  defaults?: {
    rock_type?: string | null;
    aspect?: string | null;
    best_season?: string | null;
    access_notes?: string | null;
  };
  showRequiredHints?: boolean;
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        <label>
          <FieldLabel hint={showRequiredHints}>Rock type</FieldLabel>
          <input
            name="rock_type"
            defaultValue={defaults?.rock_type ?? ""}
            placeholder="e.g. Limestone"
            className={inputClass}
          />
        </label>
        <label>
          <FieldLabel hint={showRequiredHints}>Aspect</FieldLabel>
          <input
            name="aspect"
            defaultValue={defaults?.aspect ?? ""}
            placeholder="e.g. South-facing"
            className={inputClass}
          />
        </label>
        <label>
          <FieldLabel hint={showRequiredHints}>Best season</FieldLabel>
          <input
            name="best_season"
            defaultValue={defaults?.best_season ?? ""}
            placeholder="e.g. Spring & Autumn"
            className={inputClass}
          />
        </label>
      </div>
      <label className="sm:col-span-2">
        <FieldLabel hint={showRequiredHints}>Access notes</FieldLabel>
        <textarea
          name="access_notes"
          defaultValue={defaults?.access_notes ?? ""}
          rows={2}
          placeholder="Parking, restrictions, seasonal bans… (optional)"
          className={inputClass}
        />
      </label>
    </>
  );
}
