"use client";

import { useEffect, useState, useTransition } from "react";
import Link from "next/link";
import { searchPeople, type PersonResult } from "@/app/actions";
import Avatar from "@/app/ui/avatar";
import FollowButton from "@/app/ui/follow-button";
import { inputClass } from "@/app/ui/style";

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
        const found = await searchPeople(q);
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
            <li key={u.id} className="flex items-center justify-between gap-3">
              <Link
                href={`/users/${u.id}`}
                className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                <Avatar name={u.name} src={u.avatarUrl} size={28} />
                <span className="truncate">{u.name}</span>
              </Link>
              <FollowButton followeeId={u.id} initialFollowing={u.following} />
            </li>
          ))}
          {searched && !pending && results.length === 0 && (
            <li className="text-sm text-zinc-500">No people found.</li>
          )}
        </ul>
      )}
    </div>
  );
}
