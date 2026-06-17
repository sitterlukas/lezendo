import { NextResponse } from "next/server";
import { consumeVerificationToken } from "@/lib/email-verification";

// GET /verify?token=… — the target of the link we email on signup. Marks the
// account verified, then bounces to the login page with a status flag.
export async function GET(request: Request) {
  const token = new URL(request.url).searchParams.get("token") ?? "";
  const ok = await consumeVerificationToken(token);
  const target = ok ? "/login?verified=1" : "/login?error=verify_failed";
  return NextResponse.redirect(new URL(target, request.url));
}
