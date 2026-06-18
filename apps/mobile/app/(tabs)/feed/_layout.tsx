import { Stack } from "expo-router";

export default function FeedStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Feed" }} />
      <Stack.Screen name="[kind]/[id]" options={{ title: "Comments" }} />
    </Stack>
  );
}
