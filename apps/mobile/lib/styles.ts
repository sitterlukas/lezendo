// Shared Tailwind class tokens for mobile (mirrors web's app/ui/style.ts).
//
// Colour rule: blue = primary/brand action & selection; other hues carry
// meaning (emerald = points/sends, red = delete, the tick/discipline badges).

// The one brand accent — blue-600. Hex for things that can't take a className
// (Ionicons / ActivityIndicator tint).
export const ACCENT = "#2563eb";

export const inputClass =
  "rounded-lg border border-zinc-300 bg-white px-3 py-3 text-base text-zinc-900 dark:border-zinc-700 dark:bg-zinc-900 dark:text-zinc-100";

// Primary (accent) button surface — same in light and dark.
export const primaryBtnClass =
  "items-center rounded-lg bg-blue-600 py-3 active:opacity-80 disabled:opacity-50";

// The standard content card and its pressable variant.
export const cardClass =
  "rounded-xl border border-zinc-200 bg-white p-4 dark:border-zinc-800 dark:bg-zinc-900";
export const cardPressableClass = `${cardClass} active:opacity-80`;

// The small grey section label used above groups of content.
export const sectionLabelClass =
  "text-xs font-semibold uppercase tracking-wide text-zinc-400";
