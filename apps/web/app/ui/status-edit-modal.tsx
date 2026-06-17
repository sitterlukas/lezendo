"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { STATUS_MAX_LEN } from "@whipperbook/core";
import { inputClass } from "@/app/ui/style";
import ImageGallery from "@/app/ui/image-gallery";
import SectorSelect, { type SectorOption } from "@/app/ui/sector-select";

type Photo = { id: number; url: string; uploaded_by: number | null };

// Author/admin dialog to edit a status's text + sector tag and add/remove its
// photos. Photo changes persist immediately (via ImageGallery); the text and
// sector are saved on "Save". Closing refreshes the feed so edits show.
export default function StatusEditModal({
  statusId,
  body,
  sectorId,
  sectors,
  photos,
  viewerId,
  isAdmin,
}: {
  statusId: number;
  body: string;
  sectorId: number | null;
  sectors: SectorOption[];
  photos: Photo[];
  viewerId: number | null;
  isAdmin: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [text, setText] = useState(body);
  const [sector, setSector] = useState(sectorId ? String(sectorId) : "");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();
  const remaining = STATUS_MAX_LEN - text.length;

  function open() {
    setText(body);
    setSector(sectorId ? String(sectorId) : "");
    setError(null);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
    router.refresh();
  }
  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/statuses/${statusId}`, {
          method: "PATCH",
          body: { body: text.trim(), sector_id: sector },
        });
        close();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <>
      <button
        type="button"
        aria-label="Edit status"
        title="Edit status"
        onClick={open}
        className="rounded-md p-1 text-zinc-300 transition hover:bg-zinc-100 hover:text-zinc-700 dark:text-zinc-600 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
      >
        <svg
          width="16"
          height="16"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M13.5 3.5l3 3L7 16l-3.5.5L4 13l9.5-9.5z"
            stroke="currentColor"
            strokeWidth="1.6"
            strokeLinejoin="round"
          />
        </svg>
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100 max-[544px]:max-w-[calc(100%-2rem)]"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold">Edit status</h2>
          <label className="mt-4 block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Status
            </span>
            <textarea
              value={text}
              onChange={(e) => setText(e.target.value)}
              rows={3}
              maxLength={STATUS_MAX_LEN}
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

          <label className="mt-3 block">
            <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
              Sector (optional)
            </span>
            <SectorSelect
              sectors={sectors}
              value={sector}
              onChange={(e) => setSector(e.target.value)}
            />
          </label>

          <p className="mt-3 text-xs font-medium text-zinc-600 dark:text-zinc-400">
            Photos (up to 5)
          </p>
          <ImageGallery
            images={photos}
            currentUserId={viewerId}
            isAdmin={isAdmin}
            entityType="status"
            entityId={statusId}
            canUpload
            promptLogin={false}
          />

          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}

          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Done
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !text.trim() || remaining < 0}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? "Saving…" : "Save text"}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
