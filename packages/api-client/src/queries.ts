import { queryOptions } from "@tanstack/react-query";
import type { ApiClient } from "./client";

export const cragsKeys = {
  all: ["crags"] as const,
  list: (q?: string, country?: string, page?: number) =>
    [
      "crags",
      "list",
      { q: q ?? null, country: country ?? null, page: page ?? 1 },
    ] as const,
  detail: (id: number) => ["crags", "detail", id] as const,
};

export function cragsListQuery<T>(
  api: ApiClient,
  params: { q?: string; country?: string; page?: number } = {},
) {
  const qs = new URLSearchParams();
  if (params.q) qs.set("q", params.q);
  if (params.country) qs.set("country", params.country);
  if (params.page) qs.set("page", String(params.page));
  return queryOptions({
    queryKey: cragsKeys.list(params.q, params.country, params.page),
    queryFn: () => api.get<T>(`/api/crags${qs.toString() ? `?${qs}` : ""}`),
  });
}

export function cragDetailQuery<T>(api: ApiClient, id: number) {
  return queryOptions({
    queryKey: cragsKeys.detail(id),
    queryFn: () => api.get<T>(`/api/crags/${id}`),
  });
}
