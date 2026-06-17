import { QueryCache, QueryClient } from "@tanstack/react-query";
import { router } from "expo-router";
import { ApiError } from "@whipperbook/api-client";
import { tokens } from "./auth";

export function makeQueryClient() {
  return new QueryClient({
    // A surviving 401 means the refresh-on-401 transport already failed to renew
    // the session (and cleared the access token); send the user back to login.
    queryCache: new QueryCache({
      onError: (error) => {
        if (error instanceof ApiError && error.status === 401) {
          void tokens.clear();
          router.replace("/(auth)/login");
        }
      },
    }),
    defaultOptions: {
      queries: { staleTime: 30_000, retry: 1 },
    },
  });
}
