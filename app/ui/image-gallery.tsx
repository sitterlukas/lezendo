"use client";

import Image from "next/image";
import { useState, useTransition } from "react";
import { deleteImage } from "@/app/actions";

type GalleryImage = { id: number; url: string; uploaded_by: number | null };

export default function ImageGallery({
  images,
  currentUserId,
  isAdmin,
}: {
  images: GalleryImage[];
  currentUserId: number | null;
  isAdmin: boolean;
}) {
  const [lightbox, setLightbox] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  if (images.length === 0) return null;

  function canDelete(uploadedBy: number | null) {
    return isAdmin || (currentUserId !== null && currentUserId === uploadedBy);
  }

  return (
    <>
      <ul className="mt-6 grid grid-cols-2 gap-2 sm:grid-cols-3 lg:grid-cols-4">
        {images.map((img) => (
          <li
            key={img.id}
            className="group relative aspect-square overflow-hidden rounded border border-zinc-200 bg-zinc-100 dark:border-zinc-800 dark:bg-zinc-900"
          >
            <button
              type="button"
              className="relative block h-full w-full"
              onClick={() => setLightbox(img.url)}
            >
              <Image
                src={img.url}
                alt=""
                fill
                className="object-cover transition group-hover:opacity-90"
                sizes="(min-width: 1024px) 25vw, (min-width: 640px) 33vw, 50vw"
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
                <button
                  type="submit"
                  aria-label="Delete photo"
                  className="flex h-6 w-6 items-center justify-center rounded bg-black/60 text-white transition hover:bg-red-600"
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
                </button>
              </form>
            )}
          </li>
        ))}
      </ul>

      {lightbox && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center bg-black/80 p-4"
          onClick={() => setLightbox(null)}
        >
          <div
            className="relative max-h-full max-w-4xl"
            onClick={(e) => e.stopPropagation()}
          >
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img
              src={lightbox}
              alt=""
              className="max-h-[90vh] max-w-full rounded object-contain"
            />
            <button
              type="button"
              onClick={() => setLightbox(null)}
              className="absolute -right-3 -top-3 flex h-7 w-7 items-center justify-center rounded-full bg-white text-zinc-900 shadow"
              aria-label="Close"
            >
              <svg
                width="12"
                height="12"
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
          </div>
        </div>
      )}
    </>
  );
}
