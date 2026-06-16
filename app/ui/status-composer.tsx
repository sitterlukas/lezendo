"use client";

import { useState } from "react";
import CreateModal from "@/app/ui/create-modal";
import ImageUpload from "@/app/ui/image-upload";
import Select from "@/app/ui/select";
import { createStatus } from "@/app/actions";
import { STATUS_MAX_LEN } from "@/lib/constants";
import { inputClass } from "@/app/ui/style";

type Crag = { id: number; name: string };
type Route = { id: number; name: string; grade: string; crag_id: number };

export default function StatusComposer({
  crags,
  routes,
}: {
  crags: Crag[];
  routes: Route[];
}) {
  const [text, setText] = useState("");
  const [cragId, setCragId] = useState("");
  const remaining = STATUS_MAX_LEN - text.length;

  // Once a crag is picked, offer its routes so you can share a specific route.
  const cragRoutes = cragId
    ? routes.filter((r) => String(r.crag_id) === cragId)
    : [];

  return (
    <CreateModal
      triggerLabel="Post status"
      title="Post a status"
      subtitle="Share what's on your mind. Tag a crag or route, add photos (optional)."
      action={createStatus}
      canSubmit={text.trim().length > 0 && remaining >= 0}
      submitLabel="Post"
      doneHref={() => "/feed"}
      renderStep2={(id) => <Step2Photos statusId={id} />}
    >
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Status
        </span>
        <textarea
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={STATUS_MAX_LEN}
          placeholder="Sent my first 7a today!! 🙌"
          className={inputClass}
        />
        <span
          className={`mt-1 block text-right text-xs ${
            remaining < 0 ? "text-red-500" : "text-zinc-400"
          }`}
        >
          {remaining}
        </span>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Crag (optional)
        </span>
        <Select
          name="crag_id"
          value={cragId}
          onChange={(e) => setCragId(e.target.value)}
        >
          <option value="">—</option>
          {crags.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
      {cragRoutes.length > 0 && (
        <label>
          <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Route (optional)
          </span>
          {/* key remounts the select when the crag changes, clearing any prior pick */}
          <Select key={cragId} name="route_id" defaultValue="">
            <option value="">—</option>
            {cragRoutes.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name} · {r.grade}
              </option>
            ))}
          </Select>
        </label>
      )}
    </CreateModal>
  );
}

// Step 2: up to 5 photos (cap enforced server-side in saveImage).
function Step2Photos({ statusId }: { statusId: number }) {
  return (
    <div>
      <p className="text-sm font-medium">Add photos (up to 5)</p>
      <div className="mt-2">
        <ImageUpload entityType="status" entityId={statusId} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Add a few photos, then press &ldquo;Done →&rdquo;.
      </p>
    </div>
  );
}
