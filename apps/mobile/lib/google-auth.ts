import {
  GoogleSignin,
  statusCodes,
  isErrorWithCode,
} from "@react-native-google-signin/google-signin";
import { api } from "./api";
import { tokens } from "./auth";

// `webClientId` must be the *web* OAuth client (the same one the backend uses as
// AUTH_GOOGLE_ID) so Google issues an ID token whose audience the server can
// verify. `iosClientId` is the iOS OAuth client for the native iOS flow.
GoogleSignin.configure({
  webClientId: process.env.EXPO_PUBLIC_GOOGLE_WEB_CLIENT_ID,
  iosClientId: process.env.EXPO_PUBLIC_GOOGLE_IOS_CLIENT_ID,
});

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; name: string; email: string };
};

// Thrown when the user dismisses the Google sheet — callers can ignore it.
export class GoogleSignInCancelled extends Error {}

// Run the native Google sign-in, exchange the ID token for our own token pair,
// and persist it. Throws GoogleSignInCancelled if the user backs out, or a
// generic Error (with a user-facing message) otherwise.
export async function signInWithGoogle(): Promise<void> {
  try {
    await GoogleSignin.hasPlayServices();
    const result = await GoogleSignin.signIn();
    // The sign-in result shape varies by SDK version: newer returns
    // `{ type, data: { idToken } }`, older returns `{ idToken }` directly.
    const idToken =
      (result as { data?: { idToken?: string | null } }).data?.idToken ??
      (result as { idToken?: string | null }).idToken ??
      null;
    if (!idToken) throw new Error("Google didn't return a sign-in token.");

    const res = await api.send<TokenResponse>("/api/auth/google", "POST", {
      idToken,
    });
    await tokens.set(res.accessToken, res.refreshToken);
  } catch (e) {
    if (isErrorWithCode(e) && e.code === statusCodes.SIGN_IN_CANCELLED) {
      throw new GoogleSignInCancelled();
    }
    if (
      isErrorWithCode(e) &&
      e.code === statusCodes.PLAY_SERVICES_NOT_AVAILABLE
    ) {
      throw new Error(
        "Google Play Services is required to sign in with Google.",
      );
    }
    throw e instanceof Error ? e : new Error("Could not sign in with Google.");
  }
}
