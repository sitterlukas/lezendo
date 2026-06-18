import { ActivityIndicator, Pressable, Text, TextInput, View } from "react-native";
import { inputClass } from "../lib/styles";

export function Field({
  label,
  value,
  onChangeText,
  placeholder,
  keyboardType = "default",
  multiline = false,
  editable = true,
  autoCapitalize = "sentences",
  secureTextEntry = false,
}: {
  label: string;
  value: string;
  onChangeText: (t: string) => void;
  placeholder?: string;
  keyboardType?: "default" | "numeric" | "email-address";
  multiline?: boolean;
  editable?: boolean;
  autoCapitalize?: "none" | "sentences";
  secureTextEntry?: boolean;
}) {
  return (
    <View className="gap-1.5">
      <Text className="text-sm font-medium text-zinc-700 dark:text-zinc-300">
        {label}
      </Text>
      <TextInput
        className={`${inputClass}${multiline ? " h-24" : ""}`}
        placeholder={placeholder}
        placeholderTextColor="#a1a1aa"
        value={value}
        onChangeText={onChangeText}
        keyboardType={keyboardType}
        multiline={multiline}
        editable={editable}
        autoCapitalize={autoCapitalize}
        secureTextEntry={secureTextEntry}
      />
    </View>
  );
}

export function Button({
  label,
  onPress,
  busy = false,
  disabled = false,
  variant = "primary",
}: {
  label: string;
  onPress: () => void;
  busy?: boolean;
  disabled?: boolean;
  variant?: "primary" | "secondary";
}) {
  const base =
    "items-center rounded-lg py-3 active:opacity-80 disabled:opacity-50";
  const styles =
    variant === "primary"
      ? "bg-zinc-900 dark:bg-zinc-100"
      : "border border-zinc-300 dark:border-zinc-700";
  const text =
    variant === "primary"
      ? "text-white dark:text-zinc-900"
      : "text-zinc-900 dark:text-zinc-100";
  return (
    <Pressable
      className={`${base} ${styles}`}
      onPress={onPress}
      disabled={busy || disabled}
    >
      {busy ? (
        <ActivityIndicator color={variant === "primary" ? "#fff" : "#71717a"} />
      ) : (
        <Text className={`text-base font-semibold ${text}`}>{label}</Text>
      )}
    </Pressable>
  );
}

export function SegmentedPicker<T extends string | number>({
  value,
  onChange,
  options,
}: {
  value: T;
  onChange: (v: T) => void;
  options: { label: string; value: T }[];
}) {
  return (
    <View className="flex-row flex-wrap gap-2">
      {options.map((opt) => {
        const selected = opt.value === value;
        return (
          <Pressable
            key={String(opt.value)}
            onPress={() => onChange(opt.value)}
            className={`rounded-full border px-4 py-2 active:opacity-80 ${
              selected
                ? "border-zinc-900 bg-zinc-900 dark:border-zinc-100 dark:bg-zinc-100"
                : "border-zinc-300 dark:border-zinc-700"
            }`}
          >
            <Text
              className={`text-sm font-medium ${
                selected
                  ? "text-white dark:text-zinc-900"
                  : "text-zinc-700 dark:text-zinc-300"
              }`}
            >
              {opt.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}
