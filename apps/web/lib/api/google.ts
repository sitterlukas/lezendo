import { createRemoteJWKSet, jwtVerify } from "jose";

// Google's public signing keys, fetched + cached by jose (it respects the
// cache headers and refreshes as keys rotate). Created once at module load.
const GOOGLE_JWKS = createRemoteJWKSet(
  new URL("https://www.googleapis.com/oauth2/v3/certs"),
);

// Verify a Google ID token coming from the mobile app's native Google Sign-In.
// The token's audience is our web OAuth client (`AUTH_GOOGLE_ID`) because the
// native SDK is configured with that as its `webClientId`. Returns the verified
// identity, or null when the token is invalid or the email isn't verified.
export async function verifyGoogleIdToken(
  idToken: string,
): Promise<{ email: string; name: string | null } | null> {
  const audience = process.env.AUTH_GOOGLE_ID;
  if (!audience) return null;
  try {
    const { payload } = await jwtVerify(idToken, GOOGLE_JWKS, {
      issuer: ["https://accounts.google.com", "accounts.google.com"],
      audience,
    });
    const email = typeof payload.email === "string" ? payload.email : null;
    if (!email || payload.email_verified !== true) return null;
    return {
      email,
      name: typeof payload.name === "string" ? payload.name : null,
    };
  } catch {
    return null;
  }
}
