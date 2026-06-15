import { inputClass } from "@/app/ui/style";
import FieldLabel from "@/app/ui/field-label";

// Shared sector form fields (name, description, approach, aspect), used by the
// add + edit sector modals on both the crag and sector pages. The parent
// supplies the <form>, any hidden inputs and the submit button.
// `showRequiredHints` adds required(*)/optional markers (on for create).
export default function SectorFields({
  defaults,
  showRequiredHints = false,
}: {
  defaults?: {
    name?: string;
    description?: string | null;
    approach_minutes?: number | null;
    aspect?: string | null;
  };
  showRequiredHints?: boolean;
}) {
  return (
    <>
      <label>
        <FieldLabel required hint={showRequiredHints}>
          Name
        </FieldLabel>
        <input
          name="name"
          defaultValue={defaults?.name ?? ""}
          required
          className={inputClass}
        />
      </label>
      <label>
        <FieldLabel hint={showRequiredHints}>Description</FieldLabel>
        <textarea
          name="description"
          defaultValue={defaults?.description ?? ""}
          rows={2}
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <FieldLabel hint={showRequiredHints}>Approach (min)</FieldLabel>
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
          <FieldLabel hint={showRequiredHints}>Aspect</FieldLabel>
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
