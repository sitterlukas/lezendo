"use client";

import { useTransition, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { apiFetch } from "@/lib/api-client";

// A button that fires a single mutating request (no form fields) and then
// refreshes the server components — for things like "Recover" or toggling gear
// retirement. Follows a `{ redirect }` in the response if present.
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
  const [pending, startTransition] = useTransition();

  function run() {
    startTransition(async () => {
      const res = await apiFetch<{ redirect?: string } | null>(endpoint, {
        method,
        body,
      });
      if (res && typeof res === "object" && res.redirect) {
        router.push(res.redirect);
      } else {
        router.refresh();
      }
    });
  }

  return (
    <button
      type="button"
      onClick={run}
      disabled={pending}
      className={className}
    >
      {children}
    </button>
  );
}
