"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { ApiError } from "@/lib/api-client";
import ConfirmSubmit from "./confirm-submit";
import TrashIcon from "./trash-icon";

// Single source of truth for delete affordances across the app. Self-contained:
// confirming sends the delete request to `endpoint` and then either follows a
// `{ redirect }` from the response or re-fetches the current page AND
// invalidates the TanStack Query cache (hybrid invalidation during the
// incremental migration). A failed request surfaces its message inline instead
// of failing silently.
//   - "pill": bordered red button with an icon + label (toolbars / headers)
//   - "icon": compact icon-only button (card corners, list rows)
const triggerClass = {
  pill: "inline-flex items-center gap-1.5 rounded border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30",
  icon: "rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/50 dark:hover:text-red-400",
};

export default function DeleteButton({
  endpoint,
  method = "DELETE",
  body,
  title,
  message,
  confirmLabel,
  ariaLabel,
  label = "Delete",
  variant = "pill",
}: {
  endpoint: string;
  method?: string;
  body?: unknown;
  title: string;
  message: string;
  confirmLabel: string;
  ariaLabel: string;
  label?: string;
  variant?: "pill" | "icon";
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

  function handleConfirm() {
    setError(null);
    mutation.mutate();
  }

  return (
    <>
      <ConfirmSubmit
        title={title}
        message={message}
        confirmLabel={confirmLabel}
        triggerAriaLabel={ariaLabel}
        triggerClassName={triggerClass[variant]}
        onConfirm={handleConfirm}
      >
        <TrashIcon size={variant === "icon" ? 16 : 14} />
        {variant === "pill" && <span>{label}</span>}
      </ConfirmSubmit>
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
