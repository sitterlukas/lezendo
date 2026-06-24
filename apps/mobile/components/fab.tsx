import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// The app's one floating action button — a circular accent "+" pinned
// bottom-right. Originally copy-pasted across feed/crags/forum; lifted here so
// every "add" affordance looks and sits the same. Lists pad with `pb-24`.
export function Fab({
  accessibilityLabel,
  onPress,
  icon = "add",
}: {
  accessibilityLabel: string;
  onPress: () => void;
  icon?: keyof typeof Ionicons.glyphMap;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      onPress={onPress}
      className="absolute bottom-6 right-6 h-14 w-14 items-center justify-center rounded-full bg-blue-600 shadow-lg active:opacity-80"
    >
      <Ionicons name={icon} size={30} color="#ffffff" />
    </Pressable>
  );
}
