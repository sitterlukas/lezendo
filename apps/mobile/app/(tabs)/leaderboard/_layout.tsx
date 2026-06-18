import { Stack } from "expo-router";
import { HeaderActions } from "../../../components/header-actions";

export default function LeaderboardStack() {
  return (
    <Stack>
      <Stack.Screen
        name="index"
        options={{
          title: "Leaderboards",
          headerRight: () => <HeaderActions />,
        }}
      />
    </Stack>
  );
}
