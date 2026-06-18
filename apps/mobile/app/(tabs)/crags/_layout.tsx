import { Stack } from "expo-router";

export default function CragsStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Crags" }} />
      <Stack.Screen name="[id]" options={{ title: "Crag" }} />
      <Stack.Screen
        name="sector/new"
        options={{ title: "Add sector", presentation: "modal" }}
      />
      <Stack.Screen name="sector/[sectorId]" options={{ title: "Sector" }} />
      <Stack.Screen
        name="new"
        options={{ title: "Add crag", presentation: "modal" }}
      />
    </Stack>
  );
}
