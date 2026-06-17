"use client";

import { useEffect, useState, useTransition } from "react";
import { apiFetch } from "@/lib/api-client";
import UserRow from "@/app/ui/user-row";
import { inputClass } from "@/app/ui/style";

type PersonResult = {
  id: number;
  name: string;
  avatarUrl: string | null;
  following: boolean;
};

// Discover-people search: type a name or email, get matching climbers to
// follow. Debounced; results show only once you've typed something.
export default function PeopleSearch() {
  const [query, setQuery] = useState("");
  const [results, setResults] = useState<PersonResult[]>([]);
  const [searched, setSearched] = useState(false);
  const [pending, startTransition] = useTransition();

  // Debounced search. State is only updated inside the (async) timeout, never
  // synchronously in the effect body; short queries just skip scheduling and
  // the results stay hidden by the length guard in render.
  useEffect(() => {
    const q = query.trim();
    if (q.length < 2) return;
    const t = setTimeout(() => {
      startTransition(async () => {
        const found = await apiFetch<PersonResult[]>(
          `/api/people?q=${encodeURIComponent(q)}`,
        );
        setResults(found);
        setSearched(true);
      });
    }, 250);
    return () => clearTimeout(t);
  }, [query]);

  return (
    <div>
      <input
        type="search"
        value={query}
        onChange={(e) => setQuery(e.target.value)}
        placeholder="Search people…"
        aria-label="Search people by name or email"
        className={inputClass}
      />
      <p className="mt-1 text-xs text-zinc-400">Search by name or email.</p>

      {query.trim().length >= 2 && (
        <ul className="mt-3 space-y-2">
          {results.map((u) => (
            <UserRow
              key={u.id}
              id={u.id}
              name={u.name}
              avatarUrl={u.avatarUrl}
              initialFollowing={u.following}
            />
          ))}
          {searched && !pending && results.length === 0 && (
            <li className="text-sm text-zinc-500">No people found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
