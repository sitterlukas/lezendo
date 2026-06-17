import { Tabs } from "expo-router";

export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true }}>
      <Tabs.Screen
        name="crags"
        options={{ title: "Crags", headerShown: false }}
      />
    </Tabs>
  );
}
