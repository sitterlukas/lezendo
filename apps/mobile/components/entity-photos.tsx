import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  Text,
  useWindowDimensions,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@whipperbook/api-client";
import { api, uploadImage } from "../lib/api";
import { canModify } from "../lib/permissions";

type Photo = { id: number; url: string; uploaded_by: number | null };

const GAP = 8; // matches gap-2
const SCREEN_PADDING = 32; // the p-4 on each side of the screen
const COLLAPSED = 2; // photos shown before "+N more"

// A photo gallery for a crag/sector/route. Thumbnails are sized to fill the row
// width (so there's no dead space), collapsed to a couple with a "+N more" tile,
// and a full-width "Add photo" button below. Adding picks from the library,
// uploads to Blob, and attaches the URL; the uploader (or an admin) can delete.
// Backed by the detail query — both mutations invalidate `invalidateKey`.
export function EntityPhotos({
  entityType,
  entityId,
  photos,
  viewer,
  invalidateKey,
}: {
  entityType: "crag" | "sector" | "route";
  entityId: number;
  photos: Photo[];
  viewer: { id: number; role: string } | null;
  invalidateKey: readonly unknown[];
}) {
  const queryClient = useQueryClient();
  const { width } = useWindowDimensions();
  const [error, setError] = useState<string | null>(null);
  const [expanded, setExpanded] = useState(false);
  const invalidate = () =>
    queryClient.invalidateQueries({ queryKey: invalidateKey });

  const add = useMutation({
    mutationFn: async (uris: string[]) => {
      for (const uri of uris) {
        const url = await uploadImage(uri);
        await api.send("/api/images", "POST", { url, entityType, entityId });
      }
    },
    onSuccess: invalidate,
    onError: (e) =>
      setError(e instanceof ApiError ? e.message : "Could not add photo."),
  });

  const remove = useMutation({
    mutationFn: (imageId: number) =>
      api.send(`/api/images/${imageId}`, "DELETE"),
    onSuccess: invalidate,
    onError: (e) =>
      Alert.alert(
        "Could not delete",
        e instanceof ApiError ? e.message : "Please try again.",
      ),
  });

  async function pick() {
    setError(null);
    const perm = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!perm.granted) {
      setError("Photo access is needed to add photos.");
      return;
    }
    const result = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ["images"],
      allowsMultipleSelection: true,
      quality: 0.8,
    });
    if (!result.canceled) add.mutate(result.assets.map((a) => a.uri));
  }

  function confirmRemove(id: number) {
    Alert.alert("Delete photo?", "This can't be undone.", [
      { text: "Cancel", style: "cancel" },
      {
        text: "Delete",
        style: "destructive",
        onPress: () => remove.mutate(id),
      },
    ]);
  }

  const shown = expanded ? photos : photos.slice(0, COLLAPSED);
  const showMore = !expanded && photos.length > shown.length;
  const hidden = photos.length - shown.length;
  // Cells = shown photos (+ the "more" tile when collapsed). Fill the width:
  // up to 3 per row, but fewer cells stretch to use the whole row.
  const cellCount = shown.length + (showMore ? 1 : 0);
  const cols = expanded ? 3 : Math.max(1, Math.min(3, cellCount));
  const raw = (width - SCREEN_PADDING - GAP * (cols - 1)) / cols;
  // Cap at a half-width tile so a single photo doesn't blow up to full width.
  const maxSize = (width - SCREEN_PADDING - GAP) / 2;
  const size = Math.floor(Math.min(raw, maxSize));
  const tile = { width: size, height: size } as const;

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Photos ({photos.length})
      </Text>

      {cellCount > 0 ? (
        <View className="flex-row flex-wrap gap-2">
          {shown.map((p) => (
            <View key={p.id} style={tile}>
              <Image
                source={{ uri: p.url }}
                alt="Photo"
                style={{ ...tile, borderRadius: 12 }}
              />
              {canModify(viewer, p.uploaded_by) ? (
                <Pressable
                  accessibilityLabel="Delete photo"
                  hitSlop={6}
                  onPress={() => confirmRemove(p.id)}
                  className="absolute right-1 top-1 h-7 w-7 items-center justify-center rounded-full bg-black/60 active:opacity-80"
                >
                  <Ionicons name="trash-outline" size={15} color="#fff" />
                </Pressable>
              ) : null}
            </View>
          ))}
          {showMore ? (
            <Pressable
              accessibilityLabel="Show all photos"
              onPress={() => setExpanded(true)}
              style={tile}
              className="items-center justify-center rounded-xl border border-zinc-200 active:opacity-80 dark:border-zinc-800"
            >
              <Text className="text-lg font-semibold text-zinc-700 dark:text-zinc-300">
                +{hidden}
              </Text>
              <Text className="text-xs text-zinc-500">Show more</Text>
            </Pressable>
          ) : null}
        </View>
      ) : null}

      <Pressable
        accessibilityLabel="Add photo"
        onPress={pick}
        disabled={add.isPending}
        className="flex-row items-center justify-center gap-1.5 rounded-xl border border-dashed border-zinc-300 py-3 active:opacity-80 dark:border-zinc-700"
      >
        {add.isPending ? (
          <ActivityIndicator color="#71717a" />
        ) : (
          <>
            <Ionicons name="image-outline" size={18} color="#71717a" />
            <Text className="text-sm font-medium text-zinc-500">Add photo</Text>
          </>
        )}
      </Pressable>

      {expanded && photos.length > COLLAPSED ? (
        <Pressable
          accessibilityLabel="Show fewer photos"
          onPress={() => setExpanded(false)}
          className="flex-row items-center justify-center gap-1 py-1 active:opacity-70"
        >
          <Ionicons name="chevron-up" size={16} color="#71717a" />
          <Text className="text-sm font-medium text-zinc-500">Show less</Text>
        </Pressable>
      ) : null}
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
