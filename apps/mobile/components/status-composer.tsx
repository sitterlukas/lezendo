import { useState } from "react";
import {
  Image,
  Pressable,
  ScrollView,
  Text,
  TextInput,
  View,
} from "react-native";
import * as ImagePicker from "expo-image-picker";
import { Ionicons } from "@expo/vector-icons";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { statusWriteSchema } from "@whipperbook/validation";
import { ApiError } from "@whipperbook/api-client";
import { api, uploadImage } from "../lib/api";
import { inputClass } from "../lib/styles";
import { Button } from "./form";

const MAX_PHOTOS = 5;

export type ExistingPhoto = { id: number; url: string };
export type StatusEdit = { id: number; body: string; photos: ExistingPhoto[] };

// Compose a new status or edit an existing one (pass `status`), with up to five
// photos. Used from the feed's "+" / edit popover; `onPosted` dismisses it.
export function StatusComposer({
  status,
  onPosted,
}: {
  status?: StatusEdit;
  onPosted?: () => void;
}) {
  const queryClient = useQueryClient();
  const [body, setBody] = useState(status?.body ?? "");
  const [existing, setExisting] = useState<ExistingPhoto[]>(
    status?.photos ?? [],
  );
  const [removed, setRemoved] = useState<number[]>([]);
  const [added, setAdded] = useState<string[]>([]); // local image URIs
  const [error, setError] = useState<string | null>(null);

  const mutation = useMutation({
    mutationFn: async () => {
      const parsed = statusWriteSchema.safeParse({ body });
      if (!parsed.success) {
        throw new ApiError(
          400,
          parsed.error.issues[0]?.message ?? "Write something first.",
        );
      }

      let id: number;
      if (status) {
        await api.send(`/api/statuses/${status.id}`, "PATCH", parsed.data);
        id = status.id;
        for (const photoId of removed) {
          await api.send(`/api/images/${photoId}`, "DELETE");
        }
      } else {
        const res = await api.send<{ id: number }>(
          "/api/statuses",
          "POST",
          parsed.data,
        );
        id = res.id;
      }

      for (const uri of added) {
        const url = await uploadImage(uri);
        await api.send("/api/images", "POST", {
          url,
          entityType: "status",
          entityId: id,
        });
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["feed", "page"] });
      onPosted?.();
    },
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not save status."),
  });

  async function pickPhotos() {
    setError(null);
    const remaining = MAX_PHOTOS - (existing.length + added.length);
    if (remaining <= 0) {
      setError(`Up to ${MAX_PHOTOS} photos.`);
      return;
    }
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo access is needed to add photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      selectionLimit: remaining,
      quality: 0.8,
    });
    if (!result.canceled) {
      setAdded((a) => [...a, ...result.assets.map((x) => x.uri)]);
    }
  }

  function removeExisting(p: ExistingPhoto) {
    setExisting((xs) => xs.filter((x) => x.id !== p.id));
    setRemoved((r) => [...r, p.id]);
  }

  const hasPhotos = existing.length > 0 || added.length > 0;

  return (
    <View className="gap-3">
      <TextInput
        className={`${inputClass} h-20`}
        placeholder="Share a status…"
        placeholderTextColor="#a1a1aa"
        value={body}
        onChangeText={setBody}
        multiline
      />

      {hasPhotos ? (
        <ScrollView
          horizontal
          showsHorizontalScrollIndicator={false}
          keyboardShouldPersistTaps="handled"
        >
          <View className="flex-row gap-2">
            {existing.map((p) => (
              <PhotoThumb
                key={`e-${p.id}`}
                uri={p.url}
                onRemove={() => removeExisting(p)}
              />
            ))}
            {added.map((uri) => (
              <PhotoThumb
                key={`a-${uri}`}
                uri={uri}
                onRemove={() => setAdded((a) => a.filter((u) => u !== uri))}
              />
            ))}
          </View>
        </ScrollView>
      ) : null}

      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}

      <View className="flex-row items-center gap-3">
        <Pressable
          onPress={pickPhotos}
          hitSlop={8}
          className="flex-row items-center gap-1.5 rounded-lg border border-zinc-300 px-3 py-3 active:opacity-80 dark:border-zinc-700"
        >
          <Ionicons name="image-outline" size={18} color="#71717a" />
          <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
            Photo
          </Text>
        </Pressable>
        <View className="flex-1">
          <Button
            label={status ? "Save" : "Post status"}
            onPress={() => mutation.mutate()}
            busy={mutation.isPending}
          />
        </View>
      </View>
    </View>
  );
}

function PhotoThumb({ uri, onRemove }: { uri: string; onRemove: () => void }) {
  return (
    <View>
      <Image
        source={{ uri }}
        alt="Selected photo"
        style={{ width: 72, height: 72, borderRadius: 8 }}
      />
      <Pressable
        accessibilityLabel="Remove photo"
        onPress={onRemove}
        hitSlop={6}
        className="absolute -right-1.5 -top-1.5 h-5 w-5 items-center justify-center rounded-full bg-black/70"
      >
        <Ionicons name="close" size={12} color="#fff" />
      </Pressable>
    </View>
  );
}
