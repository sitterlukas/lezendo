import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link, router } from "expo-router";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../lib/api";
import { tokens } from "../../lib/auth";
import { inputClass } from "../../lib/styles";
import { GoogleButton } from "../../components/google-button";
import { AppleButton } from "../../components/apple-button";

type TokenResponse = {
  accessToken: string;
  refreshToken: string;
  user: { id: number; name: string; email: string };
};

export default function Login() {
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);

  async function submit() {
    setError(null);
    if (!email.trim() || !password) {
      setError("Enter your email and password.");
      return;
    }
    setBusy(true);
    try {
      const res = await api.send<TokenResponse>("/api/auth/token", "POST", {
        email: email.trim(),
        password,
      });
      await tokens.set(res.accessToken, res.refreshToken);
      router.replace("/(tabs)/crags");
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not log in. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6 dark:bg-zinc-950">
      <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Whipperbook
      </Text>
      <Text className="mb-2 text-zinc-500 dark:text-zinc-400">
        Log in to your logbook.
      </Text>

      <TextInput
        className={inputClass}
        placeholder="Email"
        placeholderTextColor="#a1a1aa"
        autoCapitalize="none"
        autoComplete="email"
        keyboardType="email-address"
        value={email}
        onChangeText={setEmail}
        editable={!busy}
      />
      <TextInput
        className={inputClass}
        placeholder="Password"
        placeholderTextColor="#a1a1aa"
        secureTextEntry
        autoComplete="password"
        value={password}
        onChangeText={setPassword}
        editable={!busy}
      />

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <Pressable
        className="mt-2 items-center rounded-lg bg-zinc-900 py-3 active:opacity-80 disabled:opacity-50 dark:bg-zinc-100"
        onPress={submit}
        disabled={busy}
      >
        {busy ? (
          <ActivityIndicator color="#fff" />
        ) : (
          <Text className="text-base font-semibold text-white dark:text-zinc-900">
            Log in
          </Text>
        )}
      </Pressable>

      <GoogleButton />
      <AppleButton />

      <View className="mt-2 flex-row justify-center gap-1">
        <Text className="text-zinc-500 dark:text-zinc-400">
          No account yet?
        </Text>
        <Link href="/(auth)/register" className="font-semibold text-blue-600">
          Register
        </Link>
      </View>
    </View>
  );
}
