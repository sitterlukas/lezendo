"use client";

import Image from "next/image";
import { useCallback, useEffect, useRef, useState, useTransition } from "react";
import { deleteImage } from "@/app/actions";
import ConfirmSubmit from "@/app/ui/confirm-submit";
import ImageUpload from "@/app/ui/image-upload";
import LoginToAdd from "@/app/ui/login-to-add";
import type { ImageEntityType } from "@/lib/db";

type GalleryImage = { id: number; url: string; uploaded_by: number | null };

// How many thumbnails to show before the user expands the gallery. The add/
// upload tile takes the next cell, so collapsed shows 3 photos + the tile.
const COLLAPSED_COUNT = 3;

export default function ImageGallery({
  images,
  currentUserId,
  isAdmin,
  entityType,
  entityId,
  canUpload,
  promptLogin = true,
}: {
  images: GalleryImage[];
  currentUserId: number | null;
  isAdmin: boolean;
  entityType: ImageEntityType;
  entityId: number;
  canUpload: boolean;
  // Whether to nudge logged-out visitors to sign in to add photos. Off where
  // only the owner could ever upload (e.g. a status in the feed).
  promptLogin?: boolean;
}) {
  // Index of the photo shown in the lightbox, or null when closed.
  const [index, setIndex] = useState<number | null>(null);
  const [expanded, setExpanded] = useState(false);
  const [, startTransition] = useTransition();
  const touchStartX = useRef<number | null>(null);

  const open = index !== null;
  const close = useCallback(() => setIndex(null), []);

  // Step through photos, wrapping around endlessly in both directions.
  const go = useCallback(
    (dir: number) =>
      setIndex((prev) =>
        prev === null ? prev : (prev + dir + images.length) % images.length,
      ),
    [images.length],
  );

  // Keyboard navigation + body scroll lock while the lightbox is open.
  useEffect(() => {
    if (!open) return;
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") close();
      else if (e.key === "ArrowRight") go(1);
      else if (e.key === "ArrowLeft") go(-1);
    }
    document.addEventListener("keydown", onKey);
    const prevOverflow = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.removeEventListener("keydown", onKey);
      document.body.style.overflow = prevOverflow;
    };
  }, [open, close, go]);

  // Nothing to show and nothing to add → render nothing. Logged-in users still
  // get the "Add photos" tile even when there are no photos yet.
  if (images.length === 0 && !canUpload) return null;

  function canDelete(uploadedBy: number | null) {
    return isAdmin || (currentUserId !== null && currentUserId === uploadedBy);
  }

  const current = index !== null ? images[index] : null;

  // Collapsed by default — clicking a thumbnail still browses ALL photos in the
  // lightbox; expanding only affects how many thumbnails the grid shows.
  const hasMore = images.length > COLLAPSED_COUNT;
  const visible = expanded ? images : images.slice(0, COLLAPSED_COUNT);

  return (
    <>
      {/* Fixed-size tiles (≈ the sector page's size) so thumbnails look the
          same on every page, regardless of how wide the page container is. */}
      <ul className="mt-6 flex flex-wrap gap-2">
        {visible.map((img, i) => (
          <li
            key={img.id}
            className="group relative aspect-square w-40 overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              className="relative block h-full w-full"
              onClick={() => setIndex(i)}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-cover transition group-hover:opacity-90"
                sizes="160px"
              />
            </button>
            {canDelete(img.uploaded_by) && (
              <form
                className="absolute right-1 top-1 opacity-0 transition group-hover:opacity-100"
                action={() => {
                  startTransition(async () => {
                    await deleteImage(img.id);
                  });
                }}
              >
                <ConfirmSubmit
                  title="Delete photo?"
                  message="This photo will be permanently removed. This cannot be undone."
                  confirmLabel="Delete"
                  triggerAriaLabel="Delete photo"
                  triggerClassName="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white transition hover:bg-red-600"
                >
                  <svg
                    width="10"
                    height="10"
                    viewBox="0 0 20 20"
                    fill="none"
                    aria-hidden="true"
                  >
                    <path
                      d="M4 4l12 12M16 4 4 16"
                      stroke="currentColor"
                      strokeWidth="2.5"
                      strokeLinecap="round"
                    />
                  </svg>
                </ConfirmSubmit>
              </form>
            )}
          </li>
        ))}
        {/* Last cell: upload tile for signed-in users. Logged-out visitors get
            a text prompt below the grid instead (see LoginToAdd). */}
        {canUpload && (
          <li className="w-40">
            <ImageUpload
              entityType={entityType}
              entityId={entityId}
              variant="tile"
            />
          </li>
        )}
      </ul>

      {promptLogin && currentUserId === null && (
        <div className="mt-3">
          <LoginToAdd to="to add photos" />
        </div>
      )}

      {hasMore && (
        <button
          type="button"
          onClick={() => setExpanded((v) => !v)}
          className="mt-3 inline-flex items-center gap-1.5 rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
        >
          {expanded ? "Show less" : `Show all ${images.length} photos`}
          <svg
            className={`transition-transform ${expanded ? "rotate-180" : ""}`}
            width="12"
            height="12"
            viewBox="0 0 20 20"
            fill="none"
            aria-hidden="true"
          >
            <path
              d="M5 7.5l5 5 5-5"
              stroke="currentColor"
              strokeWidth="1.5"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        </button>
      )}

      {current && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Photo viewer"
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/85 p-4 sm:p-8"
          onClick={close}
          onTouchStart={(e) => {
            touchStartX.current = e.touches[0].clientX;
          }}
          onTouchEnd={(e) => {
            if (touchStartX.current === null) return;
            const dx = e.changedTouches[0].clientX - touchStartX.current;
            if (Math.abs(dx) > 40) go(dx < 0 ? 1 : -1);
            touchStartX.current = null;
          }}
        >
          {/* Close */}
          <button
            type="button"
            onClick={close}
            aria-label="Close"
            className="absolute right-4 top-4 z-10 flex h-10 w-10 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20"
          >
            <svg
              width="16"
              height="16"
              viewBox="0 0 20 20"
              fill="none"
              aria-hidden="true"
            >
              <path
                d="M4 4l12 12M16 4 4 16"
                stroke="currentColor"
                strokeWidth="2.5"
                strokeLinecap="round"
              />
            </svg>
          </button>

          {images.length > 1 && (
            <>
              <button
                type="button"
                aria-label="Previous photo"
                onClick={(e) => {
                  e.stopPropagation();
                  go(-1);
                }}
                className="absolute left-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:left-4"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M15 5l-7 7 7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
              <button
                type="button"
                aria-label="Next photo"
                onClick={(e) => {
                  e.stopPropagation();
                  go(1);
                }}
                className="absolute right-2 top-1/2 z-10 flex h-11 w-11 -translate-y-1/2 items-center justify-center rounded-full bg-white/10 text-white transition hover:bg-white/20 sm:right-4"
              >
                <svg
                  width="22"
                  height="22"
                  viewBox="0 0 24 24"
                  fill="none"
                  aria-hidden="true"
                >
                  <path
                    d="M9 5l7 7-7 7"
                    stroke="currentColor"
                    strokeWidth="2"
                    strokeLinecap="round"
                    strokeLinejoin="round"
                  />
                </svg>
              </button>
            </>
          )}

          <div
            className="relative flex max-h-full max-w-5xl items-center justify-center"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              key={current.url}
              src={current.url}
              alt=""
              className="max-h-[85vh] max-w-full rounded object-contain"
            />
          </div>

          {images.length > 1 && (
            <div className="absolute bottom-5 left-1/2 -translate-x-1/2 rounded-full bg-black/50 px-3 py-1 text-sm font-medium tabular-nums text-white">
              {index! + 1} / {images.length}
            </div>
          )}
        </div>
      )}
    </>
  );
}
