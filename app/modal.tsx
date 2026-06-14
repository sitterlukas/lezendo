"use client";

import { useRef, type ReactNode } from "react";

export default function Modal({
  triggerLabel,
  title,
  subtitle,
  variant = "primary",
  children,
}: {
  triggerLabel: string;
  title: string;
  subtitle?: string;
  variant?: "primary" | "ghost";
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        onClick={() => dialogRef.current?.showModal()}
        className={
          variant === "ghost"
            ? "inline-flex items-center gap-1 rounded border border-zinc-300 bg-transparent px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
            : "inline-flex items-center gap-1.5 rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
        }
      >
        {variant === "primary" && (
          <svg width="14" height="14" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M10 4v12M4 10h12"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
            />
          </svg>
        )}
        {variant === "ghost" && (
          <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
            <path
              d="M13.5 3.5a2.121 2.121 0 0 1 3 3L6 17l-4 1 1-4L13.5 3.5Z"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            />
          </svg>
        )}
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          // Click on the backdrop (the dialog element itself) closes it.
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto w-full max-w-lg rounded bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100"
      >
        <div
          className="p-6"
          onSubmit={() => dialogRef.current?.close()}
        >
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
              )}
            </div>
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              aria-label="Close"
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path
                  d="m5 5 10 10M15 5 5 15"
                  stroke="currentColor"
                  strokeWidth="2"
                  strokeLinecap="round"
                />
              </svg>
            </button>
          </div>
          <div className="mt-5">{children}</div>
        </div>
      </dialog>
    </>
  );
}
