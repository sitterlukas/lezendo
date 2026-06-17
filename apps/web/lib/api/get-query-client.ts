import { QueryClient } from "@tanstack/react-query";
import { ApiError } from "@whipperbook/api-client";

export function makeQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: {
        staleTime: 30_000,
        // Don't retry client errors (404/401/403): on the server a retried 404
        // delays the eventual notFound()/redirect(); on the client it's wasted
        // work. Retry only genuine transient (5xx/network) failures, once.
        retry: (failureCount, error) => {
          if (error instanceof ApiError && error.status < 500) return false;
          return failureCount < 1;
        },
      },
    },
  });
}
