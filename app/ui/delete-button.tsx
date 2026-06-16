import ConfirmSubmit from "./confirm-submit";
import TrashIcon from "./trash-icon";

// Single source of truth for delete affordances across the app. Renders a
// confirmation-guarded submit (must live inside the <form> it deletes) with a
// consistent trash icon and red styling.
//   - "pill": bordered red button with an icon + label (toolbars / headers)
//   - "icon": compact icon-only button (card corners, list rows)
const triggerClass = {
  pill: "inline-flex items-center gap-1.5 rounded border border-red-200 bg-transparent px-3 py-1.5 text-xs font-medium text-red-600 transition hover:border-red-300 hover:bg-red-50 dark:border-red-900/60 dark:text-red-400 dark:hover:bg-red-950/30",
  icon: "rounded-md p-1.5 text-zinc-400 transition hover:bg-red-50 hover:text-red-600 dark:text-zinc-500 dark:hover:bg-red-950/50 dark:hover:text-red-400",
};

export default function DeleteButton({
  title,
  message,
  confirmLabel,
  ariaLabel,
  label = "Delete",
  variant = "pill",
}: {
  title: string;
  message: string;
  confirmLabel: string;
  ariaLabel: string;
  label?: string;
  variant?: "pill" | "icon";
}) {
  return (
    <ConfirmSubmit
      title={title}
      message={message}
      confirmLabel={confirmLabel}
      triggerAriaLabel={ariaLabel}
      triggerClassName={triggerClass[variant]}
    >
      <TrashIcon size={variant === "icon" ? 16 : 14} />
      {variant === "pill" && <span>{label}</span>}
    </ConfirmSubmit>
  );
}
