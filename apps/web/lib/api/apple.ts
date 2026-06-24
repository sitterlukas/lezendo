import { createRemoteJWKSet, jwtVerify } from "jose";

// Apple's public signing keys, fetched + cached by jose. Created once at load.
const APPLE_JWKS = createRemoteJWKSet(
  new URL("https://appleid.apple.com/auth/keys"),
);

// Verify an Apple identity token from the mobile app's Sign in with Apple. The
// audience is the app's bundle identifier (AUTH_APPLE_ID, e.g.
// "com.whipperbook.app"). Apple includes the email + email_verified claims when
// the email scope is granted. Returns the verified email, or null when invalid.
export async function verifyAppleIdToken(
  idToken: string,
): Promise<{ email: string } | null> {
  const audience = process.env.AUTH_APPLE_ID;
  if (!audience) return null;
  try {
    const { payload } = await jwtVerify(idToken, APPLE_JWKS, {
      issuer: "https://appleid.apple.com",
      audience,
    });
    const email = typeof payload.email === "string" ? payload.email : null;
    // Apple sends email_verified as a boolean or the string "true".
    const verified =
      payload.email_verified === true || payload.email_verified === "true";
    if (!email || !verified) return null;
    return { email };
  } catch {
    return null;
  }
}
