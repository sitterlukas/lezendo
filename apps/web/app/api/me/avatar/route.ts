import { z } from "zod";
import { put } from "@vercel/blob";
import { route, ok, fail, readJson, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";
import db from "@whipperbook/db";

const schema = z.object({ url: z.string().nullable() });

// PATCH /api/me/avatar — set or clear the signed-in user's avatar URL (the blob
// itself is uploaded separately via /api/images/upload). Replaces updateAvatar.
export const PATCH = route(async (request) => {
  const user = await requireUser(request);
  const { url } = await readJson(request, schema);

  await db
    .updateTable("users")
    .set({ avatar_url: url })
    .where("id", "=", user.id)
    .execute();

  return ok({ ok: true });
});

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

// POST /api/me/avatar — upload an avatar image (multipart `file`) and set it in
// one call. The web uploads directly to Blob from the browser; the mobile app
// has no Blob client SDK, so it posts the bytes here over its Bearer transport
// and we store them server-side.
export const POST = route(async (request) => {
  const user = await requireUser(request);

  const form = await request.formData().catch(() => null);
  const file = form?.get("file");
  if (!(file instanceof File)) return fail("No image provided.", 400);
  if (!ALLOWED.has(file.type)) return fail("Unsupported image type.", 400);
  if (file.size > MAX_BYTES) return fail("Image is too large (max 10MB).", 400);

  const ext =
    file.type === "image/png"
      ? "png"
      : file.type === "image/webp"
        ? "webp"
        : "jpg";
  const blob = await put(`avatars/${user.id}-${Date.now()}.${ext}`, file, {
    access: "public",
    contentType: file.type,
  }).catch((err) => {
    console.error("[api] avatar upload failed", err);
    throw new HttpError(502, "Upload failed.");
  });

  await db
    .updateTable("users")
    .set({ avatar_url: blob.url })
    .where("id", "=", user.id)
    .execute();

  return ok({ url: blob.url });
});
