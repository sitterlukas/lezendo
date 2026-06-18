import { Tabs } from "expo-router";
import { Ionicons } from "@expo/vector-icons";

// Solid icon when the tab is focused, outline when not — the standard polished
// tab-bar look. The active/inactive tint comes from the navigation theme.
export default function TabsLayout() {
  return (
    <Tabs screenOptions={{ headerShown: true, tabBarHideOnKeyboard: true }}>
      <Tabs.Screen
        name="feed"
        options={{
          title: "Feed",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "home" : "home-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="crags"
        options={{
          title: "Crags",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "map" : "map-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      <Tabs.Screen
        name="leaderboard"
        options={{
          title: "Leaderboard",
          headerShown: false,
          tabBarIcon: ({ color, size, focused }) => (
            <Ionicons
              name={focused ? "trophy" : "trophy-outline"}
              color={color}
              size={size}
            />
          ),
        }}
      />
      {/* Profile stays routable (the feed header avatar opens it) but is hidden
          from the tab bar — `href: null` keeps the screen, drops the tab. */}
      <Tabs.Screen
        name="profile"
        options={{
          title: "Profile",
          headerShown: false,
          href: null,
        }}
      />
    </Tabs>
  );
}
