import { useState } from "react";
import { Modal, Pressable, Text, View } from "react-native";
import { Ionicons } from "@expo/vector-icons";
import { Fab } from "./fab";

export type FabMenuAction = {
  icon: keyof typeof Ionicons.glyphMap;
  label: string;
  onPress: () => void;
};

// The shared "+" FAB for screens with more than one add action: tapping it
// opens a small popover menu anchored just above the FAB. Tap the backdrop or
// an item to dismiss. Drop it as a sibling of the screen's scroll content,
// inside a flex-1 container so the FAB anchors to the screen.
export function FabMenu({
  accessibilityLabel,
  actions,
}: {
  accessibilityLabel: string;
  actions: FabMenuAction[];
}) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <Fab
        accessibilityLabel={accessibilityLabel}
        onPress={() => setOpen(true)}
      />
      <Modal
        visible={open}
        transparent
        animationType="fade"
        onRequestClose={() => setOpen(false)}
      >
        <Pressable
          className="flex-1 bg-black/40"
          onPress={() => setOpen(false)}
        />
        <View className="absolute bottom-24 right-6 w-48 overflow-hidden rounded-2xl bg-white shadow-xl dark:bg-zinc-900">
          {actions.map((action, i) => (
            <View key={action.label}>
              {i > 0 ? (
                <View className="h-px bg-zinc-100 dark:bg-zinc-800" />
              ) : null}
              <Pressable
                onPress={() => {
                  setOpen(false);
                  action.onPress();
                }}
                className="flex-row items-center gap-3 px-4 py-3 active:bg-zinc-100 dark:active:bg-zinc-800"
              >
                <Ionicons name={action.icon} size={20} color="#71717a" />
                <Text className="text-base font-medium text-zinc-900 dark:text-zinc-50">
                  {action.label}
                </Text>
              </Pressable>
            </View>
          ))}
        </View>
      </Modal>
    </>
  );
}
