import { Stack } from "expo-router";

export default function LeaderboardStack() {
  return (
    <Stack>
      <Stack.Screen name="index" options={{ title: "Leaderboard" }} />
    </Stack>
  );
}
