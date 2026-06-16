"use client";

import { useRef, useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import type { CreateResult } from "@/app/actions";

// Two-step create dialog: step 1 collects info and calls `action` (which returns
// the new id), step 2 lets the user enrich the new entity (photos / location)
// via `renderStep2(id)`, then "Done →" navigates to `doneHref(id)`.
// Rendered only by per-entity client wrappers, so function props are fine.
export default function CreateModal({
  triggerLabel,
  title,
  subtitle,
  action,
  children,
  renderStep2,
  doneHref,
  submitLabel = "Save & continue",
  canSubmit = true,
}: {
  triggerLabel: string;
  title: string;
  subtitle?: string;
  action: (formData: FormData) => Promise<CreateResult>;
  children: ReactNode;
  renderStep2: (id: number) => ReactNode;
  doneHref: (id: number) => string;
  submitLabel?: string;
  canSubmit?: boolean;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [step, setStep] = useState<1 | 2>(1);
  const [createdId, setCreatedId] = useState<number | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function reset() {
    setStep(1);
    setCreatedId(null);
    setError(null);
  }
  function open() {
    reset();
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
    reset();
  }
  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const formData = new FormData(e.currentTarget);
    setError(null);
    startTransition(async () => {
      const res = await action(formData);
      if (res.ok) {
        setCreatedId(res.id);
        setStep(2);
      } else {
        setError(res.error);
      }
    });
  }
  function done() {
    const id = createdId;
    close();
    if (id !== null) router.push(doneHref(id));
  }

  return (
    <>
      <button
        type="button"
        onClick={open}
        className="inline-flex items-center gap-1 rounded bg-zinc-900 px-3 py-1.5 text-xs font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        <svg width="12" height="12" viewBox="0 0 20 20" fill="none" aria-hidden="true">
          <path d="M10 4v12M4 10h12" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
        </svg>
        {triggerLabel}
      </button>

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-full max-w-lg overflow-y-auto rounded bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100 max-[544px]:max-w-[calc(100%-2rem)]"
      >
        <div className="p-6">
          <div className="flex items-start justify-between gap-4">
            <div>
              <h2 className="text-lg font-semibold">{title}</h2>
              {subtitle && (
                <p className="mt-0.5 text-sm text-zinc-500">{subtitle}</p>
              )}
              <p className="mt-1 text-xs font-medium uppercase tracking-wider text-zinc-400">
                Step {step} of 2 · {step === 1 ? "Details" : "Photos & location"}
              </p>
            </div>
            <button
              type="button"
              onClick={close}
              aria-label="Close"
              className="rounded-md p-1 text-zinc-400 transition hover:bg-zinc-100 hover:text-zinc-700 dark:hover:bg-zinc-800 dark:hover:text-zinc-200"
            >
              <svg width="18" height="18" viewBox="0 0 20 20" fill="none" aria-hidden="true">
                <path d="m5 5 10 10M15 5 5 15" stroke="currentColor" strokeWidth="2" strokeLinecap="round" />
              </svg>
            </button>
          </div>

          <div className="mt-5">
            {step === 1 ? (
              <form onSubmit={handleSubmit} className="grid gap-4">
                {children}
                {error && (
                  <p role="alert" className="text-sm font-medium text-red-600 dark:text-red-400">
                    {error}
                  </p>
                )}
                <button
                  type="submit"
                  disabled={pending || !canSubmit}
                  className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:cursor-not-allowed disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                >
                  {pending ? "Saving…" : submitLabel}
                </button>
              </form>
            ) : (
              createdId !== null && (
                <div className="grid gap-5">
                  {renderStep2(createdId)}
                  <button
                    type="button"
                    onClick={done}
                    className="justify-self-start rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
                  >
                    Done →
                  </button>
                </div>
              )
            )}
          </div>
        </div>
      </dialog>
    </>
  );
}
