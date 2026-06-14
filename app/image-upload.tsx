"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState, useTransition } from "react";
import { saveImage } from "@/app/actions";
import type { ImageEntityType } from "@/lib/db";

export default function ImageUpload({
  entityType,
  entityId,
}: {
  entityType: ImageEntityType;
  entityId: number;
}) {
  const inputRef = useRef<HTMLInputElement>(null);
  const [uploading, setUploading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;

    setUploading(true);
    setError(null);

    try {
      const blob = await upload(file.name, file, {
        access: "public",
        handleUploadUrl: "/api/images/upload",
      });

      startTransition(async () => {
        await saveImage(blob.url, entityType, entityId);
      });
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setUploading(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  return (
    <div>
      <label
        className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium transition dark:border-zinc-700 ${
          uploading
            ? "cursor-not-allowed opacity-50"
            : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
        }`}
      >
        <svg
          width="12"
          height="12"
          viewBox="0 0 20 20"
          fill="none"
          aria-hidden="true"
        >
          <path
            d="M10 3v10m0-10-3 3m3-3 3 3M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        {uploading ? "Uploading…" : "Add photo"}
        <input
          ref={inputRef}
          type="file"
          accept="image/jpeg,image/png,image/webp,image/gif"
          className="sr-only"
          onChange={handleChange}
          disabled={uploading}
        />
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
