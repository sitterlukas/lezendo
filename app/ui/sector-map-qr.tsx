import QRCode from "qrcode";
import Modal from "@/app/ui/modal";
import MapPicker from "@/app/ui/map-picker";
import ApiForm from "@/app/ui/api-form";

type Point = {
  key: "sector" | "parking";
  label: string;
  blurb: string;
  latitude: number | null;
  longitude: number | null;
};

function PinIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <path
        d="M10 18s6-5.3 6-10A6 6 0 0 0 4 8c0 4.7 6 10 6 10Z"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinejoin="round"
      />
      <circle cx="10" cy="8" r="2" stroke="currentColor" strokeWidth="1.6" />
    </svg>
  );
}

function ParkingIcon() {
  return (
    <svg
      width="14"
      height="14"
      viewBox="0 0 20 20"
      fill="none"
      aria-hidden="true"
    >
      <rect
        x="3"
        y="3"
        width="14"
        height="14"
        rx="3"
        stroke="currentColor"
        strokeWidth="1.6"
      />
      <path
        d="M7.5 14.5V6h3a2.25 2.25 0 0 1 0 4.5h-3"
        stroke="currentColor"
        strokeWidth="1.6"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PointLabel({ point }: { point: Point }) {
  return (
    <p className="flex items-center gap-1.5 text-sm font-semibold">
      {point.key === "parking" ? <ParkingIcon /> : <PinIcon />}
      {point.label}
    </p>
  );
}

// Shared add/edit modal — the action upserts coordinates either way, so the
// only difference is the labels and whether the fields start pre-filled.
function LocationForm({
  point,
  sectorId,
  name,
  triggerLabel,
  center,
}: {
  point: Point;
  sectorId: number;
  name: string;
  triggerLabel: string;
  center?: [number, number];
}) {
  const isSet = point.latitude !== null && point.longitude !== null;
  const verb = isSet ? "Edit" : "Add";

  return (
    <Modal
      triggerLabel={triggerLabel}
      variant="ghost"
      title={`${verb} ${point.label.toLowerCase()} location`}
      subtitle={`Set the ${point.label.toLowerCase()} coordinates for ${name}.`}
    >
      <ApiForm
        endpoint={`/api/sectors/${sectorId}/location`}
        method="PATCH"
        className="grid gap-4"
      >
        <input type="hidden" name="kind" value={point.key} />
        <MapPicker
          defaultLat={point.latitude}
          defaultLng={point.longitude}
          center={center}
        />
        <button
          type="submit"
          className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        >
          Save location
        </button>
      </ApiForm>
    </Modal>
  );
}

async function LocationCard({
  point,
  sectorId,
  name,
  canEdit,
  center,
}: {
  point: Point;
  sectorId: number;
  name: string;
  canEdit: boolean;
  center?: [number, number];
}) {
  const mapsUrl = `https://www.google.com/maps/search/?api=1&query=${point.latitude},${point.longitude}`;
  const svg = await QRCode.toString(mapsUrl, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
  });
  const coords = `${point.latitude!.toFixed(5)}, ${point.longitude!.toFixed(5)}`;

  return (
    <div className="flex items-center gap-3">
      <a
        href={mapsUrl}
        target="_blank"
        rel="noopener noreferrer"
        aria-label={`Open ${name} ${point.label.toLowerCase()} in Google Maps`}
        className="block shrink-0 rounded bg-white p-1.5 ring-1 ring-zinc-200 transition hover:ring-zinc-400 dark:ring-zinc-700"
      >
        {/* QR stays black-on-white so it scans in dark mode too. */}
        <div
          className="h-16 w-16 [&>svg]:h-full [&>svg]:w-full"
          dangerouslySetInnerHTML={{ __html: svg }}
        />
      </a>
      <div className="min-w-0">
        <PointLabel point={point} />
        <p className="mt-1 font-mono text-xs tabular-nums text-zinc-500">
          {coords}
        </p>
        <div className="mt-1.5 flex flex-wrap items-center gap-3">
          <a
            href={mapsUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex items-center gap-1 text-sm font-medium text-zinc-900 underline underline-offset-2 hover:text-zinc-600 dark:text-zinc-100 dark:hover:text-zinc-300"
          >
            Open in Maps
            <svg
              width="13"
              height="13"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M7 4h9v9M16 4 8 12"
                stroke="currentColor"
                strokeWidth="1.7"
                strokeLinecap="round"
                strokeLinejoin="round"
              />
            </svg>
          </a>
          {canEdit && (
            <LocationForm
              point={point}
              sectorId={sectorId}
              name={name}
              triggerLabel="Edit"
              center={center}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function AddLocationPlaceholder({
  point,
  sectorId,
  name,
  center,
}: {
  point: Point;
  sectorId: number;
  name: string;
  center?: [number, number];
}) {
  return (
    <div className="flex min-h-[7rem] flex-col items-center justify-center gap-2 rounded border border-dashed border-zinc-300 p-4 text-center dark:border-zinc-700">
      <PointLabel point={point} />
      <p className="text-xs text-zinc-400 dark:text-zinc-500">
        No coordinates yet.
      </p>
      <LocationForm
        point={point}
        sectorId={sectorId}
        name={name}
        triggerLabel={`Add ${point.label.toLowerCase()} location`}
        center={center}
      />
    </div>
  );
}

/**
 * "Location" section for a sector: a scannable QR + maps link for the sector
 * itself and for the recommended parking. Editors (author/admin) can add
 * coordinates that aren't set yet and edit ones that are. Renders nothing when
 * there's nothing to show (no coordinates and the viewer can't edit).
 * Server component — QR SVGs are generated at request time.
 */
export default async function SectorMapQR({
  sectorId,
  name,
  canEdit,
  latitude,
  longitude,
  parkingLatitude,
  parkingLongitude,
}: {
  sectorId: number;
  name: string;
  canEdit: boolean;
  latitude: number | null;
  longitude: number | null;
  parkingLatitude: number | null;
  parkingLongitude: number | null;
}) {
  const points = [
    {
      key: "sector",
      label: "Sector",
      blurb: "Scan to open the wall in Maps.",
      latitude,
      longitude,
    },
    {
      key: "parking",
      label: "Parking",
      blurb: "Park here, then walk in to the sector.",
      latitude: parkingLatitude,
      longitude: parkingLongitude,
    },
  ] satisfies Point[];

  // Show a card when coordinates exist, or an add-placeholder when the viewer
  // can edit; otherwise the slot is hidden.
  const slots = points.filter(
    (p) => (p.latitude !== null && p.longitude !== null) || canEdit,
  );
  if (slots.length === 0) return null;

  // Open each picker near the wall when the sector coords are known.
  const sectorCenter: [number, number] | undefined =
    latitude !== null && longitude !== null ? [latitude, longitude] : undefined;

  return (
    <section className="flex h-full flex-col rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <h2 className="text-xl font-bold tracking-tight">Location</h2>
      <div className="mt-3 space-y-4">
        {slots.map((point) =>
          point.latitude !== null && point.longitude !== null ? (
            <LocationCard
              key={point.key}
              point={point}
              sectorId={sectorId}
              name={name}
              canEdit={canEdit}
              center={sectorCenter}
            />
          ) : (
            <AddLocationPlaceholder
              key={point.key}
              point={point}
              sectorId={sectorId}
              name={name}
              center={sectorCenter}
            />
          ),
        )}
      </div>
    </section>
  );
}
