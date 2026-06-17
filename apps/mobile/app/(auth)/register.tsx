import { useState } from "react";
import {
  ActivityIndicator,
  Pressable,
  Text,
  TextInput,
  View,
} from "react-native";
import { Link } from "expo-router";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../lib/api";

const input =
  "rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

// The validation package has no register schema, so mirror the server's checks
// (name required, basic email shape, password >= 8) client-side; the server
// stays the source of truth.
function validate(name: string, email: string, password: string) {
  if (!name.trim()) return "Enter your name.";
  if (!/^[^@\s]+@[^@\s]+\.[^@\s]+$/.test(email.trim()))
    return "Enter a valid email.";
  if (password.length < 8) return "Password must be at least 8 characters.";
  return null;
}

export default function Register() {
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [busy, setBusy] = useState(false);
  const [done, setDone] = useState(false);

  async function submit() {
    setError(null);
    const problem = validate(name, email, password);
    if (problem) {
      setError(problem);
      return;
    }
    setBusy(true);
    try {
      await api.send("/api/auth/register", "POST", {
        name: name.trim(),
        email: email.trim(),
        password,
      });
      setDone(true);
    } catch (e) {
      setError(
        e instanceof ApiError ? e.message : "Could not register. Try again.",
      );
    } finally {
      setBusy(false);
    }
  }

  if (done) {
    return (
      <View className="flex-1 justify-center gap-3 bg-white px-6 dark:bg-zinc-950">
        <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
          Check your email
        </Text>
        <Text className="text-zinc-600 dark:text-zinc-400">
          We sent a verification link to {email.trim()}. Confirm it, then log in.
        </Text>
        <Link
          href="/(auth)/login"
          className="mt-2 font-semibold text-blue-600"
        >
          Back to login
        </Link>
      </View>
    );
  }

  return (
    <View className="flex-1 justify-center gap-4 bg-white px-6 dark:bg-zinc-950">
      <Text className="text-3xl font-bold text-zinc-900 dark:text-zinc-50">
        Create account
      </Text>

      <TextInput
        className={input}
        placeholder="Name"
        placeholderTextColor="#a1a1aa"
        autoCapitalize="words"
        value={name}
        onChangeText={setName}
        editable={!busy}
      />
      <TextInput
        className={input}
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
        className={input}
        placeholder="Password (min 8 characters)"
        placeholderTextColor="#a1a1aa"
        secureTextEntry
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
            Register
          </Text>
        )}
      </Pressable>

      <View className="mt-2 flex-row justify-center gap-1">
        <Text className="text-zinc-500 dark:text-zinc-400">
          Already have an account?
        </Text>
        <Link href="/(auth)/login" className="font-semibold text-blue-600">
          Log in
        </Link>
      </View>
    </View>
  );
}
