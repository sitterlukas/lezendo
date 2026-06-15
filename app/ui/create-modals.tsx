"use client";

import { useState } from "react";
import CreateModal from "@/app/ui/create-modal";
import CragFields from "@/app/ui/crag-fields";
import SectorFields from "@/app/ui/sector-fields";
import RouteFields from "@/app/ui/route-fields";
import ImageUpload from "@/app/ui/image-upload";
import FieldLabel from "@/app/ui/field-label";
import Select from "@/app/ui/select";
import { addCrag, addSector, addRoute, updateSectorLocation } from "@/app/actions";
import { inputClass } from "@/app/ui/style";
import type { GradeEquivalency } from "@/lib/grade-conversion";

type System = { id: number; name: string; slug: string };

function Step2Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div>
      <p className="text-sm font-medium">{title}</p>
      <div className="mt-2">{children}</div>
    </div>
  );
}

// --- Crag ------------------------------------------------------------------
export function CreateCragModal({ allCountries }: { allCountries: string[] }) {
  return (
    <CreateModal
      triggerLabel="Add crag"
      title="Add a crag"
      action={addCrag}
      doneHref={(id) => `/crags/${id}`}
      renderStep2={(id) => (
        <Step2Section title="Add photos">
          <ImageUpload entityType="crag" entityId={id} />
        </Step2Section>
      )}
    >
      <label>
        <FieldLabel required hint>
          Name
        </FieldLabel>
        <input
          name="name"
          required
          placeholder="e.g. Smith Rock"
          className={inputClass}
        />
      </label>
      <div className="grid grid-cols-2 gap-3">
        <label>
          <FieldLabel hint>Area</FieldLabel>
          <input name="area" placeholder="e.g. Oregon" className={inputClass} />
        </label>
        <label>
          <FieldLabel hint>Country</FieldLabel>
          <Select name="country" defaultValue="">
            <option value="">—</option>
            {allCountries.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </Select>
        </label>
      </div>
      <label>
        <FieldLabel hint>Description</FieldLabel>
        <textarea
          name="description"
          rows={2}
          placeholder="Rock, character, history… (optional)"
          className={inputClass}
        />
      </label>
      <CragFields showRequiredHints />
    </CreateModal>
  );
}

// --- Sector ----------------------------------------------------------------
export function CreateSectorModal({ cragId }: { cragId: number }) {
  return (
    <CreateModal
      triggerLabel="Add sector"
      title="Add a sector"
      subtitle="Group routes by wall, face, or area."
      action={addSector}
      doneHref={(id) => `/crags/${cragId}/sectors/${id}`}
      renderStep2={(id) => (
        <>
          <Step2Section title="Photos">
            <ImageUpload entityType="sector" entityId={id} />
          </Step2Section>
          <Step2Section title="Location">
            <div className="grid gap-3 sm:grid-cols-2">
              <LocationMini sectorId={id} kind="sector" label="Sector" />
              <LocationMini sectorId={id} kind="parking" label="Parking" />
            </div>
          </Step2Section>
        </>
      )}
    >
      <input type="hidden" name="crag_id" value={cragId} />
      <SectorFields showRequiredHints />
    </CreateModal>
  );
}

function LocationMini({
  sectorId,
  kind,
  label,
}: {
  sectorId: number;
  kind: "sector" | "parking";
  label: string;
}) {
  return (
    <form
      action={updateSectorLocation}
      className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <input type="hidden" name="sector_id" value={sectorId} />
      <input type="hidden" name="kind" value={kind} />
      <p className="text-xs font-medium">{label}</p>
      <div className="mt-2 grid grid-cols-2 gap-2">
        <input
          name="latitude"
          type="number"
          step="any"
          min={-90}
          max={90}
          placeholder="Lat"
          className={inputClass}
        />
        <input
          name="longitude"
          type="number"
          step="any"
          min={-180}
          max={180}
          placeholder="Lng"
          className={inputClass}
        />
      </div>
      <button
        type="submit"
        className="mt-2 inline-flex items-center gap-1 rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      >
        Save {label.toLowerCase()}
      </button>
    </form>
  );
}

// --- Route -----------------------------------------------------------------
export function CreateRouteModal({
  cragId,
  sectors,
  fixedSectorId,
  gradingSystems,
  equivalencies,
  defaultSystemId,
}: {
  cragId: number;
  sectors?: { id: number; name: string }[];
  fixedSectorId?: number;
  gradingSystems: System[];
  equivalencies: GradeEquivalency[];
  defaultSystemId?: number | null;
}) {
  const [valid, setValid] = useState(true);
  return (
    <CreateModal
      triggerLabel="Add route"
      title="Add a route"
      action={addRoute}
      canSubmit={valid}
      doneHref={(id) => `/crags/${cragId}/routes/${id}`}
      renderStep2={(id) => (
        <Step2Section title="Add photos">
          <ImageUpload entityType="route" entityId={id} />
        </Step2Section>
      )}
    >
      <RouteFields
        cragId={cragId}
        sectors={sectors}
        fixedSectorId={fixedSectorId}
        gradingSystems={gradingSystems}
        equivalencies={equivalencies}
        defaultSystemId={defaultSystemId}
        inputClass={inputClass}
        onValidityChange={setValid}
      />
    </CreateModal>
  );
}
