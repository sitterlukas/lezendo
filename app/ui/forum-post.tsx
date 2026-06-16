"use client";

import { useState, useTransition } from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { editPost, deletePost } from "@/app/actions";
import Avatar from "@/app/ui/avatar";
import DeleteButton from "@/app/ui/delete-button";
import { inputClass } from "@/app/ui/style";

// A single forum post (the first one is the topic's OP). Shows the author's
// avatar + a link to their profile, and — for the author or an admin — inline
// edit and (for replies) delete. The OP post is removed via the topic delete,
// not here.
export default function ForumPost({
  postId,
  authorId,
  authorName,
  authorAvatar,
  body,
  createdAtLabel,
  isOp,
  canManage,
}: {
  postId: number;
  authorId: number;
  authorName: string;
  authorAvatar: string | null;
  body: string;
  createdAtLabel: string;
  isOp: boolean;
  canManage: boolean;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [text, setText] = useState(body);
  const [error, setError] = useState<string | null>(null);
  const [pending, startTransition] = useTransition();

  function save() {
    setError(null);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("post_id", String(postId));
      fd.set("body", text.trim());
      const res = await editPost(fd);
      if (res.ok) {
        setEditing(false);
        router.refresh();
      } else setError(res.error);
    });
  }

  return (
    <article
      className={`rounded border p-5 ${
        isOp
          ? "border-zinc-300 bg-zinc-50 dark:border-zinc-700 dark:bg-zinc-900/60"
          : "border-zinc-200 bg-white dark:border-zinc-800 dark:bg-transparent"
      }`}
    >
      <header className="flex flex-wrap items-center gap-2 text-sm">
        <Link href={`/users/${authorId}`} className="shrink-0">
          <Avatar name={authorName} src={authorAvatar} size={28} />
        </Link>
        <Link
          href={`/users/${authorId}`}
          className="font-semibold hover:underline"
        >
          {authorName}
        </Link>
        {isOp && (
          <span className="rounded bg-zinc-200 px-1.5 py-0.5 text-xs font-medium text-zinc-600 dark:bg-zinc-700 dark:text-zinc-400">
            OP
          </span>
        )}
        <span className="ml-auto text-xs text-zinc-400">{createdAtLabel}</span>
      </header>

      {editing ? (
        <div className="mt-3">
          <textarea
            value={text}
            onChange={(e) => setText(e.target.value)}
            rows={5}
            className={inputClass}
          />
          {error && <p className="mt-2 text-sm text-red-500">{error}</p>}
          <div className="mt-2 flex gap-2">
            <button
              type="button"
              onClick={save}
              disabled={pending || !text.trim()}
              className="rounded bg-zinc-900 px-4 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
            >
              {pending ? "Saving…" : "Save"}
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setText(body);
                setError(null);
              }}
              className="rounded border border-zinc-300 px-4 py-1.5 text-sm font-medium transition hover:bg-zinc-100 dark:border-zinc-700 dark:hover:bg-zinc-800"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="mt-3 whitespace-pre-wrap text-sm leading-relaxed text-zinc-700 dark:text-zinc-300">
          {body}
        </div>
      )}

      {canManage && !editing && (
        <div className="mt-3 flex items-center gap-3">
          <button
            type="button"
            onClick={() => setEditing(true)}
            className="text-xs font-medium text-zinc-500 transition hover:text-zinc-900 dark:hover:text-zinc-100"
          >
            Edit
          </button>
          {!isOp && (
            <form action={deletePost}>
              <input type="hidden" name="post_id" value={postId} />
              <DeleteButton
                variant="pill"
                title="Delete post"
                message="This permanently deletes your reply."
                confirmLabel="Delete"
                ariaLabel="Delete post"
              />
            </form>
          )}
        </div>
      )}
    </article>
  );
}
