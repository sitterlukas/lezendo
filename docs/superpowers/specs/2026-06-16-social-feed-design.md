# Social Feed — Design

## Summary

Add a social layer to Whipperbook: a time-ordered **feed** combining short
text **statuses** (Twitter-style) and auto-generated **ascent** activity
(Strava-style), scoped to the people a user **follows** (plus themselves).
Users discover and follow each other through new **public profile** pages.
Feed items support **likes** and flat **comments**.

The feed is always sorted by time added (`created_at`), newest first.

## Goals

- Logged-in users can post short statuses (text + up to 5 photos + an optional
  link to a crag).
- Users can follow / unfollow other climbers.
- A `/feed` page shows statuses and ascents from followed users + self, newest
  first, paginated.
- Public `/users/[userId]` profile pages show a climber's activity and a
  Follow button; author names across the app link here.
- Likes and flat comments on both statuses and ascents.

## Non-goals (v1)

- Threaded/nested comments (comments are flat, one level).
- A separate "People" directory page (discovery is handled by a suggested-users
  list on the empty feed + author-name links).
- A global/"Everyone" feed tab.
- Notifications, mentions, hashtags, reposts, editing statuses (delete only).
- Changing the marketing home page or making `/feed` the landing page.

## Decisions (from brainstorming)

| Question | Decision |
|---|---|
| Feed content | Statuses **and** ascents |
| Feed scope | People you follow **+ yourself** |
| Follow UX | **Public profiles** with a Follow/Unfollow button |
| Status content | Text (≤280 chars) + up to **5 photos** + optional **crag** link |
| Interactions | **Likes + flat comments** on statuses and ascents |
| Sort order | Always by `created_at`, newest first |

## Data model

One migration (paired `up`/`down`), following the existing Evoman/Kysely
patterns in `migrations/`.

### New tables

```
statuses
  id          serial PK
  user_id     integer NOT NULL  → users.id  ON DELETE CASCADE
  body        text NOT NULL                 (validated ≤ 280 chars in the action)
  crag_id     integer NULL      → crags.id  ON DELETE SET NULL
  created_at  timestamptz NOT NULL DEFAULT now()

follows
  follower_id integer NOT NULL  → users.id  ON DELETE CASCADE
  followee_id integer NOT NULL  → users.id  ON DELETE CASCADE
  created_at  timestamptz NOT NULL DEFAULT now()
  PRIMARY KEY (follower_id, followee_id)
  CHECK (follower_id <> followee_id)

likes
  id          serial PK
  user_id     integer NOT NULL  → users.id  ON DELETE CASCADE
  target_type text NOT NULL                 CHECK (target_type IN ('status','ascent'))
  target_id   integer NOT NULL
  created_at  timestamptz NOT NULL DEFAULT now()
  UNIQUE (user_id, target_type, target_id)

comments
  id          serial PK
  user_id     integer NOT NULL  → users.id  ON DELETE CASCADE
  target_type text NOT NULL                 CHECK (target_type IN ('status','ascent'))
  target_id   integer NOT NULL
  body        text NOT NULL
  created_at  timestamptz NOT NULL DEFAULT now()
```

### Indexes

- `statuses(created_at)`
- `follows(followee_id)` (follower side covered by the PK prefix)
- `likes(target_type, target_id)`
- `comments(target_type, target_id)`

### Existing-table change

`images.entity_type` has a CHECK constraint `IN ('crag','sector','route')`.
The migration drops and re-creates it as `IN ('crag','sector','route','status')`
(reversed in `down`). Status photos then reuse the existing `images` table and
the `image-upload` / `image-gallery` / `saveImage` / `deleteImage` machinery.

> Note: `likes`/`comments` reference `ascents` only by `(target_type='ascent',
> target_id)`, not via an FK (polymorphic, mirroring `images`/`entity_reviews`).
> Deleting an ascent should also delete its likes/comments — handled in the
> `deleteAscent` action, not the DB.

### `lib/db.ts` updates

- Add `StatusesTable`, `FollowsTable`, `LikesTable`, `CommentsTable` interfaces
  and register them in the `Database` interface.
- Add `export type FeedTargetType = "status" | "ascent";`.
- Extend `ImageEntityType` to `"crag" | "sector" | "route" | "status"`.

## Feed query — `lib/feed.ts`

A discriminated union describing a rendered item:

```ts
type FeedItem =
  | { kind: "status"; id; author: {id,name}; createdAt; body; crag?: {id,name};
      photos: {id,url,uploaded_by}[]; likeCount; likedByMe; commentCount }
  | { kind: "ascent"; id; author: {id,name}; createdAt; tickType;
      route: {id,name,grade,gradingSystemId}; crag: {id,name};
      likeCount; likedByMe; commentCount };
```

`buildFeed(db, viewerId, { limit, before? })`:

1. Resolve `authorIds = followeeIds(viewerId) ∪ [viewerId]`.
2. Query newest `statuses` and newest `ascents` (joined `ascents → routes →
   crags`) where `author ∈ authorIds` and `created_at < before` (when paging),
   each capped at `limit`.
3. Merge both lists in JS, sort by `createdAt` desc, slice to `limit`.
4. Batch-load `likeCount`, `likedByMe`, `commentCount` for the sliced items in
   grouped queries keyed by `(target_type, target_id)` — no N+1.
