import { Alert, Pressable, View } from "react-native";
import { Stack, router } from "expo-router";
import { Ionicons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";
import { useQuery } from "@tanstack/react-query";
import { meQuery } from "@whipperbook/api-client";
import { api } from "../../../lib/api";
import { Avatar } from "../../../components/avatar";

type Me = { name: string; avatar_url: string | null } | null;

export default function FeedStack() {
  const { colorScheme } = useColorScheme();
  const me = useQuery(meQuery<Me>(api));
  const iconColor = colorScheme === "dark" ? "#fafafa" : "#18181b";

  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Whipperbook",
          // Strava-style home bar: your avatar on the left (to the profile),
          // search-for-people and a (mock) notifications bell on the right.
          headerLeft: () => (
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
          ),
          headerRight: () => (
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
                onPress={() => Alert.alert("Notifications", "Coming soon.")}
                hitSlop={8}
              >
                <Ionicons
                  name="notifications-outline"
                  size={24}
                  color={iconColor}
                />
              </Pressable>
            </View>
          ),
        }}
      />
      <Stack.Screen name="[kind]/[id]" options={{ title: "Comments" }} />
      <Stack.Screen name="people" options={{ title: "Find climbers" }} />
    </Stack>
  );
}
