import { Image, Text, View } from "react-native";

// Deterministic per-name color so the same person always gets the same circle.
// Hex values mirror the web Avatar's Tailwind palette (zinc 500-weight hues).
const palette = [
  "#f43f5e", // rose-500
  "#f97316", // orange-500
  "#f59e0b", // amber-500
  "#10b981", // emerald-500
  "#14b8a6", // teal-500
  "#0ea5e9", // sky-500
  "#6366f1", // indigo-500
  "#d946ef", // fuchsia-500
];

function colorFor(seed: string): string {
  let h = 0;
  for (let i = 0; i < seed.length; i++) h = (h * 31 + seed.charCodeAt(i)) >>> 0;
  return palette[h % palette.length];
}

// Round avatar at a fixed size. Shows the user's photo when set, otherwise a
// colored circle with their first initial. The RN counterpart of the web
// `app/ui/avatar.tsx`, so it can be dropped next to a name anywhere.
export function Avatar({
  name,
  src,
  size = 32,
}: {
  name: string;
  src?: string | null;
  size?: number;
}) {
  const radius = size / 2;
  if (src) {
    return (
      <Image
        source={{ uri: src }}
        alt={name}
        style={{ width: size, height: size, borderRadius: radius }}
      />
    );
  }
  const initial = name.trim().charAt(0).toUpperCase() || "?";
  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        backgroundColor: colorFor(name),
        alignItems: "center",
        justifyContent: "center",
      }}
    >
      <Text
        style={{ fontSize: Math.round(size * 0.42), fontWeight: "600" }}
        className="text-white"
      >
        {initial}
      </Text>
    </View>
  );
}
