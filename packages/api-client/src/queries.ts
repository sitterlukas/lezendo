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

export function homeQuery<T>(
  api: ApiClient,
  params: { period?: string; discipline?: string } = {},
) {
  const qs = new URLSearchParams();
  if (params.period) qs.set("period", params.period);
  if (params.discipline) qs.set("discipline", params.discipline);
  return queryOptions({
    queryKey: [
      "home",
      { period: params.period ?? null, discipline: params.discipline ?? null },
    ] as const,
    queryFn: () => api.get<T>(`/api/home${qs.toString() ? `?${qs}` : ""}`),
  });
}

export function meQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["me"] as const,
    queryFn: () => api.get<T>(`/api/me`),
  });
}

export function settingsQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["me", "settings"] as const,
    queryFn: () => api.get<T>(`/api/me/settings`),
  });
}

export function statisticsQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["me", "statistics"] as const,
    queryFn: () => api.get<T>(`/api/me/statistics`),
  });
}

export function adminDeletedQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["admin", "deleted"] as const,
    queryFn: () => api.get<T>(`/api/admin/deleted`),
  });
}

export function gearQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["gear"] as const,
    queryFn: () => api.get<T>(`/api/gear`),
  });
}

export function forumTopicsQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["forum", "topics"] as const,
    queryFn: () => api.get<T>(`/api/forum/topics`),
  });
}

export function forumTopicQuery<T>(api: ApiClient, id: number) {
  return queryOptions({
    queryKey: ["forum", "topics", id] as const,
    queryFn: () => api.get<T>(`/api/forum/topics/${id}`),
  });
}

export function feedPageQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["feed", "page"] as const,
    queryFn: () => api.get<T>(`/api/feed/page`),
  });
}

export function notificationsQuery<T>(api: ApiClient) {
  return queryOptions({
    queryKey: ["notifications"] as const,
    queryFn: () => api.get<T>(`/api/notifications`),
  });
}

export function userProfileQuery<T>(api: ApiClient, id: number) {
  return queryOptions({
    queryKey: ["users", "detail", id] as const,
    queryFn: () => api.get<T>(`/api/users/${id}`),
  });
}

export function leaderboardQuery<T>(
  api: ApiClient,
  params: { period?: string; discipline?: string } = {},
) {
  const qs = new URLSearchParams();
  if (params.period) qs.set("period", params.period);
  if (params.discipline) qs.set("discipline", params.discipline);
  return queryOptions({
    queryKey: [
      "leaderboards",
      { period: params.period ?? null, discipline: params.discipline ?? null },
    ] as const,
    queryFn: () =>
      api.get<T>(`/api/leaderboards${qs.toString() ? `?${qs}` : ""}`),
  });
}

export function reviewsQuery<T>(
  api: ApiClient,
  entityType: string,
  entityId: number,
) {
  return queryOptions({
    queryKey: ["reviews", entityType, entityId] as const,
    queryFn: () =>
      api.get<T>(`/api/reviews?entityType=${entityType}&entityId=${entityId}`),
  });
}

export function sectorDetailQuery<T>(
  api: ApiClient,
  cragId: number,
  sectorId: number,
) {
  return queryOptions({
    queryKey: ["sectors", "detail", sectorId, { cragId }] as const,
    queryFn: () => api.get<T>(`/api/sectors/${sectorId}?cragId=${cragId}`),
  });
}

export function routeDetailQuery<T>(
  api: ApiClient,
  cragId: number,
  routeId: number,
) {
  return queryOptions({
    queryKey: ["routes", "detail", routeId, { cragId }] as const,
    queryFn: () => api.get<T>(`/api/routes/${routeId}?cragId=${cragId}`),
  });
}
