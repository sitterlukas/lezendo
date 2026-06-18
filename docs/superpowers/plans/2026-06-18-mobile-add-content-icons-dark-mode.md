# Mobile: menu icons, dark mode & add-content — Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Give the Whipperbook mobile app proper tab icons/labels, system-default dark mode with an in-app toggle, and create flows for crags, sectors, routes, reviews, and feed comments.

**Architecture:** Pure mobile work (`apps/mobile`) — no web/server changes. New reusable form primitives back five create flows that POST to existing REST endpoints and invalidate TanStack Query caches, mirroring the existing log-ascent mutation. Dark mode is wired through NativeWind's `colorScheme`, persisted with the same storage helper as auth tokens.

**Tech Stack:** Expo Router, React Native, NativeWind v4, TanStack Query, `@whipperbook/api-client`, `@whipperbook/validation`, `@whipperbook/core`, Ionicons (`@expo/vector-icons`).

## Global Constraints

- No web or `packages/*` code changes — mobile only. Query helpers in `@whipperbook/api-client` are generic (`<T>`); type responses locally in the mobile screen.
- Mobile has no test runner. Per-task verification = `npm run type-check` + `npm run lint` (run from `apps/mobile`) and, where UI behavior changes, a simulator screenshot. There is a booted iPhone 17 Pro sim, the Expo dev server, the web API (`:3000`), and a seeded Postgres (`:6666`) already running. Login: `lukas@whipperbook.test` / `password`.
- Reuse the shared `inputClass` token and the new `components/form.tsx` primitives in every form — no inline duplicate input/button markup.
- Styling: RN primitives + Tailwind, zinc palette, dark mode via `dark:`. Mirror surrounding class idiom.
- Validate every mutation client-side with the shared Zod schema from `@whipperbook/validation`; the API handler stays the source of truth. Surface `error instanceof ApiError ? error.message : <fallback>`.
- Commit after each task. Branch off `main` first (do not commit straight to `main`). Commit message footer:
  `Co-Authored-By: Claude Opus 4.8 (1M context) <noreply@anthropic.com>`

---

### Task 1: Shared form foundation

**Files:**
- Create: `apps/mobile/lib/styles.ts`
- Create: `apps/mobile/components/form.tsx`
- Modify: `apps/mobile/app/(auth)/login.tsx` (use shared `inputClass`)
- Modify: `apps/mobile/app/(auth)/register.tsx` (use shared `inputClass`)

**Interfaces:**
- Produces:
  - `inputClass: string` (from `lib/styles.ts`).
  - `Field(props: { label: string; value: string; onChangeText: (t: string) => void; placeholder?: string; keyboardType?: "default" | "numeric" | "email-address"; multiline?: boolean; editable?: boolean; autoCapitalize?: "none" | "sentences"; secureTextEntry?: boolean })` — labeled text input.
  - `Button(props: { label: string; onPress: () => void; busy?: boolean; disabled?: boolean; variant?: "primary" | "secondary" })`.
  - `SegmentedPicker<T extends string | number>(props: { value: T; onChange: (v: T) => void; options: { label: string; value: T }[] })`.

- [ ] **Step 1: Create `lib/styles.ts`**

```ts
// Shared Tailwind class tokens for mobile forms (mirrors web's app/ui/style.ts).
export const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";
```

- [ ] **Step 2: Create `components/form.tsx`**

