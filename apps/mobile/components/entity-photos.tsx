import { useState } from "react";
import {
  ActivityIndicator,
  Alert,
  Image,
  Pressable,
  ScrollView,
  Text,
  View,
} from "react-native";
import { Ionicons } from "@expo/vector-icons";
import * as ImagePicker from "expo-image-picker";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { ApiError } from "@whipperbook/api-client";
import { api, uploadImage } from "../lib/api";
import { canModify } from "../lib/permissions";

type Photo = { id: number; url: string; uploaded_by: number | null };

// A photo gallery for a crag/sector/route: a horizontal strip of thumbnails
// with an "add" tile. Adding picks from the library, uploads to Blob, and
// attaches the URL; the uploader (or an admin) can delete. Backed by the
// detail query — both mutations invalidate `invalidateKey` to refresh.
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
  const [error, setError] = useState<string | null>(null);
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

  return (
    <View className="gap-2">
      <Text className="text-xs font-semibold uppercase tracking-wide text-zinc-400">
        Photos ({photos.length})
      </Text>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        keyboardShouldPersistTaps="handled"
      >
        <View className="flex-row gap-2">
          {photos.map((p) => (
            <View key={p.id}>
              <Image
                source={{ uri: p.url }}
                alt="Photo"
                style={{ width: 112, height: 112, borderRadius: 12 }}
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
          <Pressable
            accessibilityLabel="Add photo"
            onPress={pick}
            disabled={add.isPending}
            className="h-28 w-28 items-center justify-center gap-1 rounded-xl border border-dashed border-zinc-300 active:opacity-80 dark:border-zinc-700"
          >
            {add.isPending ? (
              <ActivityIndicator color="#71717a" />
            ) : (
              <>
                <Ionicons name="image-outline" size={22} color="#71717a" />
                <Text className="text-xs text-zinc-500">Add photo</Text>
              </>
            )}
          </Pressable>
        </View>
      </ScrollView>
      {error ? <Text className="text-sm text-red-600">{error}</Text> : null}
    </View>
  );
}
