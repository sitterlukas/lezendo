import { inputClass } from "@/app/ui/style";

// Shared sector form fields (name, description, approach, aspect), used by the
// add + edit sector modals on both the crag and sector pages. The parent
// supplies the <form>, any hidden inputs and the submit button.
export default function SectorFields({
  defaults,
}: {
  defaults?: {
    name?: string;
    description?: string | null;
    approach_minutes?: number | null;
    aspect?: string | null;
  };
}) {
  return (
    <>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Name
        </span>
        <input
          name="name"
          defaultValue={defaults?.name ?? ""}
          required
          className={inputClass}
        />
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Description
        </span>
        <textarea
          name="description"
          defaultValue={defaults?.description ?? ""}
          rows={2}
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Approach (min)
          </span>
          <input
            name="approach_minutes"
            type="number"
            min="0"
            defaultValue={defaults?.approach_minutes ?? ""}
            placeholder="optional"
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
      </div>
    </>
  );
}
