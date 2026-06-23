import { Pressable, View } from "react-native";
import { router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { meQuery, notificationsQuery } from "@whipperbook/api-client";
import { api } from "../lib/api";
import { Avatar } from "./avatar";

type Me = { name: string; avatar_url: string | null } | null;

// Shared top-bar actions (find climbers, notifications, your profile) used as
// `headerRight` across the main tabs.
export function HeaderActions() {
  const { colorScheme } = useColorScheme();
  const me = useQuery(meQuery<Me>(api));
  const notifications = useQuery(
    notificationsQuery<{ unreadCount: number }>(api),
  );
  const unread = notifications.data?.unreadCount ?? 0;
  const iconColor = colorScheme === "dark" ? "#fafafa" : "#18181b";

  return (
    <View className="flex-row items-center gap-5">
      <Pressable
        accessibilityLabel="Find climbers"
        onPress={() => router.push("/(tabs)/feed/people")}
        hitSlop={8}
      >
        <Ionicons name="search-outline" size={24} color={iconColor} />
      </Pressable>
      <Pressable
        accessibilityLabel="Notifications"
        onPress={() => router.push("/(tabs)/feed/notifications")}
        hitSlop={8}
      >
        <Ionicons name="notifications-outline" size={24} color={iconColor} />
        {unread > 0 ? (
          <View className="absolute -right-1 -top-1 h-2.5 w-2.5 rounded-full border border-white bg-red-500 dark:border-zinc-950" />
        ) : null}
      </Pressable>
      <Pressable
        accessibilityLabel="Your profile"
        onPress={() => router.push("/(tabs)/profile")}
        hitSlop={8}
      >
        <Avatar
          name={me.data?.name ?? ""}
          src={me.data?.avatar_url}
          size={30}
        />
      </Pressable>
    </View>
  );
}
