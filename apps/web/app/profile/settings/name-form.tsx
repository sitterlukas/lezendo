"use client";

import { useState, useTransition } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

export default function NameForm({ defaultName }: { defaultName: string }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const fd = new FormData(e.currentTarget);
    const name = String(fd.get("name") ?? "");
    setError(null);
    startTransition(async () => {
      try {
        await apiFetch("/api/me", { method: "PATCH", body: { name } });
        router.refresh();
      } catch (err) {
        setError(err instanceof ApiError ? err.message : "Failed to save.");
      }
    });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className="flex items-end gap-3 border-b border-zinc-200 px-6 py-4 dark:border-zinc-800"
    >
      <label className="flex-1">
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Display name
        </span>
        <input
          name="name"
          defaultValue={defaultName}
          required
          maxLength={100}
          className="w-full rounded border border-zinc-300 bg-white px-3 py-2 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900"
        />
        {error && (
          <span className="mt-1 block text-xs text-red-500">{error}</span>
        )}
      </label>
      <button
        type="submit"
        disabled={pending}
        className="rounded bg-zinc-900 px-4 py-2 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      >
        {pending ? "Saving…" : "Save"}
      </button>
    </form>
  );
}
