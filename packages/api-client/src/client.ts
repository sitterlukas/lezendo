import { reviveDates } from "./json";

export class ApiError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "ApiError";
  }
}

export type Transport = (
  path: string,
  init: { method?: string; body?: unknown; signal?: AbortSignal },
) => Promise<Response>;

export function createApiClient(transport: Transport) {
  async function request<T>(
    path: string,
    init: Parameters<Transport>[1] = {},
  ): Promise<T> {
    const res = await transport(path, init);
    const text = await res.text();
    let data: unknown = null;
    if (text) {
      try {
        data = JSON.parse(text);
      } catch {
        data = null;
      }
    }
    if (!res.ok) {
      const message =
        (data && typeof data === "object" && "error" in data
          ? String((data as { error: unknown }).error)
          : null) ?? `Request failed (${res.status})`;
      throw new ApiError(res.status, message);
    }
    return reviveDates(data) as T;
  }
  return {
    get: <T>(path: string, signal?: AbortSignal) =>
      request<T>(path, { signal }),
    send: <T>(path: string, method: string, body?: unknown) =>
      request<T>(path, { method, body }),
  };
}

export type ApiClient = ReturnType<typeof createApiClient>;
