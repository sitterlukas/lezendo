import { Stack } from "expo-router";
import { HeaderActions } from "../../../components/header-actions";

export default function FeedStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          headerTitle: "Feed",
          headerRight: () => <HeaderActions />,
        }}
      />
      <Stack.Screen name="[kind]/[id]" options={{ title: "Comments" }} />
      <Stack.Screen name="people" options={{ title: "Find climbers" }} />
    </Stack>
  );
}
