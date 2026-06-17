import { NextResponse } from "next/server";
import { ZodError } from "zod";

// JSON success response. Mirrors the data shapes the old server actions
// returned (e.g. `{ id }` for creates), just over HTTP.
export function ok<T>(data: T, status = 200): NextResponse {
  return NextResponse.json(data, { status });
}

// JSON error response. The web client (lib/api-client.ts) reads `error`.
export function fail(error: string, status: number): NextResponse {
  return NextResponse.json({ error }, { status });
}

// Throwable HTTP error so deep helpers can bail with the right status; `route()`
// turns it into a `fail(...)` response. Replaces the early `return` guards the
// server actions used (which silently did nothing).
export class HttpError extends Error {
  constructor(
    public status: number,
    message: string,
  ) {
    super(message);
    this.name = "HttpError";
  }
}

type RouteHandler<Ctx> = (request: Request, ctx: Ctx) => Promise<NextResponse>;

// Wraps a route handler so thrown HttpErrors and Zod validation errors become
// clean JSON responses, and anything unexpected becomes a 500 (logged) rather
// than leaking a stack trace.
export function route<Ctx = unknown>(
  handler: RouteHandler<Ctx>,
): RouteHandler<Ctx> {
  return async (request, ctx) => {
    try {
      return await handler(request, ctx);
    } catch (err) {
      if (err instanceof HttpError) return fail(err.message, err.status);
      if (err instanceof ZodError) {
        return fail(err.issues[0]?.message ?? "Invalid request.", 400);
      }
      console.error("[api] unhandled error", err);
      return fail("Something went wrong.", 500);
    }
  };
}

// Parse + validate a JSON request body against a Zod schema. Throws ZodError
// (→ 400 via `route`) on bad input, including a non-JSON body.
export async function readJson<T>(
  request: Request,
  schema: { parse: (data: unknown) => T },
): Promise<T> {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  return schema.parse(body);
}
