"use client";

import { useState } from "react";

/**
 * Interactive 1–5 star picker. Writes the chosen value to a hidden input so it
 * submits with a plain <form action={serverAction}>. Blue stars.
 */
export default function StarRatingInput({
  name = "rating",
  defaultValue = 0,
}: {
  name?: string;
  defaultValue?: number;
}) {
  const [value, setValue] = useState(defaultValue);
  const [hover, setHover] = useState(0);
  const shown = hover || value;

  return (
    <div className="flex items-center gap-2">
      <input type="hidden" name={name} value={value} />
      <div className="flex" onMouseLeave={() => setHover(0)}>
        {[1, 2, 3, 4, 5].map((n) => (
          <button
            key={n}
            type="button"
            onClick={() => setValue(n)}
            onMouseEnter={() => setHover(n)}
            aria-label={`${n} star${n > 1 ? "s" : ""}`}
            aria-pressed={value === n}
            className="px-0.5 text-2xl leading-none transition-transform hover:scale-110"
          >
            <span
              className={
                shown >= n
                  ? "text-blue-500"
                  : "text-zinc-300 dark:text-zinc-600"
              }
            >
              ★
            </span>
          </button>
        ))}
      </div>
      <span className="text-xs tabular-nums text-zinc-400">
        {value ? `${value}/5` : "Tap to rate"}
      </span>
    </div>
  );
}
