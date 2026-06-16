import Link from "next/link";
import Avatar from "@/app/ui/avatar";
import FollowButton from "@/app/ui/follow-button";

// A followable person row: avatar + name (linked to their profile) + a
// follow/unfollow button. Used in the feed suggestions, people search, and the
// profile follow lists. Renders an <li>, so place it inside a <ul>.
export default function UserRow({
  id,
  name,
  avatarUrl,
  initialFollowing,
  className = "",
}: {
  id: number;
  name: string;
  avatarUrl: string | null;
  initialFollowing: boolean;
  className?: string;
}) {
  return (
    <li className={`flex items-center justify-between gap-3 ${className}`}>
      <Link
        href={`/users/${id}`}
        className="flex min-w-0 items-center gap-2 text-sm font-medium text-zinc-900 hover:underline dark:text-zinc-100"
      >
        <Avatar name={name} src={avatarUrl} size={28} />
        <span className="truncate">{name}</span>
      </Link>
      <FollowButton followeeId={id} initialFollowing={initialFollowing} />
    </li>
  );
}
