"use client";

import { useRef, type ReactNode } from "react";

/**
 * A trigger button guarded by a confirmation dialog. The confirm button runs
 * the `onConfirm` callback (typically an API call); it no longer submits a
 * native form.
 */
export default function ConfirmSubmit({
  title,
  message,
  confirmLabel,
  triggerAriaLabel,
  triggerClassName,
  onConfirm,
  children,
}: {
  title: string;
  message: string;
  confirmLabel: string;
  triggerAriaLabel: string;
  triggerClassName: string;
  onConfirm: () => void;
  children: ReactNode;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);

  return (
    <>
      <button
        type="button"
        aria-label={triggerAriaLabel}
        title={triggerAriaLabel}
        onClick={() => dialogRef.current?.showModal()}
        className={triggerClassName}
      >
        {children}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(event) => {
          if (event.target === dialogRef.current) dialogRef.current?.close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-sm overflow-y-auto rounded bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100 max-[544px]:max-w-[calc(100%-2rem)]"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold">{title}</h2>
          <p className="mt-2 text-sm text-zinc-600 dark:text-zinc-400">
            {message}
          </p>
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={() => dialogRef.current?.close()}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={() => {
                dialogRef.current?.close();
                onConfirm();
              }}
              className="rounded bg-red-600 px-4 py-2 text-sm font-medium text-white transition hover:bg-red-500"
            >
              {confirmLabel}
            </button>
          </div>
        </div>
      </dialog>
    </>
  );
}
