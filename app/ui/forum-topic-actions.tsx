"use client";

import { useRef, useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";
import { inputClass } from "@/app/ui/style";
import DeleteButton from "@/app/ui/delete-button";

// Owner/admin controls for a forum topic: rename it (dialog) or delete it
// (which cascade-removes its replies). Sits in the topic page header.
export default function ForumTopicActions({
  topicId,
  title,
}: {
  topicId: number;
  title: string;
}) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const router = useRouter();
  const [text, setText] = useState(title);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function open() {
    setText(title);
    setError(null);
    dialogRef.current?.showModal();
  }
  function close() {
    dialogRef.current?.close();
  }
  function save() {
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch(`/api/forum/topics/${topicId}`, {
          method: "PATCH",
          body: { title: text.trim() },
        });
        close();
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        onClick={open}
        className="rounded border border-zinc-300 px-3 py-1.5 text-xs font-medium text-zinc-600 transition hover:bg-zinc-100 dark:border-zinc-700 dark:text-zinc-300 dark:hover:bg-zinc-800"
      >
        Edit title
      </button>
      <DeleteButton
        endpoint={`/api/forum/topics/${topicId}`}
        variant="pill"
        label="Delete topic"
        title="Delete topic"
        message="This permanently deletes the topic and all its replies."
        confirmLabel="Delete topic"
        ariaLabel="Delete topic"
      />

      <dialog
        ref={dialogRef}
        onClick={(e) => {
          if (e.target === dialogRef.current) close();
        }}
        className="m-auto w-full max-w-lg rounded bg-white p-0 shadow-xl backdrop:bg-black/50 dark:bg-zinc-900 dark:text-zinc-100 max-[544px]:max-w-[calc(100%-2rem)]"
      >
        <div className="p-6">
          <h2 className="text-lg font-semibold">Edit topic title</h2>
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            className={`mt-4 ${inputClass}`}
          />
          {error && <p className="mt-3 text-sm text-red-500">{error}</p>}
          <div className="mt-6 flex justify-end gap-3">
            <button
              type="button"
              onClick={close}
              className="rounded border border-zinc-300 px-4 py-2 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
            <button
              type="button"
              onClick={save}
              disabled={pending || !text.trim()}
              className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? "Saving…" : "Save"}
            </button>
          </div>
        </div>
      </dialog>
    </div>
  );
}
