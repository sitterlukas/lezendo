import { Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// The app's edit affordance: a pencil icon. Pairs with DeleteButton in detail
// headers; the caller decides where it navigates.
export function EditButton({
  accessibilityLabel,
  onPress,
  size = 20,
}: {
  accessibilityLabel: string;
  onPress: () => void;
  size?: number;
}) {
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={onPress}
      className="active:opacity-70"
    >
      <Ionicons name="create-outline" size={size} color="#a1a1aa" />
    </Pressable>
  );
}
