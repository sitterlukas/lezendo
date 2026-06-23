import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import { router, useLocalSearchParams } from "expo-router";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { routeDetailQuery, ApiError } from "@whipperbook/api-client";
import { ascentCreateSchema, tickTypeEnum } from "@whipperbook/validation";
import { api } from "../../../../lib/api";
import { canModify } from "../../../../lib/permissions";
import { Loading, ErrorState } from "../../../../components/states";
import { DeleteButton } from "../../../../components/delete-button";
import { EditButton } from "../../../../components/edit-button";
import { ReviewForm } from "../../../../components/review-form";

// Minimal local shape of GET /api/routes/:id?cragId= — we render the route, its
// resolved display grade, and the ascent history.
type RouteDetail = {
  route: {
    id: number;
    name: string;
    style: string;
    description: string | null;
    created_by: number | null;
  };
  viewer: { id: number; role: string } | null;
  displayGrade: string;
  ascents: {
    id: number;
    user_id: number;
    tick_type: string;
    ascent_date: string;
    notes: string | null;
    author: string;
  }[];
};

const TICK_LABELS: Record<string, string> = {
  onsight: "Onsight",
  flash: "Flash",
  redpoint: "Redpoint",
  toprope: "Top rope",
  attempt: "Attempt",
};

export default function RouteDetailScreen() {
  const { routeId, cragId } = useLocalSearchParams<{
    routeId: string;
    cragId: string;
  }>();
  const queryClient = useQueryClient();
  const { data, isPending, error, refetch } = useQuery(
    routeDetailQuery<RouteDetail>(api, Number(cragId), Number(routeId)),
  );

  const removeRoute = useMutation({
    mutationFn: () => api.send(`/api/routes/${routeId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["crags"] });
      router.replace(`/(tabs)/crags/${cragId}`);
    },
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  const removeAscent = useMutation({
    mutationFn: (ascentId: number) =>
      api.send(`/api/ascents/${ascentId}`, "DELETE"),
    onSuccess: () => {
      queryClient.invalidateQueries({
        queryKey: ["routes", "detail", Number(routeId)],
      });
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      queryClient.invalidateQueries({ queryKey: ["me", "statistics"] });
    },
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  if (isPending) return <Loading />;

  if (error) {
    return (
      <ErrorState
        message={
          error instanceof ApiError ? error.message : "Could not load route."
        }
        onRetry={refetch}
      />
    );
  }

  return (
    <ScrollView
      className="flex-1 bg-white dark:bg-zinc-950"
      contentContainerClassName="p-4 gap-4"
    >
      <View className="flex-row items-start justify-between gap-3">
        <View className="flex-1 gap-1">
          <Text className="text-2xl font-bold text-zinc-900 dark:text-zinc-50">
            {data.route.name}
          </Text>
          <Text className="text-sm font-semibold text-zinc-500 dark:text-zinc-400">
            {data.displayGrade} · {data.route.style}
          </Text>
          {data.route.description ? (
            <Text className="mt-1 text-zinc-700 dark:text-zinc-300">
              {data.route.description}
            </Text>
          ) : null}
        </View>
        {canModify(data.viewer, data.route.created_by) ? (
          <View className="flex-row items-center gap-3">
            <EditButton
              accessibilityLabel="Edit route"
              onPress={() =>
                router.push(
                  `/(tabs)/crags/route/new?cragId=${cragId}&editId=${routeId}`,
                )
              }
            />
            <DeleteButton
              accessibilityLabel="Delete route"
              title="Delete route?"
              message={`This removes “${data.route.name}” and its ascents.`}
              size={20}
              onConfirm={() => removeRoute.mutate()}
            />
          </View>
        ) : null}
      </View>

      <LogAscent routeId={Number(routeId)} onLogged={refetch} />

      <View className="gap-2">
        <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
          Ascents ({data.ascents.length})
        </Text>
        {data.ascents.length === 0 ? (
          <Text className="text-zinc-500">No ascents logged yet.</Text>
        ) : (
          data.ascents.map((a) => (
            <View
              key={a.id}
              className="rounded-xl border border-zinc-200 bg-white p-3 dark:border-zinc-800 dark:bg-zinc-900"
            >
              <View className="flex-row items-center justify-between gap-2">
                <Text className="font-medium text-zinc-900 dark:text-zinc-50">
                  {a.author}
                </Text>
                <View className="flex-row items-center gap-3">
                  <Text className="text-sm text-zinc-500 dark:text-zinc-400">
                    {TICK_LABELS[a.tick_type] ?? a.tick_type}
                  </Text>
                  {data.viewer?.id === a.user_id ? (
                    <DeleteButton
                      accessibilityLabel="Delete ascent"
                      title="Delete ascent?"
                      message="This removes your logged ascent."
                      onConfirm={() => removeAscent.mutate(a.id)}
                    />
                  ) : null}
                </View>
              </View>
              {a.notes ? (
                <Text className="mt-1 text-sm text-zinc-600 dark:text-zinc-400">
                  {a.notes}
                </Text>
              ) : null}
            </View>
          ))
        )}
      </View>

      <ReviewForm
        entityType="route"
        entityId={Number(routeId)}
        invalidateKey={["routes", "detail", Number(routeId)]}
      />
    </ScrollView>
  );
}

function LogAscent({
  routeId,
  onLogged,
}: {
  routeId: number;
  onLogged: () => void;
}) {
  const queryClient = useQueryClient();
  const [open, setOpen] = useState(false);
  const [tickType, setTickType] = useState<string>("redpoint");
  const [notes, setNotes] = useState("");
  const [validationError, setValidationError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: (body: unknown) => api.send("/api/ascents", "POST", body),
    onSuccess: () => {
      // Refresh this route's ascent list plus the surfaces that aggregate it.
      queryClient.invalidateQueries({
        queryKey: ["routes", "detail", routeId],
      });
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      queryClient.invalidateQueries({ queryKey: ["me", "statistics"] });
      setNotes("");
      setOpen(false);
      onLogged();
    },
  });

  function submit() {
    setValidationError(null);
    const parsed = ascentCreateSchema.safeParse({
      route_id: routeId,
      tick_type: tickType,
      notes,
      ascent_date: null, // defaults to today server-side
    });
    if (!parsed.success) {
      setValidationError(parsed.error.issues[0]?.message ?? "Invalid ascent.");
      return;
    }
    mutation.mutate(parsed.data);
  }

  if (!open) {
    return (
      <Pressable
        className="items-center rounded-lg bg-zinc-900 py-3 active:opacity-80 dark:bg-zinc-100"
        onPress={() => setOpen(true)}
      >
        <Text className="text-base font-semibold text-white dark:text-zinc-900">
          Log ascent
        </Text>
      </Pressable>
    );
  }

  return (
    <View className="gap-3 rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900">
      <Text className="font-semibold text-zinc-900 dark:text-zinc-50">
        Log ascent
      </Text>

      <View className="flex-row flex-wrap gap-2">
        {tickTypeEnum.options.map((t) => {
          const active = t === tickType;
          return (
            <Pressable
              key={t}
              onPress={() => setTickType(t)}
              className={`rounded-full border px-3 py-1.5 ${
                active
                  ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                  : "border-zinc-300 dark:border-zinc-700"
              }`}
            >
              <Text
                className={
                  active
                    ? "text-sm font-semibold text-white dark:text-zinc-900"
                    : "text-sm text-zinc-700 dark:text-zinc-300"
                }
              >
                {TICK_LABELS[t]}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <TextInput
        className="rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100"
        placeholder="Notes (optional)"
        placeholderTextColor="#a1a1aa"
        multiline
        value={notes}
        onChangeText={setNotes}
        editable={!mutation.isPending}
      />

      {validationError || mutation.error ? (
        <Text className="text-sm text-red-600">
          {validationError ??
            (mutation.error instanceof ApiError
              ? mutation.error.message
              : "Could not log ascent.")}
        </Text>
      ) : null}

      <View className="flex-row gap-2">
        <Pressable
          className="flex-1 items-center rounded-lg border border-zinc-300 py-3 active:opacity-80 dark:border-zinc-700"
          onPress={() => setOpen(false)}
          disabled={mutation.isPending}
        >
          <Text className="font-semibold text-zinc-700 dark:text-zinc-300">
            Cancel
          </Text>
        </Pressable>
        <Pressable
          className="flex-1 items-center rounded-lg bg-zinc-900 py-3 active:opacity-80 disabled:opacity-50 dark:bg-zinc-100"
          onPress={submit}
          disabled={mutation.isPending}
        >
          {mutation.isPending ? (
            <ActivityIndicator color="#fff" />
          ) : (
            <Text className="font-semibold text-white dark:text-zinc-900">
              Save
            </Text>
          )}
        </Pressable>
      </View>
    </View>
  );
}
