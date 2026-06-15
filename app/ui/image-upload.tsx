"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState, useTransition } from "react";
import { saveImage } from "@/app/actions";
import type { ImageEntityType } from "@/lib/db";

export default function ImageUpload({
  entityType,
  entityId,
  variant = "button",
}: {
  entityType: ImageEntityType;
  entityId: number;
  // "button": pill used in page headers. "tile": square placeholder that sits
  // as the last cell of the photo grid.
  variant?: "button" | "tile";
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

  const fileInput = (
    <input
      ref={inputRef}
      type="file"
      accept="image/jpeg,image/png,image/webp,image/gif"
      className="sr-only"
      onChange={handleChange}
      disabled={uploading}
    />
  );

  if (variant === "tile") {
    return (
      <label
        title="Add photos"
        className={`flex aspect-square w-full cursor-pointer flex-col items-center justify-center gap-1.5 rounded border border-dashed border-zinc-300 text-zinc-500 transition dark:border-zinc-700 ${
          uploading
            ? "cursor-not-allowed opacity-50"
            : "hover:border-zinc-400 hover:bg-zinc-50 hover:text-zinc-700 dark:hover:border-zinc-500 dark:hover:bg-zinc-900/60 dark:hover:text-zinc-300"
        }`}
      >
        <svg width="22" height="22" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path
            d="M10 3v10m0-10-3 3m3-3 3 3M3 14v1a2 2 0 0 0 2 2h10a2 2 0 0 0 2-2v-1"
            stroke="currentColor"
            strokeWidth="1.8"
            strokeLinecap="round"
            strokeLinejoin="round"
          />
        </svg>
        <span className="text-xs font-medium">
          {uploading ? "Uploading…" : "Add photos"}
        </span>
        {error && <span className="px-2 text-center text-xs text-red-500">{error}</span>}
        {fileInput}
      </label>
    );
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
        {fileInput}
      </label>
      {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
    </div>
  );
}
