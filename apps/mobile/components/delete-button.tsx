import { Alert, Pressable } from "react-native";
import { Ionicons } from "@expo/vector-icons";

// The app's one delete affordance: a red trash icon that pops a confirm alert
// before calling onConfirm. The caller owns the mutation (some deletes navigate
// away, some just invalidate) — this only handles the icon + confirmation.
export function DeleteButton({
  accessibilityLabel,
  title,
  message,
  confirmLabel = "Delete",
  onConfirm,
  size = 18,
}: {
  accessibilityLabel: string;
  title: string;
  message: string;
  confirmLabel?: string;
  onConfirm: () => void;
  size?: number;
}) {
  function confirm() {
    Alert.alert(title, message, [
      { text: "Cancel", style: "cancel" },
      { text: confirmLabel, style: "destructive", onPress: onConfirm },
    ]);
  }
  return (
    <Pressable
      accessibilityLabel={accessibilityLabel}
      hitSlop={8}
      onPress={confirm}
      className="active:opacity-70"
    >
      <Ionicons name="trash-outline" size={size} color="#dc2626" />
    </Pressable>
  );
}
