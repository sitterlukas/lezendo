"use client";

import { useState, useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch, ApiError } from "@/lib/api-client";

// A button that fires a single mutating request (no form fields) and then
// refreshes the server components — for things like "Recover" or toggling gear
// retirement. Follows a `{ redirect }` in the response if present. A failed
// request surfaces its message inline instead of failing silently.
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
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function run() {
    setError(null);
    startTransition(async () => {
      try {
        const res = await apiFetch<{ redirect?: string } | null>(endpoint, {
          method,
          body,
        });
        if (res && typeof res === "object" && res.redirect) {
          router.push(res.redirect);
        } else {
          router.refresh();
        }
      } catch (err) {
        setError(
          err instanceof ApiError ? err.message : "Something went wrong.",
        );
      }
    });
  }

  return (
    <>
      <button
        type="button"
        onClick={run}
        disabled={pending}
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
