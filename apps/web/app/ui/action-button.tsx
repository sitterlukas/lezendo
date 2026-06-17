"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { ApiError } from "@/lib/api-client";

// A button that fires a single mutating request (no form fields) and then
// refreshes the server components AND invalidates the TanStack Query cache
// (hybrid invalidation during the incremental migration) — for things like
// "Recover" or toggling gear retirement. Follows a `{ redirect }` in the
// response if present. A failed request surfaces its message inline instead of
// failing silently.
export default function ActionButton({
  endpoint,
  method = "POST",
  body,
  className,
  children,
}: {
  endpoint: string;
  method?: string;
  body?: unknown;
  className?: string;
  children: ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: () =>
      browserApi.send<{ redirect?: string } | null>(endpoint, method, body),
    onSuccess: (res) => {
      if (res && typeof res === "object" && res.redirect) {
        router.push(res.redirect);
      } else {
        router.refresh();
        queryClient.invalidateQueries();
      }
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  function run() {
    setError(null);
    mutation.mutate();
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={mutation.isPending}
        className={className}
      >
        {children}
      </button>
      {error && (
        <p
          role="alert"
          className="mt-1 text-xs font-medium text-red-600 dark:text-red-400"
        >
          {error}
        </p>
      )}
    </>
  );
}
