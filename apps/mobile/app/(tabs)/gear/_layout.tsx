import { Stack } from "expo-router";
import { HeaderActions } from "../../../components/header-actions";

export default function GearStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Gear", headerRight: () => <HeaderActions /> }}
      />
      <Stack.Screen
        name="new"
        options={{ title: "Add gear", presentation: "modal" }}
      />
      <Stack.Screen
        name="review"
        options={{ title: "Write review", presentation: "modal" }}
      />
    </Stack>
  );
}
