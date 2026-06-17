"use client";

import { useState, useTransition } from "react";
import CreateModal from "@/app/ui/create-modal";
import CragFields from "@/app/ui/crag-fields";
import SectorFields from "@/app/ui/sector-fields";
import RouteFields from "@/app/ui/route-fields";
import ImageUpload from "@/app/ui/image-upload";
import MapPicker from "@/app/ui/map-picker";
import FieldLabel from "@/app/ui/field-label";
import Select from "@/app/ui/select";
import { apiFetch } from "@/lib/api-client";
import { inputClass } from "@/app/ui/style";
import type { GradeEquivalency } from "@/lib/grade-conversion";

type System = { id: number; name: string; slug: string };

function Step2Section({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
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
      endpoint="/api/crags"
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
      endpoint="/api/sectors"
      doneHref={(id) => `/crags/${cragId}/sectors/${id}`}
      renderStep2={(id) => (
        <>
          <Step2Section title="Photos">
            <ImageUpload entityType="sector" entityId={id} />
          </Step2Section>
          <Step2Section title="Location">
            <div className="grid gap-3">
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
  const [pending, startTransition] = useTransition();
  const [saved, setSaved] = useState(false);

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const latitude = String(fd.get("latitude") ?? "");
    const longitude = String(fd.get("longitude") ?? "");
    if (!latitude || !longitude) return;
    startTransition(async () => {
      await apiFetch(`/api/sectors/${sectorId}/location`, {
        method: "PATCH",
        body: { kind, latitude, longitude },
      });
      setSaved(true);
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="rounded border border-zinc-200 p-3 dark:border-zinc-800"
    >
      <p className="text-xs font-medium">{label}</p>
      <div className="mt-2">
        <MapPicker />
      </div>
      <button
        type="submit"
        disabled={pending}
        className="mt-2 inline-flex items-center gap-1 rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
      >
        {saved ? `${label} saved` : `Save ${label.toLowerCase()}`}
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
      endpoint="/api/routes"
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
