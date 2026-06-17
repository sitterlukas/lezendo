import { type SelectHTMLAttributes } from "react";

interface Props extends SelectHTMLAttributes<HTMLSelectElement> {
  children: React.ReactNode;
}

export default function Select({ className, children, ...props }: Props) {
  return (
    <div className="relative">
      <select
        {...props}
        className={`w-full appearance-none rounded border border-zinc-300 bg-white py-2 pl-3 pr-8 text-sm focus:border-zinc-500 focus:outline-none dark:border-zinc-700 dark:bg-zinc-900 ${className ?? ""}`}
      >
        {children}
      </select>
      <svg
        className="pointer-events-none absolute right-2.5 top-1/2 -translate-y-1/2 text-zinc-400"
        width="14"
        height="14"
        viewBox="0 0 20 20"
        fill="none"
        aria-hidden="true"
      >
        <path
          d="M5 7.5l5 5 5-5"
          stroke="currentColor"
          strokeWidth="1.5"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
      </svg>
    </div>
  );
}