```tsx
import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { inputClass } from "../lib/styles";

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  editable = true,
  autoCapitalize = "sentences",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences";
  secureTextEntry?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </Text>
      <TextInput
        className={`${inputClass}${multiline ? " h-24" : ""}`}
        placeholder={placeholder}
        placeholderTextColor="#a1a1aa"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const base =
    "items-center rounded-lg py-3 active:opacity-80 disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 dark:bg-zinc-100"
      : "border border-zinc-300 dark:border-zinc-700";
  const text =
    variant === "primary"
      ? "text-white dark:text-zinc-900"
      : "text-zinc-900 dark:text-zinc-100";
  return (
    <Pressable
      className={`${base} ${styles}`}
      onPress={onPress}
      disabled={busy || disabled}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#71717a"} />
      ) : (
        <Text className={`text-base font-semibold ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SegmentedPicker<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            className={`rounded-full border px-4 py-2 active:opacity-80 ${
              selected
                ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selected
                  ? "text-white dark:text-zinc-900"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
```

- [ ] **Step 3: Replace the local `input` constant in `login.tsx` and `register.tsx`**

In each file, delete the local `const input = "rounded-lg border …";` declaration, add `import { inputClass } from "../../lib/styles";`, and replace `className={input}` usages with `className={inputClass}`.

- [ ] **Step 4: Verify**

Run from `apps/mobile`:
```bash
npm run type-check && npm run lint
```
Expected: both pass, no errors.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/styles.ts apps/mobile/components/form.tsx "apps/mobile/app/(auth)/login.tsx" "apps/mobile/app/(auth)/register.tsx"
git commit -m "feat(mobile): add shared form primitives and inputClass token"
```

---

### Task 2: Tab bar icons & labels

**Files:**
- Create: `apps/mobile/app/(tabs)/feed/_layout.tsx`
- Create: `apps/mobile/app/(tabs)/profile/_layout.tsx`

**Interfaces:**
- Produces: routes named `feed` and `profile` (matching the existing `<Tabs.Screen name="feed"|"profile">` in `app/(tabs)/_layout.tsx`), each owning its own Stack header.

- [ ] **Step 1: Create `app/(tabs)/feed/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function FeedStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Feed" }} />
    </Stack>
  );
}
```

- [ ] **Step 2: Create `app/(tabs)/profile/_layout.tsx`**

```tsx
import { Stack } from "expo-router";

export default function ProfileStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Profile" }} />
    </Stack>
  );
}
```

- [ ] **Step 3: Set `headerShown: false` for the feed & profile tabs**

In `app/(tabs)/_layout.tsx`, add `headerShown: false` to the `options` of the `feed` and `profile` `<Tabs.Screen>` (so the stack header isn't doubled with the tab header — matching how `crags` already does it).

- [ ] **Step 4: Verify in simulator**

Reload the app, screenshot:
```bash
xcrun simctl io booted screenshot /tmp/tabs.png
```
Expected: three tabs read **Feed** (newspaper icon), **Crags** (map icon), **Profile** (person icon) — no `/index` suffix, no placeholder triangles.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/feed/_layout.tsx" "apps/mobile/app/(tabs)/profile/_layout.tsx" "apps/mobile/app/(tabs)/_layout.tsx"
git commit -m "fix(mobile): give feed & profile tabs proper icons and titles"
```

---

### Task 3: Dark mode (system default + toggle)

**Files:**
- Create: `apps/mobile/lib/theme.ts`
- Modify: `apps/mobile/app/_layout.tsx`
- Modify: `apps/mobile/app/(tabs)/profile/index.tsx`

**Interfaces:**
- Consumes: `SegmentedPicker` (Task 1).
- Produces: `ThemeMode = "system" | "light" | "dark"`; `loadThemeMode(): Promise<ThemeMode>`; `saveThemeMode(mode: ThemeMode): Promise<void>`; `applyThemeMode(mode: ThemeMode): void`.

- [ ] **Step 1: Create `lib/theme.ts`**

```ts
import { Platform } from "react-native";
import * as SecureStore from "expo-secure-store";
import { colorScheme } from "nativewind";

export type ThemeMode = "system" | "light" | "dark";

const KEY = "wb.theme";

// Same storage shape as lib/auth.ts: device keychain on native, localStorage on web.
const store =
  Platform.OS === "web"
    ? {
        getItemAsync: async (k: string) => localStorage.getItem(k),
        setItemAsync: async (k: string, v: string) => localStorage.setItem(k, v),
      }
    : SecureStore;

function isMode(v: string | null): v is ThemeMode {
  return v === "system" || v === "light" || v === "dark";
}

export async function loadThemeMode(): Promise<ThemeMode> {
  const v = await store.getItemAsync(KEY);
  return isMode(v) ? v : "system";
}

export async function saveThemeMode(mode: ThemeMode): Promise<void> {
  await store.setItemAsync(KEY, mode);
}

// NativeWind drives the `dark:` variant. "system" makes it track the OS appearance.
export function applyThemeMode(mode: ThemeMode): void {
  colorScheme.set(mode);
}
```

- [ ] **Step 2: Apply the persisted mode on startup in `app/_layout.tsx`**

Add the imports and an effect that runs once on mount:

```tsx
import { useEffect } from "react";
import { loadThemeMode, applyThemeMode } from "../lib/theme";
```

Inside `RootLayout`, before the `return`:

```tsx
  useEffect(() => {
    loadThemeMode().then(applyThemeMode);
  }, []);
```

- [ ] **Step 3: Add the toggle to `app/(tabs)/profile/index.tsx`**

