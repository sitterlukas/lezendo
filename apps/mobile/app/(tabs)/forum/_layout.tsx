import { Stack } from "expo-router";
import { HeaderActions } from "../../../components/header-actions";

export default function ForumStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Forum", headerRight: () => <HeaderActions /> }}
      />
      <Stack.Screen name="[topicId]" options={{ title: "Topic" }} />
      <Stack.Screen
        name="new"
        options={{ title: "New topic", presentation: "modal" }}
      />
      <Stack.Screen name="users/[id]" options={{ title: "Profile" }} />
    </Stack>
  );
}
