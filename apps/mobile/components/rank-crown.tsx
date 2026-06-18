import { MaterialCommunityIcons } from "@expo/vector-icons";
import { useColorScheme } from "nativewind";

// Blue crown for the top three leaderboard ranks — darker blue for 1st, lighter
// for 3rd (mirrors the web RankCrown). Renders nothing for rank 4 and below.
const crownColor: Record<number, { light: string; dark: string }> = {
  1: { light: "#2563eb", dark: "#60a5fa" }, // blue-600 / blue-400
  2: { light: "#60a5fa", dark: "#93c5fd" }, // blue-400 / blue-300
  3: { light: "#93c5fd", dark: "#bfdbfe" }, // blue-300 / blue-200
};

export function RankCrown({
  rank,
  size = 18,
}: {
  rank: number;
  size?: number;
}) {
  const { colorScheme } = useColorScheme();
  const c = crownColor[rank];
  if (!c) return null;
  return (
    <MaterialCommunityIcons
      name="crown"
      size={size}
      color={colorScheme === "dark" ? c.dark : c.light}
    />
  );
}