5. Attach status photos from `images` (`entity_type='status'`) in one batched
   query.

A single-author variant (`buildProfileTimeline(db, viewerId, profileUserId,
opts)`) powers the profile page, reusing the same item shaping and batch loads.

Pagination cursor is the oldest `createdAt` currently shown; "Load more"
re-queries with `before = cursor`.

## Pages

### `/feed` (RSC, `force-dynamic`)

- **Logged out:** a prompt to log in (gear-style `LoginToAdd` text / empty
  state), no composer.
- **Logged in:** `status-composer` at the top, then the feed list (newest
  first) with a "Load more" control.
- **Empty feed** (user follows nobody / no activity yet): a "Find climbers to
  follow" empty state listing a few **suggested users** (e.g. most recently
  active / most followed), each with a `follow-button`. This is the primary
  discovery surface for new users.

### `/users/[userId]` (RSC, `force-dynamic`)

- Header: name, **following** / **followers** counts, and a `follow-button`
  (shown only when logged in and not viewing self).
- Body: that user's status + ascent timeline (newest first), same `feed-item`
  rendering.
- 404 when the id doesn't resolve to a user.

### `header-nav.tsx`

- Add a **Feed** link to the primary nav (visible to everyone; logged-out users
  who click through get the login prompt). Mirror the existing nav-link markup
  in both the desktop and mobile variants.

## Components (`app/ui/`)

- **`status-composer.tsx`** (client): textarea with a live character counter
  (≤280), an optional crag `Select`, and photo uploads. Reuses the two-step
  `create-modal` / `create-modals` flow (info → photos) so up to **5** photos
  attach after the status is created. Caps at 5.
- **`feed-item.tsx`**: renders a `FeedItem` of either kind uniformly — author
  link (`/users/[id]`), `time-ago`, the body (status) or activity line
  ("Redpointed *Route* 8a at *Crag*" for ascents), photo gallery, crag link,
  `like-button`, comment count, and comments. Author's own statuses get a
  `DeleteButton`.
- **`like-button.tsx`** (client): optimistic toggle calling `toggleLike`.
- **`comment-list.tsx`** + **`comment-form.tsx`**: flat comments; each comment
  links its author and shows a `DeleteButton` for the author/admin.
- **`follow-button.tsx`** (client): optimistic Follow / Unfollow calling
  `followUser` / `unfollowUser`.
- **`time-ago.tsx`** + **`lib/time-ago.ts`**: relative time ("2h ago", "3d
  ago"), falling back to an absolute date past a threshold.
- Reuse: `Modal`, `DeleteButton`/`ConfirmSubmit`, `image-upload`,
  `image-gallery`, `Select`, `LoginToAdd`, `style.ts` tokens.

## Server actions (`app/actions/index.ts`)

All `"use server"`, take `FormData`, validate, mutate via Kysely, then
`revalidatePath`.

- `createStatus(formData)` — require auth; validate `body` (1–280, trimmed);
  optional `crag_id` (must exist & not soft-deleted); insert; return the new id
  for the photo step. Revalidate `/feed`, `/users/[me]`.
- `deleteStatus(formData)` — author or admin; delete the status and its
  `images` (`entity_type='status'`), `likes`, and `comments`.
- `followUser(formData)` / `unfollowUser(formData)` — require auth; reject
  self-follow; insert/delete the `follows` row (idempotent). Revalidate the
  target profile and `/feed`.
- `toggleLike(formData)` — require auth; `target_type` ∈ {status,ascent},
  `target_id`; insert if absent else delete (toggle).
- `addComment(formData)` — require auth; validate body; insert.
- `deleteComment(formData)` — author or admin.
- `deleteAscent` (existing) — extend to also remove its `likes`/`comments`.

## Edge cases

- Self-follow rejected in the action and by the DB CHECK.
- Duplicate likes prevented by the UNIQUE constraint; the action toggles.
- Deleting a status cascades to its photos/likes/comments (action-driven for
  the polymorphic rows; FKs cover user deletion).
- A status whose crag was soft-deleted hides the crag link.
- Likes are allowed on one's own items (no restriction).
- All content is public; no per-user privacy controls in v1.

## Testing & verification

The repo has no automated test framework (pragmatic by design). Verify with:

- `npm run lint` and `npm run format` clean.
- `npm run build` (runs migrations + typecheck + build) succeeds.
- Manual `npm run dev`: post a status with photos + a crag link, follow/unfollow
  a user, confirm feed ordering and scoping, like/comment, and check the empty
  feed + suggested-users state. Seed a couple of statuses/follows for a logged-
  out vs logged-in pass.

## Implementation phasing (for the plan)

1. **Foundation** — migration (4 tables + `images` CHECK), `lib/db.ts` types,
   follow actions, `follow-button`, `/users/[userId]` profile page, author-name
   links, `time-ago`.
2. **Statuses + feed** — `statuses` actions, `status-composer`, `lib/feed.ts`,
   `feed-item`, `/feed` page (incl. empty state + suggested users), nav link.
3. **Likes + comments** — `likes`/`comments` actions, `like-button`,
   `comment-list`/`comment-form`, wire into `feed-item`, batch loads in
   `lib/feed.ts`, extend `deleteAscent`.
