"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addComment } from "@/app/actions";
import type { FeedTargetType } from "@/lib/db";
import { inputClass } from "@/app/ui/style";

export type CommentView = {
  id: number;
  authorId: number;
  authorName: string;
  body: string;
};

export default function CommentList({
  targetType,
  targetId,
  comments,
  canComment,
}: {
  targetType: FeedTargetType;
  targetId: number;
  comments: CommentView[];
  canComment: boolean;
}) {
  const [text, setText] = useState("");
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    startTransition(async () => {
      const fd = new FormData();
      fd.set("target_type", targetType);
      fd.set("target_id", String(targetId));
      fd.set("body", body);
      await addComment(fd);
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {comments.map((c) => (
        <p key={c.id} className="text-sm">
          <Link
            href={`/users/${c.authorId}`}
            className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
          >
            {c.authorName}
          </Link>{" "}
          <span className="text-zinc-700 dark:text-zinc-300">{c.body}</span>
        </p>
      ))}
      {canComment && (
        <form onSubmit={submit} className="flex gap-2">
          <input
            value={text}
            onChange={(e) => setText(e.target.value)}
            placeholder="Add a comment…"
            className={inputClass}
          />
          <button
            type="submit"
            disabled={pending || !text.trim()}
            className="rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
          >
            Post
          </button>
        </form>
      )}
    </div>
  );
}
