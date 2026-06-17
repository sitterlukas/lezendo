import type { ReactNode } from "react";

// The standard field label span, with optional required (*) / optional hints.
// `hint` is opt-in so shared field sets can stay plain in edit modals.
export default function FieldLabel({
  children,
  required = false,
  hint = false,
}: {
  children: ReactNode;
  required?: boolean;
  hint?: boolean;
}) {
  return (
    <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
      {children}
      {hint &&
        (required ? (
          <span className="text-red-500"> *</span>
        ) : (
          <span className="font-normal text-zinc-400"> (optional)</span>
        ))}
    </span>
  );
}
