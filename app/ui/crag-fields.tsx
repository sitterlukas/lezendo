import { inputClass } from "@/app/ui/style";

// The guidebook info fields shared by the add + edit crag forms. Added
// alongside the existing name/area/country/description inputs.
export default function CragFields({
  defaults,
}: {
  defaults?: {
    rock_type?: string | null;
    aspect?: string | null;
    best_season?: string | null;
    access_notes?: string | null;
  };
}) {
  return (
    <>
      <div className="grid grid-cols-2 gap-3 sm:col-span-2">
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Rock type
          </span>
          <input
            name="rock_type"
            defaultValue={defaults?.rock_type ?? ""}
            placeholder="e.g. Limestone"
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Aspect
          </span>
          <input
            name="aspect"
            defaultValue={defaults?.aspect ?? ""}
            placeholder="e.g. South-facing"
            className={inputClass}
          />
        </label>
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Best season
          </span>
          <input
            name="best_season"
            defaultValue={defaults?.best_season ?? ""}
            placeholder="e.g. Spring & Autumn"
            className={inputClass}
          />
        </label>
      </div>
      <label className="sm:col-span-2">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Access notes
        </span>
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
