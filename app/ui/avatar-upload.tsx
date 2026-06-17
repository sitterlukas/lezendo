"use client";

import { upload } from "@vercel/blob/client";
import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";
import Avatar from "@/app/ui/avatar";

// Avatars are only shown small (≤96px), so a 256px square is plenty. Crop to a
// centered square and re-encode as JPEG before upload to keep blobs tiny.
const SIZE = 256;

async function squareThumbnail(file: File): Promise<Blob> {
  if (!/^image\/(jpeg|png|webp)$/.test(file.type)) return file;
  try {
    const bitmap = await createImageBitmap(file, {
      imageOrientation: "from-image",
    });
    const edge = Math.min(bitmap.width, bitmap.height);
    const sx = (bitmap.width - edge) / 2;
    const sy = (bitmap.height - edge) / 2;
    const canvas = document.createElement("canvas");
    canvas.width = SIZE;
    canvas.height = SIZE;
    const ctx = canvas.getContext("2d");
    if (!ctx) return file;
    ctx.drawImage(bitmap, sx, sy, edge, edge, 0, 0, SIZE, SIZE);
    bitmap.close?.();
    const blob = await new Promise<Blob | null>((resolve) =>
      canvas.toBlob(resolve, "image/jpeg", 0.85),
    );
    return blob ?? file;
  } catch {
    return file;
  }
}

export default function AvatarUpload({
  name,
  avatarUrl,
}: {
  name: string;
  avatarUrl: string | null;
}) {
  const router = useRouter();
  const inputRef = useRef<HTMLInputElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  function saveAvatar(url: string | null) {
    startTransition(async () => {
      await apiFetch("/api/me/avatar", { method: "PATCH", body: { url } });
      router.refresh();
    });
  }

  async function handleChange(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    setBusy(true);
    setError(null);
    try {
      const body = await squareThumbnail(file);
      const blob = await upload(`avatar-${file.name}.jpg`, body, {
        access: "public",
        handleUploadUrl: "/api/images/upload",
      });
      saveAvatar(blob.url);
    } catch {
      setError("Upload failed — try again.");
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = "";
    }
  }

  function remove() {
    setError(null);
    saveAvatar(null);
  }

  return (
    <div className="flex items-center gap-4">
      <Avatar name={name} src={avatarUrl} size={72} />
      <div className="flex flex-col gap-2">
        <div className="flex items-center gap-2">
          <label
            className={`inline-flex cursor-pointer items-center gap-1.5 rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium transition dark:border-zinc-700 ${
              busy
                ? "cursor-not-allowed opacity-50"
                : "hover:bg-zinc-100 dark:hover:bg-zinc-800"
            }`}
          >
            {busy ? "Uploading…" : avatarUrl ? "Change photo" : "Upload photo"}
            <input
              ref={inputRef}
              type="file"
              accept="image/jpeg,image/png,image/webp"
              className="sr-only"
              onChange={handleChange}
              disabled={busy}
            />
          </label>
          {avatarUrl && (
            <button
              type="button"
              onClick={remove}
              disabled={busy}
              className="rounded px-2 py-1.5 text-xs font-medium text-zinc-500 transition hover:text-red-600 disabled:opacity-50 dark:hover:text-red-400"
            >
              Remove
            </button>
          )}
        </div>
        {error ? (
          <p className="text-xs text-red-500">{error}</p>
        ) : (
          <p className="text-xs text-zinc-400">
            Shown next to your name. Square, ≤256px.
          </p>
        )}
      </div>
    </div>
  );
}
