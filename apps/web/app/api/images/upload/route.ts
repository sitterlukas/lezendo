import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";
import { auth } from "@/auth";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        const session = await auth();
        if (!session?.user?.email) {
          throw new Error("Unauthorized");
        }
        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
          ],
          maximumSizeInBytes: 10 * 1024 * 1024,
        };
      },
      onUploadCompleted: async () => {
        // URL is saved to DB by the client calling saveImage() after upload
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (error) {
    // Log server-side; return a generic message so we don't leak internals
    // (token/config details) to the client.
    console.error("[api] image upload failed", error);
    return NextResponse.json({ error: "Upload failed." }, { status: 400 });
  }
}