Add imports:
```tsx
import { useState } from "react";
import { SegmentedPicker } from "../../../components/form";
import { type ThemeMode, loadThemeMode, saveThemeMode, applyThemeMode } from "../../../lib/theme";
```

Inside `Profile`, add state + loader effect:
```tsx
  const [theme, setTheme] = useState<ThemeMode>("system");
  useEffect(() => {
    loadThemeMode().then(setTheme);
  }, []);
  function changeTheme(mode: ThemeMode) {
    setTheme(mode);
    applyThemeMode(mode);
    void saveThemeMode(mode);
  }
```
(Add `useEffect` to the existing `react` import.)

Render a section above the "Log out" button:
```tsx
      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Appearance
        </Text>
        <SegmentedPicker
          value={theme}
          onChange={changeTheme}
          options={[
            { label: "System", value: "system" },
            { label: "Light", value: "light" },
            { label: "Dark", value: "dark" },
          ]}
        />
      </View>
```

- [ ] **Step 4: Verify in simulator**

```bash
xcrun simctl ui booted appearance dark
xcrun simctl io booted screenshot /tmp/theme-system-dark.png   # System mode → app dark
```
In the app set **Light**, screenshot — app stays light despite OS dark. Set **System**, screenshot — app dark again. Then `npm run type-check && npm run lint`.
Expected: app follows OS in System mode; Light/Dark override; lint/types clean.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/lib/theme.ts apps/mobile/app/_layout.tsx "apps/mobile/app/(tabs)/profile/index.tsx"
git commit -m "feat(mobile): system-default dark mode with in-app toggle"
```

---

### Task 4: Create Crag

**Files:**
- Create: `apps/mobile/app/(tabs)/crags/new.tsx`
- Modify: `apps/mobile/app/(tabs)/crags/_layout.tsx` (register modal screen)
- Modify: `apps/mobile/app/(tabs)/crags/index.tsx` (header "+" button)

**Interfaces:**
- Consumes: `Field`, `Button` (Task 1); `cragWriteSchema` from `@whipperbook/validation`; `api` from `lib/api`.
- Produces: route `crags/new`.

- [ ] **Step 1: Create `app/(tabs)/crags/new.tsx`**

```tsx
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { cragWriteSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Field, Button } from "../../../components/form";

