"use client";

import { type SelectHTMLAttributes } from "react";
import Select from "@/app/ui/select";
import { type SectorTag } from "@whipperbook/db";

export type SectorOption = SectorTag;

// A sector picker grouped by crag (one <optgroup> per crag). Emits a
// `sector_id` field. Forwards select props, so it works both uncontrolled
// (inside a form, with `defaultValue`) and controlled (`value` + `onChange`).
export default function SectorSelect({
  sectors,
  ...props
}: { sectors: SectorOption[] } & SelectHTMLAttributes<HTMLSelectElement>) {
  // Group while preserving the incoming (name-sorted) order.
  const groups: { cragId: number; cragName: string; items: SectorOption[] }[] =
    [];
  const index = new Map<number, number>();
  for (const s of sectors) {
    let i = index.get(s.cragId);
    if (i === undefined) {
      i = groups.length;
      index.set(s.cragId, i);
      groups.push({ cragId: s.cragId, cragName: s.cragName, items: [] });
    }
    groups[i].items.push(s);
  }

  return (
    <Select name="sector_id" {...props}>
      <option value="">—</option>
      {groups.map((g) => (
        <optgroup key={g.cragId} label={g.cragName}>
          {g.items.map((s) => (
            <option key={s.id} value={s.id}>
              {s.name}
            </option>
          ))}
        </optgroup>
      ))}
    </Select>
  );
}
