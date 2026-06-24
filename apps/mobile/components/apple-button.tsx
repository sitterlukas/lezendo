import { useEffect, useState } from "react";
import { Platform, Text, View } from "react-native";
import { router } from "expo-router";
import { useColorScheme } from "nativewind";
import * as AppleAuthentication from "expo-apple-authentication";
import { api } from "../lib/api";
import { tokens } from "../lib/auth";

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; name: string; email: string };
};

// Native "Sign in with Apple" button. Renders only on iOS where Apple auth is
// available; signs in, exchanges the identity token for our own token pair, and
// lands on the tabs like the other login methods. Apple returns the user's name
// only on the first sign-in, so we forward it when present.
export function AppleButton() {
  const { colorScheme } = useColorScheme();
  const [available, setAvailable] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (Platform.OS !== "ios") return;
    AppleAuthentication.isAvailableAsync()
      .then(setAvailable)
      .catch(() => {});
  }, []);

  if (!available) return null;

  async function onPress() {
    setError(null);
    try {
      const credential = await AppleAuthentication.signInAsync({
        requestedScopes: [
          AppleAuthentication.AppleAuthenticationScope.FULL_NAME,
          AppleAuthentication.AppleAuthenticationScope.EMAIL,
        ],
      });
      if (!credential.identityToken) {
        throw new Error("Apple didn't return a sign-in token.");
      }
      const name = credential.fullName
        ? [credential.fullName.givenName, credential.fullName.familyName]
            .filter(Boolean)
            .join(" ") || null
        : null;
      const res = await api.send<TokenResponse>("/api/auth/apple", "POST", {
        identityToken: credential.identityToken,
        name,
      });
      await tokens.set(res.accessToken, res.refreshToken);
      router.replace("/(tabs)/crags");
    } catch (e) {
      // The user dismissing the sheet throws ERR_REQUEST_CANCELED — ignore it.
      if (
        e &&
        typeof e === "object" &&
        "code" in e &&
        e.code === "ERR_REQUEST_CANCELED"
      ) {
        return;
      }
      setError(
        e instanceof Error ? e.message : "Could not sign in with Apple.",
      );
    }
  }

  return (
    <View className="gap-2">
      <AppleAuthentication.AppleAuthenticationButton
        buttonType={AppleAuthentication.AppleAuthenticationButtonType.SIGN_IN}
        buttonStyle={
          colorScheme === "dark"
            ? AppleAuthentication.AppleAuthenticationButtonStyle.WHITE
            : AppleAuthentication.AppleAuthenticationButtonStyle.BLACK
        }
        cornerRadius={8}
        style={{ height: 48, width: "100%" }}
        onPress={onPress}
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
