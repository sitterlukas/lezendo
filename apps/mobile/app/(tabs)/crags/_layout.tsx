import { Stack } from "expo-router";
import { HeaderActions } from "../../../components/header-actions";

export default function CragsStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{ title: "Crags", headerRight: () => <HeaderActions /> }}
      />
      <Stack.Screen name="[id]" options={{ title: "Crag" }} />
      <Stack.Screen
        name="sector/new"
        options={{ title: "Add sector", presentation: "modal" }}
      />
      <Stack.Screen name="sector/[sectorId]" options={{ title: "Sector" }} />
      <Stack.Screen name="route/[routeId]" options={{ title: "Route" }} />
      <Stack.Screen
        name="route/new"
        options={{ title: "Add route", presentation: "modal" }}
      />
      <Stack.Screen
        name="new"
        options={{ title: "Add crag", presentation: "modal" }}
      />
    </Stack>
  );
}