export default function NewCrag() {
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [area, setArea] = useState("");
  const [country, setCountry] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.send<{ id: number }>("/api/crags", "POST", body),
    onSuccess: (res) => {
      queryClient.invalidateQueries({ queryKey: ["crags"] });
      router.replace(`/(tabs)/crags/${res.id}`);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create crag."),
  });

  function submit() {
    setError(null);
    const parsed = cragWriteSchema.safeParse({
      name,
      area,
      country,
      description,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid crag.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen options={{ title: "Add crag", presentation: "modal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Crag name" />
      <Field label="Area" value={area} onChangeText={setArea} placeholder="Region / area" />
      <Field label="Country" value={country} onChangeText={setCountry} />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Create crag" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
```

- [ ] **Step 2: Register the screen in `crags/_layout.tsx`**

Add inside `<Stack>`:
```tsx
      <Stack.Screen
        name="new"
        options={{ title: "Add crag", presentation: "modal" }}
      />
```

- [ ] **Step 3: Add a header "+" to `crags/index.tsx`**

Add imports:
```tsx
import { Stack, Link } from "expo-router";   // extend existing `Link` import
import { Ionicons } from "@expo/vector-icons";
```
Render a `<Stack.Screen>` with a header-right "+" that links to `crags/new`. Since the crags list currently has no header element, add at the top of the returned tree (FlatList can't host it, so wrap or add a `Stack.Screen` element before the `FlatList` — `Stack.Screen` renders nothing inline):
```tsx
      <Stack.Screen
        options={{
          headerRight: () => (
            <Link href="/(tabs)/crags/new" asChild>
              <Ionicons name="add" size={26} className="mr-2" />
            </Link>
          ),
        }}
      />
```
Place it as the first child of a wrapping fragment `<>...</>` around the existing `FlatList`.

- [ ] **Step 4: Verify in simulator**

Reload, tap the "+" on Crags, fill name (e.g. "Test Crag") + country, Create. Expected: navigates to the new crag's detail screen; pull-to-refresh on the list shows it. Screenshot. Then `npm run type-check && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/crags/new.tsx" "apps/mobile/app/(tabs)/crags/_layout.tsx" "apps/mobile/app/(tabs)/crags/index.tsx"
git commit -m "feat(mobile): add crag creation flow"
```

---

### Task 5: Create Sector

**Files:**
- Create: `apps/mobile/app/(tabs)/crags/sector/new.tsx`
- Modify: `apps/mobile/app/(tabs)/crags/_layout.tsx` (register)
- Modify: `apps/mobile/app/(tabs)/crags/[id].tsx` ("Add sector" button)

**Interfaces:**
- Consumes: `Field`, `Button`; `sectorCreateSchema` from `@whipperbook/validation`; `useLocalSearchParams` for `cragId`.
- Produces: route `crags/sector/new`.

- [ ] **Step 1: Create `app/(tabs)/crags/sector/new.tsx`**

```tsx
import { useState } from "react";
import { ScrollView, Text } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { sectorCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../../../../lib/api";
import { Field, Button } from "../../../../components/form";

export default function NewSector() {
  const { cragId } = useLocalSearchParams<{ cragId: string }>();
  const crag = Number(cragId);
  const queryClient = useQueryClient();
  const [name, setName] = useState("");
  const [description, setDescription] = useState("");
  const [approach, setApproach] = useState("");
  const [aspect, setAspect] = useState("");
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.send<{ id: number }>("/api/sectors", "POST", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create sector."),
  });

  function submit() {
    setError(null);
    const parsed = sectorCreateSchema.safeParse({
      name,
      description,
      approach_minutes: approach,
      aspect,
      crag_id: crag,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid sector.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen options={{ title: "Add sector", presentation: "modal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Sector name" />
      <Field
        label="Approach (minutes)"
        value={approach}
        onChangeText={setApproach}
        keyboardType="numeric"
      />
      <Field label="Aspect" value={aspect} onChangeText={setAspect} placeholder="e.g. South-facing" />
      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Create sector" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
```

> Note on `approach_minutes`: the validation schemas normalize string→number/null for numeric fields (per `@whipperbook/validation` helpers), so passing the raw `approach` string is correct; an empty string becomes null.

- [ ] **Step 2: Register in `crags/_layout.tsx`**

```tsx
      <Stack.Screen
        name="sector/new"
        options={{ title: "Add sector", presentation: "modal" }}
      />
```

- [ ] **Step 3: Add an "Add sector" button on `crags/[id].tsx`**

Add `Link` is already imported. Add a button row under the crag header `View`:
```tsx
      <Link href={`/(tabs)/crags/sector/new?cragId=${cragId}`} asChild>
        <Pressable className="self-start rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 dark:border-zinc-700">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + Add sector
          </Text>
        </Pressable>
      </Link>
```

- [ ] **Step 4: Verify**

Open a crag → "Add sector" → fill name → Create. Expected: returns to crag detail, new sector listed. Screenshot. `npm run type-check && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/crags/sector/new.tsx" "apps/mobile/app/(tabs)/crags/_layout.tsx" "apps/mobile/app/(tabs)/crags/[id].tsx"
git commit -m "feat(mobile): add sector creation flow"
```

---

### Task 6: Create Route (with grade picker)

**Files:**
- Create: `apps/mobile/app/(tabs)/crags/route/new.tsx`
- Modify: `apps/mobile/app/(tabs)/crags/_layout.tsx` (register)
- Modify: `apps/mobile/app/(tabs)/crags/[id].tsx` ("Add route" button)
- Modify: `apps/mobile/app/(tabs)/crags/sector/[sectorId].tsx` ("Add route" button, prefills sectorId)

**Interfaces:**
- Consumes: `Field`, `Button`, `SegmentedPicker`; `routeWriteSchema` from `@whipperbook/validation`; `meQuery` from `@whipperbook/api-client`; `gradesForSystem`, `disciplineOf`, `type GradeEquivalency` from `@whipperbook/core`.
- Produces: route `crags/route/new`.

- [ ] **Step 1: Create `app/(tabs)/crags/route/new.tsx`**

```tsx
import { useMemo, useState } from "react";
import { ScrollView, Text, View } from "react-native";
import { router, Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routeWriteSchema } from "@whipperbook/validation";
import { meQuery, ApiError } from "@whipperbook/api-client";
import {
  gradesForSystem,
  disciplineOf,
  type GradeEquivalency,
} from "@whipperbook/core";
import { api } from "../../../../lib/api";
import { Field, Button, SegmentedPicker } from "../../../../components/form";
import { Loading, ErrorState } from "../../../../components/states";

type GradingSystem = { id: number; name: string; slug: string };
type Me = {
  gradingSystems: GradingSystem[];
  gradeEquivalencies: GradeEquivalency[];
} | null;

type Style = "sport" | "trad" | "boulder";

export default function NewRoute() {
  const { cragId, sectorId } = useLocalSearchParams<{
    cragId: string;
    sectorId?: string;
  }>();
  const crag = Number(cragId);
  const queryClient = useQueryClient();
  const me = useQuery(meQuery<Me>(api));

  const [name, setName] = useState("");
  const [style, setStyle] = useState<Style>("sport");
  const [systemId, setSystemId] = useState<number | null>(null);
  const [grade, setGrade] = useState("");
  const [description, setDescription] = useState("");
  const [error, setError] = useState<string | null>(null);

  const wantedDiscipline = style === "boulder" ? "boulder" : "rope";
  const eqs = me.data?.gradeEquivalencies ?? [];
  const systems = me.data?.gradingSystems ?? [];

  // Only grading systems whose discipline matches the chosen style.
  const validSystems = useMemo(
    () => systems.filter((s) => disciplineOf(s.slug, eqs) === wantedDiscipline),
    [systems, eqs, wantedDiscipline],
  );
  const effectiveSystemId =
    validSystems.find((s) => s.id === systemId)?.id ?? validSystems[0]?.id ?? null;
  const slug = validSystems.find((s) => s.id === effectiveSystemId)?.slug ?? "";
  const gradeOptions = useMemo(() => gradesForSystem(slug, eqs), [slug, eqs]);

  const mutation = useMutation({
    mutationFn: (body: unknown) =>
      api.send<{ id: number }>("/api/routes", "POST", body),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags", "detail", crag] });
      if (sectorId) {
        queryClient.invalidateQueries({
          queryKey: ["sectors", "detail", Number(sectorId)],
        });
      }
      router.back();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not create route."),
  });

  function submit() {
    setError(null);
    const parsed = routeWriteSchema.safeParse({
      name,
      grade,
      style,
      grading_system_id: effectiveSystemId,
      crag_id: crag,
      sector_id: sectorId ? Number(sectorId) : null,
      description,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Invalid route.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (me.isPending) return <Loading />;
  if (me.error) {
    return (
      <ErrorState
        message={
          me.error instanceof ApiError ? me.error.message : "Could not load grades."
        }
        onRetry={me.refetch}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <Stack.Screen options={{ title: "Add route", presentation: "modal" }} />
      <Field label="Name" value={name} onChangeText={setName} placeholder="Route name" />

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Style
        </Text>
        <SegmentedPicker<Style>
          value={style}
          onChange={(v) => {
            setStyle(v);
            setGrade("");
          }}
          options={[
            { label: "Sport", value: "sport" },
            { label: "Trad", value: "trad" },
            { label: "Boulder", value: "boulder" },
          ]}
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Grading system
        </Text>
        <SegmentedPicker<number>
          value={effectiveSystemId ?? -1}
          onChange={(v) => {
            setSystemId(v);
            setGrade("");
          }}
          options={validSystems.map((s) => ({ label: s.name, value: s.id }))}
        />
      </View>

      <View className="gap-1.5">
        <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
          Grade
        </Text>
        <SegmentedPicker<string>
          value={grade}
          onChange={setGrade}
          options={gradeOptions.map((g) => ({ label: g, value: g }))}
        />
      </View>

      <Field
        label="Description"
        value={description}
        onChangeText={setDescription}
        multiline
      />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      <Button label="Create route" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
```

> If `disciplineOf` is not exported from `@whipperbook/core`, derive discipline inline instead: `const d = eqs.find((e) => e.slug === s.slug)?.discipline;` (the `GradeEquivalency` type carries `discipline: "rope" | "boulder"`). Confirmed exported at `packages/core/src/grade-conversion.ts`.

- [ ] **Step 2: Register in `crags/_layout.tsx`**

```tsx
      <Stack.Screen
        name="route/new"
        options={{ title: "Add route", presentation: "modal" }}
      />
```

- [ ] **Step 3: Add "Add route" buttons**

On `crags/[id].tsx`, next to "Add sector":
```tsx
      <Link href={`/(tabs)/crags/route/new?cragId=${cragId}`} asChild>
        <Pressable className="self-start rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 dark:border-zinc-700">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + Add route
          </Text>
        </Pressable>
      </Link>
```
On `crags/sector/[sectorId].tsx`, add `Link` to the imports and a button under the sector header (prefilling sectorId):
```tsx
      <Link
        href={`/(tabs)/crags/route/new?cragId=${crag}&sectorId=${sector.id}`}
        asChild
      >
        <Pressable className="self-start rounded-lg border border-zinc-300 px-3 py-2 active:opacity-80 dark:border-zinc-700">
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            + Add route
          </Text>
        </Pressable>
      </Link>
```
(Also add `Pressable` to the `react-native` import in `sector/[sectorId].tsx`.)

- [ ] **Step 4: Verify**

From a sector → "Add route" → name, pick Sport + a system + a grade → Create. Expected: returns to sector, route appears with the grade. Repeat from crag-level. Screenshot. `npm run type-check && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/crags/route/new.tsx" "apps/mobile/app/(tabs)/crags/_layout.tsx" "apps/mobile/app/(tabs)/crags/[id].tsx" "apps/mobile/app/(tabs)/crags/sector/[sectorId].tsx"
git commit -m "feat(mobile): add route creation flow with grade picker"
```

---

### Task 7: Reviews (inline on detail screens)

**Files:**
- Create: `apps/mobile/components/review-form.tsx`
- Modify: `apps/mobile/app/(tabs)/crags/route/[routeId].tsx` (render review form)
- Modify: `apps/mobile/app/(tabs)/crags/[id].tsx` (render review form)
- Modify: `apps/mobile/app/(tabs)/crags/sector/[sectorId].tsx` (render review form)

**Interfaces:**
- Consumes: `Field`, `Button`, `SegmentedPicker`; `entityReviewCreateSchema` from `@whipperbook/validation`.
- Produces: `ReviewForm(props: { entityType: "crag" | "sector" | "route"; entityId: number; invalidateKey: readonly unknown[] })`.

- [ ] **Step 1: Create `components/review-form.tsx`**

```tsx
import { useState } from "react";
import { Text, View } from "react-native";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { entityReviewCreateSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api } from "../lib/api";
import { Field, Button, SegmentedPicker } from "./form";

export function ReviewForm({
  entityType,
  entityId,
  invalidateKey,
}: {
  entityType: "crag" | "sector" | "route";
  entityId: number;
  invalidateKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const [rating, setRating] = useState(0);
  const [body, setBody] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [done, setDone] = useState(false);

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send("/api/reviews", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: invalidateKey });
      setDone(true);
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save review."),
  });

  function submit() {
    setError(null);
    const parsed = entityReviewCreateSchema.safeParse({
      entity_type: entityType,
      entity_id: entityId,
      rating,
      body,
    });
    if (!parsed.success) {
      setError(parsed.error.issues[0]?.message ?? "Pick a rating 1–5.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  return (
    <View className="mt-2 gap-2 rounded-xl border border-zinc-200 p-4 dark:border-zinc-800">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Your review
      </Text>
      <SegmentedPicker<number>
        value={rating}
        onChange={setRating}
        options={[1, 2, 3, 4, 5].map((n) => ({ label: "★".repeat(n), value: n }))}
      />
      <Field label="Notes (optional)" value={body} onChangeText={setBody} multiline />
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
      {done ? (
        <Text className="text-sm text-green-600">Review saved.</Text>
      ) : null}
      <Button label="Save review" onPress={submit} busy={mutation.isPending} />
    </View>
  );
}
```

- [ ] **Step 2: Render it on the route detail screen**

In `crags/route/[routeId].tsx`, import `import { ReviewForm } from "../../../../components/review-form";` and render `<ReviewForm entityType="route" entityId={routeId} invalidateKey={["routes", "detail", routeId]} />` near the bottom of the route detail content. (`routeId` here must be the numeric id — convert if it's the string param.)

- [ ] **Step 3: Render it on the crag and sector detail screens**

- `crags/[id].tsx`: `<ReviewForm entityType="crag" entityId={cragId} invalidateKey={["crags", "detail", cragId]} />` at the end of the ScrollView.
- `crags/sector/[sectorId].tsx`: `<ReviewForm entityType="sector" entityId={Number(sectorId)} invalidateKey={["sectors", "detail", Number(sectorId)]} />` at the end of the ScrollView.

- [ ] **Step 4: Verify**

Open a route → pick 4★ → Save review. Expected: "Review saved." shows; re-submitting updates (no duplicate, server upserts). Screenshot. `npm run type-check && npm run lint`.

- [ ] **Step 5: Commit**

```bash
git add apps/mobile/components/review-form.tsx "apps/mobile/app/(tabs)/crags/route/[routeId].tsx" "apps/mobile/app/(tabs)/crags/[id].tsx" "apps/mobile/app/(tabs)/crags/sector/[sectorId].tsx"
git commit -m "feat(mobile): add star reviews on crag/sector/route detail"
```

---

### Task 8: Feed-item detail & comments

**Files:**
- Create: `apps/mobile/app/(tabs)/feed/[kind]/[id].tsx`
- Modify: `apps/mobile/app/(tabs)/feed/_layout.tsx` (register detail screen)
- Modify: `apps/mobile/app/(tabs)/feed/index.tsx` (rows link to detail; type `comments`/`commentCount`)

**Interfaces:**
- Consumes: `Field`, `Button`; `feedPageQuery` from `@whipperbook/api-client`; `commentCreateSchema` from `@whipperbook/validation`; `timeAgo` from `@whipperbook/core`.
- Produces: route `feed/[kind]/[id]`.

- [ ] **Step 1: Extend the feed item type & link rows in `feed/index.tsx`**

Add `comments` + `commentCount` to BOTH variants of the `FeedItem` union (they exist on the payload via `attachComments`):
```tsx
type FeedComment = { id: number; body: string; author: FeedAuthor; createdAt: Date };
```
Add to each union member: `commentCount: number; comments: FeedComment[];`

Wrap `FeedRow`'s root `View` in a `Link` so tapping opens the detail (add `Link` to the `expo-router` import — currently feed/index has none, so add `import { Link } from "expo-router";`):
```tsx
function FeedRow({ item }: { item: FeedItem }) {
  return (
    <Link href={`/(tabs)/feed/${item.kind}/${item.id}`} asChild>
      <Pressable className="rounded-xl border border-zinc-200 bg-white p-4 active:opacity-80 dark:border-zinc-800 dark:bg-zinc-900">
        {/* …existing header + body… */}
        <Text className="mt-2 text-xs text-zinc-400">
          {item.commentCount} comment{item.commentCount === 1 ? "" : "s"}
        </Text>
      </Pressable>
    </Link>
  );
}
```
(Add `Pressable` to the `react-native` import.)

- [ ] **Step 2: Create `app/(tabs)/feed/[kind]/[id].tsx`**

```tsx
import { useState } from "react";
import { RefreshControl, ScrollView, Text, View } from "react-native";
import { Stack, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { feedPageQuery, ApiError } from "@whipperbook/api-client";
import { commentCreateSchema } from "@whipperbook/validation";
import { timeAgo } from "@whipperbook/core";
import { api } from "../../../../lib/api";
import { Field, Button } from "../../../../components/form";
import { Loading, ErrorState } from "../../../../components/states";

type FeedAuthor = { id: number; name: string };
type FeedComment = { id: number; body: string; author: FeedAuthor; createdAt: Date };
type FeedItem = {
  id: number;
  kind: "status" | "ascent";
  createdAt: Date;
  author: FeedAuthor;
  body?: string;
  comments: FeedComment[];
};
type FeedPage = { items: FeedItem[] };

export default function FeedItemDetail() {
  const { kind, id } = useLocalSearchParams<{ kind: string; id: string }>();
  const itemId = Number(id);
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch, isRefetching } = useQuery(
    feedPageQuery<FeedPage>(api),
  );
  const [body, setBody] = useState("");
  const [formError, setFormError] = useState<string | null>(null);

  // Map the feed kind to the comments target_type.
  const targetType = kind === "ascent" ? "activity" : "status";

  const mutation = useMutation({
    mutationFn: (payload: unknown) =>
      api.send("/api/comments", "POST", payload),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      setBody("");
    },
    onError: (e) =>
      setFormError(e instanceof ApiError ? e.message : "Could not post comment."),
  });

  function submit() {
    setFormError(null);
    const parsed = commentCreateSchema.safeParse({
      target_type: targetType,
      target_id: itemId,
      body,
    });
    if (!parsed.success) {
      setFormError(parsed.error.issues[0]?.message ?? "Write a comment.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (isPending) return <Loading />;
  if (error) {
    return (
      <ErrorState
        message={error instanceof ApiError ? error.message : "Could not load."}
        onRetry={refetch}
      />
    );
  }

  const item = data.items.find((i) => i.kind === kind && i.id === itemId);
  if (!item) {
    return <ErrorState message="This item is no longer in your feed." onRetry={refetch} />;
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-3"
      refreshControl={
        <RefreshControl refreshing={isRefetching} onRefresh={refetch} />
      }
    >
      <Stack.Screen options={{ title: "Comments" }} />
      <View className="rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
        <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
          {item.author.name}
        </Text>
        {item.body ? (
          <Text className="mt-1 text-zinc-700 dark:text-zinc-300">{item.body}</Text>
        ) : null}
        <Text className="mt-1 text-xs text-zinc-400">{timeAgo(item.createdAt)}</Text>
      </View>

      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Comments ({item.comments.length})
      </Text>
      {item.comments.length === 0 ? (
        <Text className="text-zinc-500">No comments yet.</Text>
      ) : (
        item.comments.map((c) => (
          <View
            key={c.id}
            className="rounded-xl border border-zinc-200 p-3 dark:border-zinc-800"
          >
            <Text className="text-sm font-medium text-zinc-900 dark:text-zinc-50">
              {c.author.name}
            </Text>
            <Text className="text-zinc-700 dark:text-zinc-300">{c.body}</Text>
          </View>
        ))
      )}

      <Field label="Add a comment" value={body} onChangeText={setBody} multiline />
      {formError ? <Text className="text-sm text-red-600">{formError}</Text> : null}
      <Button label="Post comment" onPress={submit} busy={mutation.isPending} />
    </ScrollView>
  );
}
```

- [ ] **Step 3: Register the detail screen in `feed/_layout.tsx`**

```tsx
      <Stack.Screen name="[kind]/[id]" options={{ title: "Comments" }} />
```

- [ ] **Step 4: Verify**

Tap a feed item → see its thread → type a comment → Post. Expected: comment appears, the feed list's count increments after going back. Screenshot. `npm run type-check && npm run lint`.

> If feed items aren't tappable because the feed is empty, first log an ascent (existing flow) or post via the seeded data, then retry.

- [ ] **Step 5: Commit**

```bash
git add "apps/mobile/app/(tabs)/feed/[kind]/[id].tsx" "apps/mobile/app/(tabs)/feed/_layout.tsx" "apps/mobile/app/(tabs)/feed/index.tsx"
git commit -m "feat(mobile): feed-item detail screen with comments"
```

---

### Task 9: Full verification pass

**Files:** none (verification only).

- [ ] **Step 1: Static checks**

```bash
cd apps/mobile && npm run type-check && npm run lint
```
Expected: clean.

- [ ] **Step 2: End-to-end simulator walkthrough**

With the app reloaded and logged in:
1. Tabs show Feed / Crags / Profile with icons (screenshot).
2. Profile: toggle System/Light/Dark; flip `xcrun simctl ui booted appearance dark|light`; confirm behavior (screenshots).
3. Create crag → open it → add sector → add route (style + grade) → confirm listed (screenshots).
4. Add a 4★ review on the new route (screenshot).
5. Open a feed item → post a comment → confirm thread + count (screenshots).

- [ ] **Step 3: Confirm no web regressions**

The web app shares no changed code, but confirm the monorepo still type-checks:
```bash
cd apps/web && npm run type-check
```
Expected: clean.

- [ ] **Step 4: Final commit (if any verification fixups were needed)**

```bash
git add -A && git commit -m "chore(mobile): verification fixups for add-content/dark-mode/icons"
```

---

## Self-Review

**Spec coverage:**
- Shared foundation (inputClass, form primitives) → Task 1. ✓
- Tab icons/labels → Task 2. ✓
- Dark mode system+toggle → Task 3. ✓
- Add crag/sector/route → Tasks 4/5/6. ✓
- Reviews → Task 7. ✓
- Comments / feed-item detail (no new endpoint; reads feed cache) → Task 8. ✓
- Grade data from `/api/me` → Task 6 (typed locally). ✓
- Verification → Task 9. ✓

**Placeholder scan:** No TBD/TODO; every code step has complete code. The one conditional note (Task 6 `disciplineOf` fallback) gives concrete alternative code.

**Type consistency:** `ThemeMode` consistent across Task 3. Mutation/invalidation query keys match the existing ones used by the query helpers (`["crags"]`, `["crags","detail",id]`, `["sectors","detail",id]`, `["routes","detail",id]`, `["feed","page"]`). `Field`/`Button`/`SegmentedPicker` signatures defined in Task 1 are used unchanged in Tasks 3–8. `gradesForSystem(slug, eqs)` and `GradeEquivalency.discipline` match `@whipperbook/core`.
