"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { addComment, deleteComment } from "@/app/actions";
import type { FeedTargetType } from "@/lib/db";
import { inputClass } from "@/app/ui/style";
import Avatar from "@/app/ui/avatar";
import LikeButton from "@/app/ui/like-button";
import DeleteButton from "@/app/ui/delete-button";

export type CommentView = {
  id: number;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  likeCount: number;
  likedByMe: boolean;
};

export default function CommentList({
  targetType,
  targetId,
  comments,
  canComment,
  viewerId,
  isAdmin,
}: {
  targetType: FeedTargetType;
  targetId: number;
  comments: CommentView[];
  canComment: boolean;
  viewerId: number | null;
  isAdmin: boolean;
}) {
  const [text, setText] = useState("");
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function submit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    const body = text.trim();
    if (!body) return;
    setText("");
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("target_type", targetType);
      fd.set("target_id", String(targetId));
      fd.set("body", body);
      const res = await addComment(fd);
      // On failure, put the text back so it isn't lost and show why.
      if (res && !res.ok) {
        setText(body);
        setError(res.error);
      }
    });
  }

  return (
    <div className="mt-3 space-y-2 border-t border-zinc-100 pt-3 dark:border-zinc-800">
      {comments.map((c) => (
        <div key={c.id} className="flex items-start gap-2 text-sm">
          <Link href={`/users/${c.authorId}`} className="mt-0.5 shrink-0">
            <Avatar name={c.authorName} src={c.authorAvatar} size={22} />
          </Link>
          <p className="min-w-0 flex-1">
            <Link
              href={`/users/${c.authorId}`}
              className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
            >
              {c.authorName}
            </Link>{" "}
            <span className="text-zinc-700 dark:text-zinc-300">{c.body}</span>
          </p>
          <LikeButton
            targetType="comment"
            targetId={c.id}
            initialLiked={c.likedByMe}
            initialCount={c.likeCount}
            disabled={!canComment}
          />
          {(isAdmin || viewerId === c.authorId) && (
            <form action={deleteComment}>
              <input type="hidden" name="comment_id" value={c.id} />
              <DeleteButton
                variant="icon"
                title="Delete comment?"
                message="This permanently removes your comment. This can't be undone."
                confirmLabel="Delete"
                ariaLabel="Delete comment"
              />
            </form>
          )}
        </div>
      ))}
      {canComment && (
        <div>
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
          {error && <p className="mt-1 text-xs text-red-500">{error}</p>}
        </div>
      )}
    </div>
  );
}
