"use client";

import { useState, type ReactNode } from "react";
import { useRouter } from "next/navigation";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { browserApi } from "@/lib/api/client";
import { ApiError } from "@/lib/api-client";

// Drop-in replacement for `<form action={serverAction}>`. Serializes the form's
// named fields to JSON, sends them to `endpoint`, and on success either follows
// a `{ redirect }` from the response, navigates to `redirectTo`, or re-fetches
// the current server components with router.refresh() AND invalidates the
// TanStack Query cache (hybrid: server-rendered pages still rely on refresh
// while migrated reads rely on invalidation). Inline errors render below the
// fields. Existing field markup can be passed straight through as children, so
// converting a server-action form is mostly a tag swap.
export default function ApiForm({
  endpoint,
  method = "POST",
  className,
  children,
  redirectTo,
  resetOnSuccess = false,
  onSuccess,
  submitError,
}: {
  endpoint: string;
  method?: string;
  className?: string;
  children: ReactNode;
  redirectTo?: string;
  resetOnSuccess?: boolean;
  onSuccess?: () => void;
  // Render-prop for showing the error inline with custom styling; defaults to a
  // simple red paragraph.
  submitError?: (message: string) => ReactNode;
}) {
  const router = useRouter();
  const queryClient = useQueryClient();
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (vars: { form: HTMLFormElement; body: unknown }) =>
      browserApi.send<{ redirect?: string } | null>(
        endpoint,
        method,
        vars.body,
      ),
    onSuccess: (res, vars) => {
      if (resetOnSuccess) vars.form.reset();
      if (redirectTo) {
        router.push(redirectTo);
      } else if (res && typeof res === "object" && res.redirect) {
        router.push(res.redirect);
      } else {
        router.refresh();
        queryClient.invalidateQueries();
      }
      onSuccess?.();
    },
    onError: (err) => {
      setError(err instanceof ApiError ? err.message : "Something went wrong.");
    },
  });

  function handleSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const form = e.currentTarget;
    const body = Object.fromEntries(new FormData(form));
    setError(null);
    mutation.mutate({ form, body });
  }

  return (
    <form
      onSubmit={handleSubmit}
      className={className}
      data-pending={mutation.isPending}
    >
      {children}
      {error &&
        (submitError ? (
          submitError(error)
        ) : (
          <p
            role="alert"
            className="text-sm font-medium text-red-600 dark:text-red-400"
          >
            {error}
          </p>
        ))}
    </form>
  );
}
