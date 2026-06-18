import { put } from "@vercel/blob";
import { route, ok, fail, HttpError } from "@/lib/api/respond";
import { requireUser } from "@/lib/api/auth";

const ALLOWED = new Set(["image/jpeg", "image/png", "image/webp"]);
const MAX_BYTES = 10 * 1024 * 1024;

// POST /api/images/blob — upload an image (multipart `file`) to Blob and return
// its URL. The web uploads to Blob directly from the browser; the mobile app
// has no Blob client SDK, so it posts the bytes here over its Bearer transport
// (mirrors /api/me/avatar). Associate the URL with an entity via POST /api/images.
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
  const key = `statuses/${user.id}-${Date.now()}-${Math.random()
    .toString(36)
    .slice(2, 8)}.${ext}`;
  const blob = await put(key, file, {
    access: "public",
    contentType: file.type,
  }).catch((err) => {
    console.error("[api] image upload failed", err);
    throw new HttpError(502, "Upload failed.");
  });

  return ok({ url: blob.url });
});
