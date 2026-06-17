"use client";

import { useState } from "react";
import CreateModal from "@/app/ui/create-modal";
import ImageUpload from "@/app/ui/image-upload";
import SectorSelect, { type SectorOption } from "@/app/ui/sector-select";
import { STATUS_MAX_LEN } from "@whipperbook/core";
import { inputClass } from "@/app/ui/style";

export default function StatusComposer({
  sectors,
}: {
  sectors: SectorOption[];
}) {
  const [text, setText] = useState("");
  const remaining = STATUS_MAX_LEN - text.length;

  return (
    <CreateModal
      triggerLabel="Post status"
      title="Post a status"
      subtitle="Share what's on your mind. Tag a sector, add photos (optional)."
      endpoint="/api/statuses"
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
          Sector (optional)
        </span>
        <SectorSelect sectors={sectors} defaultValue="" />
      </label>
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
