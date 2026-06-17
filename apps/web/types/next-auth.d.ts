import "next-auth";
import "next-auth/jwt";

declare module "next-auth" {
  interface Session {
    // The provider used to authenticate the current session ("google" |
    // "credentials"), surfaced from the JWT so the UI can show the real
    // login method instead of guessing from password presence.
    provider?: string;
  }
}

declare module "next-auth/jwt" {
  interface JWT {
    provider?: string;
  }
}
