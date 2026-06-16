# Social Feed Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a time-ordered social feed (short statuses + climbing ascents) scoped to people you follow, with public profiles, likes, and flat comments.

**Architecture:** New `statuses`/`follows`/`likes`/`comments` tables plus a new `'status'` image entity type. The feed is built at read time in `lib/feed.ts` by querying statuses + ascents from `{followed users} ∪ {self}`, merging and sorting by `created_at` desc in JS, then batch-loading like/comment counts. RSC pages (`/feed`, `/users/[userId]`) render a shared `feed-item` component; client components handle compose/follow/like/comment via `"use server"` actions.

**Tech Stack:** Next.js 16 (App Router, RSC), React 19, TypeScript, Kysely + Postgres, Vercel Blob, Tailwind v4.

> **Project conventions (read first):** This plan **introduces Vitest** (Phase 0) — unit tests for pure logic and a real-Postgres integration harness for actions/queries. After Phase 0, work **test-first** where a task lists tests: write the failing test, watch it fail, implement, watch it pass, commit. Verification for every task is `npm run test` (unit), the relevant `npm run test:integration` when present, `npm run lint`, and `npm run build` (runs migrations + typecheck); plus manual `npm run dev` for UI. Prettier owns formatting (`npm run format`). Follow existing patterns in `app/actions/index.ts`, `app/ui/`, and `migrations/`.

> **Branch:** Work happens on the `social-feed` branch (already created). Commit after each task.

---

## File map

**Created (test setup — Phase 0):**
- `vitest.config.ts` — unit-test config (node env, excludes integration)
- `vitest.integration.config.ts` — integration config (test DB, serial)
- `test/integration/setup-global.ts` — migrate the test DB once before the suite
- `test/integration/db.ts` — `resetDb()` (truncate + reseed fixtures) + fixture helpers
- `lib/time-ago.test.ts`, `lib/feed.test.ts` — unit tests
- `test/integration/follows.int.test.ts`, `statuses-feed.int.test.ts`, `likes-comments.int.test.ts`

**Created:**
- `migrations/2026-06-16T10-00-00_create_social_feed.ts` — 4 new tables + `images` CHECK update
- `lib/time-ago.ts` — relative-time formatter (pure)
- `lib/feed.ts` — `FeedItem` type + `buildFeed` / `buildProfileTimeline` / `suggestedUsers`; pure `shapeAndSortFeed` helper (unit-tested)
- `app/ui/time-ago.tsx` — `<TimeAgo>` client component
- `app/ui/follow-button.tsx` — client Follow/Unfollow toggle
- `app/ui/feed-item.tsx` — renders one status/ascent
- `app/ui/status-composer.tsx` — two-step compose dialog (text+crag → photos)
- `app/ui/like-button.tsx` — client like toggle
- `app/ui/comment-list.tsx` — comments + add-comment form
- `app/feed/page.tsx` — the feed page
- `app/users/[userId]/page.tsx` — public profile

**Modified:**
- `lib/db.ts` — new table interfaces, `FeedTargetType`, extend `ImageEntityType`
- `app/actions/index.ts` — status/follow/like/comment actions; extend `deleteAscent`
- `app/ui/header-nav.tsx` — add "Feed" nav link (desktop + mobile)
- `app/forum/page.tsx` + `app/ui/entity-reviews.tsx` — link author names to `/users/[id]`

---

# Phase 0 — Testing setup (Vitest: unit + DB integration)

### Task 0a: Vitest + unit config

**Files:**
- Modify: `package.json`
- Create: `vitest.config.ts`
- Create: `lib/time-ago.test.ts` (placeholder, fleshed out in Task 2)

- [ ] **Step 1: Install Vitest**

Run: `npm install -D vitest @vitejs/plugin-react vite-tsconfig-paths`
Expected: added to `devDependencies`. (`vite-tsconfig-paths` makes the `@/` alias
resolve in tests; `@vitejs/plugin-react` supports JSX/TSX component tests later.)

- [ ] **Step 2: Add test scripts to `package.json`**

Add to the `"scripts"` block:

```json
    "test": "vitest run --config vitest.config.ts",
    "test:watch": "vitest --config vitest.config.ts",
    "test:integration": "vitest run --config vitest.integration.config.ts"
```

- [ ] **Step 3: Write `vitest.config.ts`**

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Unit tests only: pure logic, no database. Integration tests live under
// test/integration and run via vitest.integration.config.ts.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["lib/**/*.test.ts", "app/**/*.test.ts"],
    exclude: ["test/integration/**", "node_modules/**"],
  },
});
```

- [ ] **Step 4: Smoke test**

Create `lib/time-ago.test.ts`:

```ts
import { describe, it, expect } from "vitest";

describe("vitest", () => {
  it("runs", () => {
    expect(1 + 1).toBe(2);
  });
});
```

Run: `npm run test`
Expected: 1 passing test.

- [ ] **Step 5: Commit**

```bash
git add package.json package-lock.json vitest.config.ts lib/time-ago.test.ts
git commit -m "Add Vitest with a unit-test config"
```

---

### Task 0b: Integration harness (real Postgres)

**Files:**
- Create: `vitest.integration.config.ts`
- Create: `test/integration/setup-global.ts`
- Create: `test/integration/db.ts`
- Modify: `.env.example` (document `TEST_DATABASE_URL`)

> Integration tests run against a **separate** Postgres database so they never
> touch dev data. The harness reuses the project's migrations to build the
> schema, then truncates + reseeds reference data between tests.

- [ ] **Step 1: Document the test DB env var**

Add to `.env.example`:

```
# Separate database for integration tests (its name MUST end in _test).
# Create it once:  createdb whipperbook_test
TEST_DATABASE_URL=postgresql://localhost:5432/whipperbook_test
```

- [ ] **Step 2: Write the integration Vitest config**

`vitest.integration.config.ts`:

```ts
import { defineConfig } from "vitest/config";
import tsconfigPaths from "vite-tsconfig-paths";

// Integration tests hit a real Postgres (TEST_DATABASE_URL). They share one DB,
// so run them serially in a single fork to avoid cross-test interference.
export default defineConfig({
  plugins: [tsconfigPaths()],
  test: {
    environment: "node",
    include: ["test/integration/**/*.int.test.ts"],
    globalSetup: ["test/integration/setup-global.ts"],
    fileParallelism: false,
    poolOptions: { forks: { singleFork: true } },
    hookTimeout: 60_000,
    testTimeout: 30_000,
  },
});
```

- [ ] **Step 3: Write the global setup (migrate the test DB once)**

`test/integration/setup-global.ts`:

```ts
import { execSync } from "node:child_process";

// Runs once before the integration suite: point the migrator at the test DB and
// bring it to the latest schema. Refuses to run against a DB whose name doesn't
// end in `_test`, so we can never migrate/wipe a real database by accident.
export default function setup() {
  const url = process.env.TEST_DATABASE_URL;
  if (!url) throw new Error("TEST_DATABASE_URL is not set");
  const dbName = url.split("/").pop()?.split("?")[0] ?? "";
  if (!dbName.endsWith("_test")) {
    throw new Error(
      `Refusing to run integration tests against "${dbName}" (name must end in _test)`,
    );
  }
  execSync("npm run migrate:latest", {
    stdio: "inherit",
    env: { ...process.env, DATABASE_URL: url },
  });
}
```

- [ ] **Step 4: Write the per-test DB helper**

`test/integration/db.ts`:

```ts
import { beforeAll, beforeEach } from "vitest";
import { sql } from "kysely";
import db from "@/lib/db";

// Point the app's db client at the test database for the whole file. lib/db.ts
// reads process.env.DATABASE_URL when the pool is created; set it before any
// query runs. (Vitest loads this module fresh per test file.)
beforeAll(() => {
  if (!process.env.TEST_DATABASE_URL) throw new Error("TEST_DATABASE_URL unset");
  process.env.DATABASE_URL = process.env.TEST_DATABASE_URL;
});

// Empty the mutable tables before each test. Reference data (countries,
// grading_systems, grade_equivalencies) is left intact — it's seeded by the
// migrations and the app needs it.
export async function resetDb() {
  await sql`
    TRUNCATE TABLE
      comments, likes, follows, statuses,
      entity_reviews, gear_reviews, gear_items, ascents, images,
      forum_posts, forum_topics, deletion_log,
      routes, sectors, crags, users
    RESTART IDENTITY CASCADE
  `.execute(db);
}

beforeEach(resetDb);

// --- Fixtures --------------------------------------------------------------

export async function makeUser(name = "Tester"): Promise<number> {
  const row = await db
    .insertInto("users")
    .values({ email: `${name.toLowerCase()}-${Date.now()}@x.test`, name })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

export async function makeCragWithRoute(
  createdBy: number,
): Promise<{ cragId: number; routeId: number }> {
  const crag = await db
    .insertInto("crags")
    .values({ name: `Crag ${Date.now()}`, created_by: createdBy })
    .returning("id")
    .executeTakeFirstOrThrow();
  const gs = await db
    .selectFrom("grading_systems")
    .select("id")
    .executeTakeFirstOrThrow();
  const route = await db
    .insertInto("routes")
    .values({
      name: "Test Route",
      crag_id: crag.id,
      grade: "6a",
      grading_system_id: gs.id,
      style: "sport",
      created_by: createdBy,
    })
    .returning("id")
    .executeTakeFirstOrThrow();
  return { cragId: crag.id, routeId: route.id };
}
```

> Note: actions resolve the current user via NextAuth (`auth()`), which isn't
> available in the test runner. Integration tests therefore exercise
> **`lib/feed.ts`** (which takes `db`/`viewerId` as plain args) and direct DB
> effects. Action-level auth flows stay covered by manual `dev` verification.
> Where an action's logic is worth testing in isolation, extract its pure core
> (e.g. validation) and unit-test that.

- [ ] **Step 5: Verify the harness with a trivial integration test**

Create `test/integration/follows.int.test.ts` (expanded in Task 5-int):

```ts
import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { makeUser, resetDb } from "./db";

describe("integration harness", () => {
  it("starts from an empty users table each test", async () => {
    await resetDb();
    const id = await makeUser("Alice");
    const rows = await db.selectFrom("users").selectAll().execute();
    expect(rows).toHaveLength(1);
    expect(rows[0].id).toBe(id);
  });
});
```

Run: `TEST_DATABASE_URL=postgresql://localhost:5432/whipperbook_test npm run test:integration`
(Create the DB first: `createdb whipperbook_test`.)
Expected: migrations run, then 1 passing test.

- [ ] **Step 6: Commit**

```bash
git add vitest.integration.config.ts test/integration/ .env.example
git commit -m "Add Postgres integration-test harness for Vitest"
```

---

# Phase 1 — Foundation (migration, follows, profiles)

### Task 1: Database migration + types

**Files:**
- Create: `migrations/2026-06-16T10-00-00_create_social_feed.ts`
- Modify: `lib/db.ts`

- [ ] **Step 1: Write the migration**

Create `migrations/2026-06-16T10-00-00_create_social_feed.ts`:

```ts
import { type Kysely, sql } from "kysely";

export async function up(db: Kysely<any>): Promise<void> {
  await db.schema
    .createTable("statuses")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("crag_id", "integer", (col) =>
      col.references("crags.id").onDelete("set null")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .execute();
  await db.schema
    .createIndex("statuses_created_at_idx")
    .on("statuses")
    .column("created_at")
    .execute();

  await db.schema
    .createTable("follows")
    .addColumn("follower_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("followee_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addPrimaryKeyConstraint("follows_pkey", ["follower_id", "followee_id"])
    .addCheckConstraint("follows_no_self", sql`follower_id <> followee_id`)
    .execute();
  await db.schema
    .createIndex("follows_followee_idx")
    .on("follows")
    .column("followee_id")
    .execute();

  await db.schema
    .createTable("likes")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("target_type", "text", (col) => col.notNull())
    .addColumn("target_id", "integer", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addCheckConstraint(
      "likes_target_type_check",
      sql`target_type IN ('status', 'ascent')`
    )
    .addUniqueConstraint("likes_unique", ["user_id", "target_type", "target_id"])
    .execute();
  await db.schema
    .createIndex("likes_target_idx")
    .on("likes")
    .columns(["target_type", "target_id"])
    .execute();

  await db.schema
    .createTable("comments")
    .addColumn("id", "serial", (col) => col.primaryKey())
    .addColumn("user_id", "integer", (col) =>
      col.notNull().references("users.id").onDelete("cascade")
    )
    .addColumn("target_type", "text", (col) => col.notNull())
    .addColumn("target_id", "integer", (col) => col.notNull())
    .addColumn("body", "text", (col) => col.notNull())
    .addColumn("created_at", "timestamptz", (col) =>
      col.notNull().defaultTo(sql`now()`)
    )
    .addCheckConstraint(
      "comments_target_type_check",
      sql`target_type IN ('status', 'ascent')`
    )
    .execute();
  await db.schema
    .createIndex("comments_target_idx")
    .on("comments")
    .columns(["target_type", "target_id"])
    .execute();

  // Allow status photos to reuse the images table.
  await sql`ALTER TABLE images DROP CONSTRAINT images_entity_type_check`.execute(
    db
  );
  await sql`
    ALTER TABLE images
    ADD CONSTRAINT images_entity_type_check
    CHECK (entity_type IN ('crag', 'sector', 'route', 'status'))
  `.execute(db);
}

export async function down(db: Kysely<any>): Promise<void> {
  await sql`ALTER TABLE images DROP CONSTRAINT images_entity_type_check`.execute(
    db
  );
  await sql`
    ALTER TABLE images
    ADD CONSTRAINT images_entity_type_check
    CHECK (entity_type IN ('crag', 'sector', 'route'))
  `.execute(db);
  await db.schema.dropTable("comments").execute();
  await db.schema.dropTable("likes").execute();
  await db.schema.dropTable("follows").execute();
  await db.schema.dropTable("statuses").execute();
}
```

- [ ] **Step 2: Update `lib/db.ts` types**

In `lib/db.ts`, change the `ImageEntityType` line (currently line 5) to:

```ts
export type ImageEntityType = "crag" | "sector" | "route" | "status";
```

Add after the existing type exports near the top:

```ts
export type FeedTargetType = "status" | "ascent";
```

Add these interfaces alongside the other table interfaces:

```ts
export interface StatusesTable {
  id: Generated<number>;
  user_id: number;
  body: string;
  crag_id: number | null;
  created_at: Generated<Date>;
}

export interface FollowsTable {
  follower_id: number;
  followee_id: number;
  created_at: Generated<Date>;
}

export interface LikesTable {
  id: Generated<number>;
  user_id: number;
  target_type: FeedTargetType;
  target_id: number;
  created_at: Generated<Date>;
}

export interface CommentsTable {
  id: Generated<number>;
  user_id: number;
  target_type: FeedTargetType;
  target_id: number;
  body: string;
  created_at: Generated<Date>;
}
```

Add to the `Database` interface:

```ts
  statuses: StatusesTable;
  follows: FollowsTable;
  likes: LikesTable;
  comments: CommentsTable;
```

- [ ] **Step 3: Run the migration + typecheck via build**

Run: `npm run build`
Expected: migrations apply cleanly (you'll see the new migration run), TypeScript compiles, build succeeds. If `DATABASE_URL` isn't set for local build, run `npm run migrate:latest` first, then `npm run build`.

- [ ] **Step 4: Lint**

Run: `npm run lint`
Expected: no errors in the new/changed files.

- [ ] **Step 5: Commit**

```bash
git add migrations/2026-06-16T10-00-00_create_social_feed.ts lib/db.ts
git commit -m "Add social feed tables (statuses, follows, likes, comments)"
```

---

### Task 2: Relative-time helper + component

**Files:**
- Create: `lib/time-ago.ts`
- Modify: `lib/time-ago.test.ts` (replace the Task 0a smoke test)
- Create: `app/ui/time-ago.tsx`

- [ ] **Step 1: Write the failing unit test**

Replace the contents of `lib/time-ago.test.ts` with:

```ts
import { describe, it, expect } from "vitest";
import { timeAgo } from "@/lib/time-ago";

const now = new Date("2026-06-16T12:00:00Z");
const ago = (ms: number) => new Date(now.getTime() - ms);

describe("timeAgo", () => {
  it("shows 'just now' under 45s", () => {
    expect(timeAgo(ago(10_000), now)).toBe("just now");
  });
  it("shows minutes", () => {
    expect(timeAgo(ago(5 * 60_000), now)).toBe("5m");
  });
  it("shows hours", () => {
    expect(timeAgo(ago(3 * 3_600_000), now)).toBe("3h");
  });
  it("shows days under a week", () => {
    expect(timeAgo(ago(2 * 86_400_000), now)).toBe("2d");
  });
  it("falls back to an absolute date past a week", () => {
    expect(timeAgo(ago(30 * 86_400_000), now)).toMatch(/May|2026|\d/);
  });
});
```

- [ ] **Step 2: Run it and watch it fail**

Run: `npm run test`
Expected: FAIL — `timeAgo` is not exported yet (module not found).

- [ ] **Step 3: Write `lib/time-ago.ts`**

```ts
// Compact relative time for feed timestamps: "just now", "5m", "3h", "2d".
// Past ~7 days it falls back to an absolute date. Pure so it can run on the
// server (initial render) and the client (no hydration mismatch when both are
// passed the same `now`).
export function timeAgo(date: Date, now: Date = new Date()): string {
  const seconds = Math.floor((now.getTime() - date.getTime()) / 1000);
  if (seconds < 45) return "just now";
  const minutes = Math.floor(seconds / 60);
  if (minutes < 60) return `${minutes}m`;
  const hours = Math.floor(minutes / 60);
  if (hours < 24) return `${hours}h`;
  const days = Math.floor(hours / 24);
  if (days < 7) return `${days}d`;
  return date.toLocaleDateString("en-GB", {
    day: "numeric",
    month: "short",
    year: now.getFullYear() === date.getFullYear() ? undefined : "numeric",
  });
}
```

- [ ] **Step 4: Run the test and watch it pass**

Run: `npm run test`
Expected: the 5 `timeAgo` tests pass.

- [ ] **Step 5: Write `app/ui/time-ago.tsx`**

```tsx
import { timeAgo } from "@/lib/time-ago";

// Renders relative time inside a <time> with a full-date tooltip. Server
// component: the feed is `force-dynamic`, so the server timestamp is fine and
// avoids client clock skew.
export default function TimeAgo({ date }: { date: Date }) {
  return (
    <time
      dateTime={date.toISOString()}
      title={date.toLocaleString("en-GB")}
      className="text-zinc-400"
    >
      {timeAgo(date)}
    </time>
  );
}
```

- [ ] **Step 6: Test + lint + build**

Run: `npm run test && npm run lint && npm run build`
Expected: clean.

- [ ] **Step 7: Commit**

```bash
git add lib/time-ago.ts lib/time-ago.test.ts app/ui/time-ago.tsx
git commit -m "Add timeAgo helper (TDD) and TimeAgo component"
```

---

### Task 3: Follow / unfollow actions

**Files:**
- Modify: `app/actions/index.ts` (append new actions at the end of the file)

- [ ] **Step 1: Add the actions**

Append to `app/actions/index.ts`:

```ts
export async function followUser(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const followeeId = Number(formData.get("followee_id"));
  if (!Number.isInteger(followeeId) || followeeId === userId) return;

  // Idempotent: ignore if the follow already exists.
  await db
    .insertInto("follows")
    .values({ follower_id: userId, followee_id: followeeId })
    .onConflict((oc) => oc.columns(["follower_id", "followee_id"]).doNothing())
    .execute();

  revalidatePath(`/users/${followeeId}`);
  revalidatePath("/feed");
}

export async function unfollowUser(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const followeeId = Number(formData.get("followee_id"));
  if (!Number.isInteger(followeeId)) return;

  await db
    .deleteFrom("follows")
    .where("follower_id", "=", userId)
    .where("followee_id", "=", followeeId)
    .execute();

  revalidatePath(`/users/${followeeId}`);
  revalidatePath("/feed");
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/actions/index.ts
git commit -m "Add follow/unfollow server actions"
```

---

### Task 4: Follow button component

**Files:**
- Create: `app/ui/follow-button.tsx`

- [ ] **Step 1: Write the component**

```tsx
"use client";

import { useState, useTransition } from "react";
import { followUser, unfollowUser } from "@/app/actions";

// Optimistic Follow/Unfollow toggle. `initialFollowing` comes from the server.
export default function FollowButton({
  followeeId,
  initialFollowing,
}: {
  followeeId: number;
  initialFollowing: boolean;
}) {
  const [following, setFollowing] = useState(initialFollowing);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !following;
    setFollowing(next);
    startTransition(async () => {
      const fd = new FormData();
      fd.set("followee_id", String(followeeId));
      if (next) await followUser(fd);
      else await unfollowUser(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={pending}
      className={
        following
          ? "rounded border border-zinc-300 px-3 py-1.5 text-sm font-medium text-zinc-600 transition hover:border-zinc-400 hover:text-zinc-900 disabled:opacity-50 dark:border-zinc-700 dark:text-zinc-400 dark:hover:border-zinc-500 dark:hover:text-zinc-100"
          : "rounded bg-zinc-900 px-3 py-1.5 text-sm font-medium text-white transition hover:bg-zinc-700 disabled:opacity-50 dark:bg-zinc-100 dark:text-zinc-900 dark:hover:bg-zinc-300"
      }
    >
      {following ? "Following" : "Follow"}
    </button>
  );
}
```

- [ ] **Step 2: Lint + build**

Run: `npm run lint && npm run build`
Expected: clean.

- [ ] **Step 3: Commit**

```bash
git add app/ui/follow-button.tsx
git commit -m "Add FollowButton component"
```

---

### Task 5: Public profile page (header + ascents) + author links

**Files:**
- Create: `app/users/[userId]/page.tsx`
- Modify: `app/forum/page.tsx` (link author names)
- Modify: `app/ui/entity-reviews.tsx` (link author names)

> The profile **timeline** is a simple ascents list for now; Task 11 swaps it
> for the unified statuses+ascents timeline once `lib/feed.ts` exists.

- [ ] **Step 1: Write the profile page**

Create `app/users/[userId]/page.tsx`:

```tsx
import { notFound } from "next/navigation";
import Link from "next/link";
import { auth } from "@/auth";
import db from "@/lib/db";
import FollowButton from "@/app/ui/follow-button";
import TimeAgo from "@/app/ui/time-ago";

export const dynamic = "force-dynamic";

export default async function UserProfilePage({
  params,
}: {
  params: Promise<{ userId: string }>;
}) {
  const { userId: userIdRaw } = await params;
  const profileId = Number(userIdRaw);
  if (!Number.isInteger(profileId)) notFound();

  const profile = await db
    .selectFrom("users")
    .select(["id", "name"])
    .where("id", "=", profileId)
    .executeTakeFirst();
  if (!profile) notFound();

  const session = await auth();
  const viewer = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  const [{ followers }, { following }] = await Promise.all([
    db
      .selectFrom("follows")
      .select((eb) => eb.fn.countAll<number>().as("followers"))
      .where("followee_id", "=", profileId)
      .executeTakeFirstOrThrow(),
    db
      .selectFrom("follows")
      .select((eb) => eb.fn.countAll<number>().as("following"))
      .where("follower_id", "=", profileId)
      .executeTakeFirstOrThrow(),
  ]);

  const isSelf = viewer?.id === profileId;
  let viewerFollows = false;
  if (viewer && !isSelf) {
    const row = await db
      .selectFrom("follows")
      .select("follower_id")
      .where("follower_id", "=", viewer.id)
      .where("followee_id", "=", profileId)
      .executeTakeFirst();
    viewerFollows = !!row;
  }

  const ascents = await db
    .selectFrom("ascents")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("crags", "crags.id", "routes.crag_id")
    .select([
      "ascents.id",
      "ascents.tick_type",
      "ascents.created_at",
      "routes.id as route_id",
      "routes.name as route_name",
      "routes.grade",
      "crags.id as crag_id",
      "crags.name as crag_name",
    ])
    .where("ascents.user_id", "=", profileId)
    .orderBy("ascents.created_at", "desc")
    .limit(50)
    .execute();

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">{profile.name}</h1>
          <p className="mt-1 text-sm text-zinc-500">
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {following}
            </span>{" "}
            following ·{" "}
            <span className="font-medium text-zinc-700 dark:text-zinc-300">
              {followers}
            </span>{" "}
            {followers === 1 ? "follower" : "followers"}
          </p>
        </div>
        {viewer && !isSelf && (
          <FollowButton followeeId={profileId} initialFollowing={viewerFollows} />
        )}
      </header>

      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight">Recent ascents</h2>
        {ascents.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">No ascents logged yet.</p>
        ) : (
          <ul className="mt-4 divide-y divide-zinc-200 dark:divide-zinc-800">
            {ascents.map((a) => (
              <li key={a.id} className="flex items-baseline gap-2 py-3 text-sm">
                <span className="font-medium capitalize">{a.tick_type}</span>
                <Link
                  href={`/crags/${a.crag_id}/routes/${a.route_id}`}
                  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
                >
                  {a.route_name}
                </Link>
                <span className="text-zinc-500">{a.grade}</span>
                <span className="text-zinc-400">· {a.crag_name}</span>
                <span className="ml-auto">
                  <TimeAgo date={a.created_at} />
                </span>
              </li>
            ))}
          </ul>
        )}
      </section>
    </main>
  );
}
```

- [ ] **Step 2: Link author names in the forum list**

In `app/forum/page.tsx`, the topic list renders `{topic.author}` as plain text (around line 118). Wrap it in a link. Find:

```tsx
                    {topic.author} ·{" "}
```

The author name is part of a `<Link>` covering the whole row, so adding a nested link there is invalid HTML. Instead, leave the forum list as-is for now (the row link to the topic takes priority) and link author names only where they are standalone text — see Step 3. Skip editing `forum/page.tsx` if the name sits inside the row `<Link>`.

> Rationale: don't nest `<a>` inside `<a>`. Only convert author names that are not already inside a link.

- [ ] **Step 3: Link reviewer names in entity-reviews**

Open `app/ui/entity-reviews.tsx` and find where the reviewer's name is rendered (a `<span>`/`<p>` with the author name, not inside an existing link). Replace the bare name node, e.g.:

```tsx
<span className="font-medium text-zinc-900 dark:text-zinc-100">{review.author}</span>
```

with:

```tsx
<Link
  href={`/users/${review.user_id}`}
  className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
>
  {review.author}
</Link>
```

Ensure `import Link from "next/link";` is present and that the query selecting reviews includes `user_id` and an `author` name (add `"users.id as user_id"` / `"users.name as author"` to the select if missing). If the component does not already join `users`, add `.innerJoin("users", "users.id", "entity_reviews.user_id")`.

- [ ] **Step 4: Verify in dev**

Run: `npm run dev`
Check:
- Visit `/users/1` (a real user id) — header shows name + counts; logged in as another user shows a Follow button that toggles to "Following" and persists on reload.
- `/users/999999` → 404.
- A reviewer name on a crag/route page links to their profile.

- [ ] **Step 5: Lint + build + commit**

```bash
npm run lint && npm run build
git add app/users/ app/ui/entity-reviews.tsx
git commit -m "Add public user profile page with follow + ascents; link author names"
```

---

# Phase 2 — Statuses + feed

### Task 6: Status actions (create + delete)

**Files:**
- Modify: `app/actions/index.ts`

- [ ] **Step 1: Add `STATUS_MAX_LEN` + `createStatus` + `deleteStatus`**

Append to `app/actions/index.ts`:

```ts
export const STATUS_MAX_LEN = 280;

export async function createStatus(
  formData: FormData,
): Promise<CreateResult> {
  const userId = await currentUserId();
  if (!userId) return { ok: false, error: "You must be logged in." };

  const body = String(formData.get("body") ?? "").trim();
  if (!body) return { ok: false, error: "Write something first." };
  if (body.length > STATUS_MAX_LEN)
    return { ok: false, error: `Keep it under ${STATUS_MAX_LEN} characters.` };

  const cragRaw = String(formData.get("crag_id") ?? "").trim();
  let cragId: number | null = null;
  if (cragRaw) {
    const id = Number(cragRaw);
    if (!Number.isInteger(id)) return { ok: false, error: "Invalid crag." };
    const crag = await db
      .selectFrom("crags")
      .select("id")
      .where("id", "=", id)
      .where("deleted", "=", false)
      .executeTakeFirst();
    if (!crag) return { ok: false, error: "That crag no longer exists." };
    cragId = id;
  }

  const row = await db
    .insertInto("statuses")
    .values({ user_id: userId, body, crag_id: cragId })
    .returning("id")
    .executeTakeFirstOrThrow();

  revalidatePath("/feed");
  revalidatePath(`/users/${userId}`);
  return { ok: true, id: row.id };
}

export async function deleteStatus(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const statusId = Number(formData.get("status_id"));
  if (!Number.isInteger(statusId)) return;

  const status = await db
    .selectFrom("statuses")
    .select(["id", "user_id"])
    .where("id", "=", statusId)
    .executeTakeFirst();
  if (!status) return;
  if (!canModify(user, status.user_id)) return;

  // Remove the status's photos from blob storage, then its rows + polymorphic
  // likes/comments (no FK ties those to the status).
  const photos = await db
    .selectFrom("images")
    .select(["id", "url"])
    .where("entity_type", "=", "status")
    .where("entity_id", "=", statusId)
    .execute();
  if (photos.length > 0) {
    const { del } = await import("@vercel/blob");
    await del(photos.map((p) => p.url));
    await db
      .deleteFrom("images")
      .where("entity_type", "=", "status")
      .where("entity_id", "=", statusId)
      .execute();
  }
  await db
    .deleteFrom("likes")
    .where("target_type", "=", "status")
    .where("target_id", "=", statusId)
    .execute();
  await db
    .deleteFrom("comments")
    .where("target_type", "=", "status")
    .where("target_id", "=", statusId)
    .execute();
  await db.deleteFrom("statuses").where("id", "=", statusId).execute();

  revalidatePath("/feed");
  revalidatePath(`/users/${status.user_id}`);
}
```

- [ ] **Step 2: Lint + build + commit**

```bash
npm run lint && npm run build
git add app/actions/index.ts
git commit -m "Add createStatus/deleteStatus actions"
```

---

### Task 7: Feed builder — `lib/feed.ts`

**Files:**
- Create: `lib/feed.ts`

- [ ] **Step 1: Write the feed builder**

```ts
import type { Kysely } from "kysely";
import { sql } from "kysely";
import type { Database, TickType } from "@/lib/db";

export type FeedAuthor = { id: number; name: string };
export type FeedPhoto = { id: number; url: string; uploaded_by: number | null };

type FeedBase = {
  id: number;
  author: FeedAuthor;
  createdAt: Date;
  likeCount: number;
  likedByMe: boolean;
  commentCount: number;
};

export type FeedItem =
  | (FeedBase & {
      kind: "status";
      body: string;
      crag: { id: number; name: string } | null;
      photos: FeedPhoto[];
    })
  | (FeedBase & {
      kind: "ascent";
      tickType: TickType;
      route: { id: number; name: string; grade: string };
      crag: { id: number; name: string };
    });

export type FeedPage = { items: FeedItem[]; nextCursor: Date | null };

const PAGE_SIZE = 20;

// Pure: order feed items newest-first. Sorts a copy (no mutation) so it's easy
// to unit-test. Ties broken by id desc for determinism.
export function sortFeedNewestFirst(items: FeedItem[]): FeedItem[] {
  return [...items].sort(
    (a, b) =>
      b.createdAt.getTime() - a.createdAt.getTime() || b.id - a.id,
  );
}

// Build a feed of statuses + ascents authored by `authorIds`, newest first.
// `before` pages backwards by created_at. Returns up to PAGE_SIZE items plus a
// cursor (the oldest item's createdAt) when more may exist.
async function buildFor(
  db: Kysely<Database>,
  viewerId: number | null,
  authorIds: number[],
  before: Date | null,
  limit = PAGE_SIZE,
): Promise<FeedPage> {
  if (authorIds.length === 0) return { items: [], nextCursor: null };

  let statusQ = db
    .selectFrom("statuses")
    .innerJoin("users", "users.id", "statuses.user_id")
    .leftJoin("crags", "crags.id", "statuses.crag_id")
    .select([
      "statuses.id",
      "statuses.body",
      "statuses.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "crags.id as crag_id",
      "crags.name as crag_name",
    ])
    .where("statuses.user_id", "in", authorIds)
    .orderBy("statuses.created_at", "desc")
    .limit(limit);
  if (before) statusQ = statusQ.where("statuses.created_at", "<", before);

  let ascentQ = db
    .selectFrom("ascents")
    .innerJoin("users", "users.id", "ascents.user_id")
    .innerJoin("routes", "routes.id", "ascents.route_id")
    .innerJoin("crags", "crags.id", "routes.crag_id")
    .select([
      "ascents.id",
      "ascents.tick_type",
      "ascents.created_at",
      "users.id as author_id",
      "users.name as author_name",
      "routes.id as route_id",
      "routes.name as route_name",
      "routes.grade",
      "crags.id as crag_id",
      "crags.name as crag_name",
    ])
    .where("ascents.user_id", "in", authorIds)
    .orderBy("ascents.created_at", "desc")
    .limit(limit);
  if (before) ascentQ = ascentQ.where("ascents.created_at", "<", before);

  const [statusRows, ascentRows] = await Promise.all([
    statusQ.execute(),
    ascentQ.execute(),
  ]);

  // Photos for the fetched statuses, in one query.
  const statusIds = statusRows.map((r) => r.id);
  const photosByStatus = new Map<number, FeedPhoto[]>();
  if (statusIds.length > 0) {
    const photos = await db
      .selectFrom("images")
      .select(["id", "url", "uploaded_by", "entity_id"])
      .where("entity_type", "=", "status")
      .where("entity_id", "in", statusIds)
      .orderBy("id")
      .execute();
    for (const p of photos) {
      const list = photosByStatus.get(p.entity_id) ?? [];
      list.push({ id: p.id, url: p.url, uploaded_by: p.uploaded_by });
      photosByStatus.set(p.entity_id, list);
    }
  }

  const merged: FeedItem[] = [
    ...statusRows.map((r): FeedItem => ({
      kind: "status",
      id: r.id,
      author: { id: r.author_id, name: r.author_name },
      createdAt: r.created_at,
      body: r.body,
      crag: r.crag_id != null ? { id: r.crag_id, name: r.crag_name! } : null,
      photos: photosByStatus.get(r.id) ?? [],
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
    })),
    ...ascentRows.map((r): FeedItem => ({
      kind: "ascent",
      id: r.id,
      author: { id: r.author_id, name: r.author_name },
      createdAt: r.created_at,
      tickType: r.tick_type,
      route: { id: r.route_id, name: r.route_name, grade: r.grade },
      crag: { id: r.crag_id, name: r.crag_name },
      likeCount: 0,
      likedByMe: false,
      commentCount: 0,
    })),
  ];

  const items = sortFeedNewestFirst(merged).slice(0, limit);

  await attachInteractions(db, viewerId, items);

  // If both source queries returned a full page, there may be more.
  const more =
    statusRows.length === limit || ascentRows.length === limit
      ? (items[items.length - 1]?.createdAt ?? null)
      : null;
  return { items, nextCursor: items.length === limit ? more : null };
}

// Batch-load like counts, liked-by-me, and comment counts for the given items.
async function attachInteractions(
  db: Kysely<Database>,
  viewerId: number | null,
  items: FeedItem[],
): Promise<void> {
  if (items.length === 0) return;
  const statusIds = items.filter((i) => i.kind === "status").map((i) => i.id);
  const ascentIds = items.filter((i) => i.kind === "ascent").map((i) => i.id);

  async function counts(table: "likes" | "comments") {
    const rows = await db
      .selectFrom(table)
      .select((eb) => [
        "target_type",
        "target_id",
        eb.fn.countAll<number>().as("n"),
      ])
      .where((eb) =>
        eb.or([
          eb.and([
            eb("target_type", "=", "status"),
            eb("target_id", "in", statusIds.length ? statusIds : [-1]),
          ]),
          eb.and([
            eb("target_type", "=", "ascent"),
            eb("target_id", "in", ascentIds.length ? ascentIds : [-1]),
          ]),
        ]),
      )
      .groupBy(["target_type", "target_id"])
      .execute();
    const map = new Map<string, number>();
    for (const r of rows) map.set(`${r.target_type}:${r.target_id}`, Number(r.n));
    return map;
  }

  const [likeCounts, commentCounts] = await Promise.all([
    counts("likes"),
    counts("comments"),
  ]);

  let likedSet = new Set<string>();
  if (viewerId !== null) {
    const liked = await db
      .selectFrom("likes")
      .select(["target_type", "target_id"])
      .where("user_id", "=", viewerId)
      .where((eb) =>
        eb.or([
          eb.and([
            eb("target_type", "=", "status"),
            eb("target_id", "in", statusIds.length ? statusIds : [-1]),
          ]),
          eb.and([
            eb("target_type", "=", "ascent"),
            eb("target_id", "in", ascentIds.length ? ascentIds : [-1]),
          ]),
        ]),
      )
      .execute();
    likedSet = new Set(liked.map((r) => `${r.target_type}:${r.target_id}`));
  }

  for (const item of items) {
    const key = `${item.kind}:${item.id}`;
    item.likeCount = likeCounts.get(key) ?? 0;
    item.commentCount = commentCounts.get(key) ?? 0;
    item.likedByMe = likedSet.has(key);
  }
}

async function followeeIds(
  db: Kysely<Database>,
  userId: number,
): Promise<number[]> {
  const rows = await db
    .selectFrom("follows")
    .select("followee_id")
    .where("follower_id", "=", userId)
    .execute();
  return rows.map((r) => r.followee_id);
}

// The home feed: people you follow + yourself.
export async function buildFeed(
  db: Kysely<Database>,
  viewerId: number,
  before: Date | null = null,
): Promise<FeedPage> {
  const ids = [...new Set([...(await followeeIds(db, viewerId)), viewerId])];
  return buildFor(db, viewerId, ids, before);
}

// A single user's timeline (for their profile page).
export async function buildProfileTimeline(
  db: Kysely<Database>,
  viewerId: number | null,
  profileId: number,
  before: Date | null = null,
): Promise<FeedPage> {
  return buildFor(db, viewerId, [profileId], before);
}

// A few users to suggest following: most-followed, excluding the viewer and
// anyone they already follow. Used on the empty feed.
export async function suggestedUsers(
  db: Kysely<Database>,
  viewerId: number,
  limit = 5,
): Promise<{ id: number; name: string; followers: number }[]> {
  const exclude = [...(await followeeIds(db, viewerId)), viewerId];
  const rows = await db
    .selectFrom("users")
    .leftJoin("follows", "follows.followee_id", "users.id")
    .select((eb) => [
      "users.id",
      "users.name",
      eb.fn.count<number>("follows.follower_id").as("followers"),
    ])
    .where("users.id", "not in", exclude)
    .groupBy(["users.id", "users.name"])
    .orderBy(sql`count(follows.follower_id)`, "desc")
    .orderBy("users.id", "desc")
    .limit(limit)
    .execute();
  return rows.map((r) => ({
    id: r.id,
    name: r.name,
    followers: Number(r.followers),
  }));
}
```

- [ ] **Step 2: Unit-test the pure sort (`lib/feed.test.ts`)**

```ts
import { describe, it, expect } from "vitest";
import { sortFeedNewestFirst, type FeedItem } from "@/lib/feed";

function status(id: number, iso: string): FeedItem {
  return {
    kind: "status",
    id,
    author: { id: 1, name: "A" },
    createdAt: new Date(iso),
    body: "x",
    crag: null,
    photos: [],
    likeCount: 0,
    likedByMe: false,
    commentCount: 0,
  };
}

describe("sortFeedNewestFirst", () => {
  it("orders newest first and does not mutate the input", () => {
    const input = [
      status(1, "2026-06-01T00:00:00Z"),
      status(2, "2026-06-03T00:00:00Z"),
      status(3, "2026-06-02T00:00:00Z"),
    ];
    const out = sortFeedNewestFirst(input);
    expect(out.map((i) => i.id)).toEqual([2, 3, 1]);
    expect(input.map((i) => i.id)).toEqual([1, 2, 3]); // unchanged
  });
});
```

Run: `npm run test`
Expected: `sortFeedNewestFirst` tests pass (plus `timeAgo` from Task 2).

- [ ] **Step 3: Integration-test `buildFeed` scope + ordering**

Create `test/integration/statuses-feed.int.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { makeUser } from "./db";

describe("buildFeed", () => {
  it("includes followees + self, excludes non-followed, newest first", async () => {
    const me = await makeUser("Me");
    const friend = await makeUser("Friend");
    const stranger = await makeUser("Stranger");

    await db
      .insertInto("follows")
      .values({ follower_id: me, followee_id: friend })
      .execute();

    // Insert statuses with controlled timestamps (oldest → newest).
    const mk = async (userId: number, body: string, iso: string) =>
      db
        .insertInto("statuses")
        .values({ user_id: userId, body, crag_id: null, created_at: new Date(iso) })
        .execute();
    await mk(me, "mine", "2026-06-10T00:00:00Z");
    await mk(friend, "friend", "2026-06-11T00:00:00Z");
    await mk(stranger, "stranger", "2026-06-12T00:00:00Z");

    const { items } = await buildFeed(db, me);
    const bodies = items
      .filter((i) => i.kind === "status")
      .map((i) => (i.kind === "status" ? i.body : ""));

    expect(bodies).toEqual(["friend", "mine"]); // newest-first, no stranger
  });
});
```

Run: `TEST_DATABASE_URL=postgresql://localhost:5432/whipperbook_test npm run test:integration`
Expected: passes (the harness migrates + truncates between tests).

- [ ] **Step 4: Lint + build + commit**

```bash
npm run test && npm run lint && npm run build
git add lib/feed.ts lib/feed.test.ts test/integration/statuses-feed.int.test.ts
git commit -m "Add feed builder with unit + integration tests"
```

---

### Task 8: Feed item component

**Files:**
- Create: `app/ui/feed-item.tsx`

> Likes/comments render as **static counts** here; Task 12/13 make them
> interactive by passing extra props / children.

- [ ] **Step 1: Write the component**

```tsx
import Link from "next/link";
import type { FeedItem } from "@/lib/feed";
import TimeAgo from "@/app/ui/time-ago";
import ImageGallery from "@/app/ui/image-gallery";
import DeleteButton from "@/app/ui/delete-button";
import { deleteStatus } from "@/app/actions";

const tickVerb: Record<string, string> = {
  onsight: "Onsighted",
  flash: "Flashed",
  redpoint: "Redpointed",
  toprope: "Top-roped",
  attempt: "Tried",
};

export default function FeedItemCard({
  item,
  viewerId,
  isAdmin,
}: {
  item: FeedItem;
  viewerId: number | null;
  isAdmin: boolean;
}) {
  const canDelete =
    item.kind === "status" && (isAdmin || viewerId === item.author.id);

  return (
    <article className="rounded border border-zinc-200 bg-white p-5 dark:border-zinc-800 dark:bg-zinc-900/50">
      <div className="flex items-baseline gap-2 text-sm">
        <Link
          href={`/users/${item.author.id}`}
          className="font-semibold text-zinc-900 hover:underline dark:text-zinc-100"
        >
          {item.author.name}
        </Link>
        <span className="text-zinc-400">·</span>
        <TimeAgo date={item.createdAt} />
        {canDelete && (
          <span className="ml-auto">
            <form action={deleteStatus}>
              <input type="hidden" name="status_id" value={item.id} />
              <DeleteButton
                variant="icon"
                title="Delete status?"
                message="This permanently removes your post. This can't be undone."
                confirmLabel="Delete"
                ariaLabel="Delete status"
              />
            </form>
          </span>
        )}
      </div>

      {item.kind === "status" ? (
        <>
          <p className="mt-2 whitespace-pre-wrap text-zinc-800 dark:text-zinc-200">
            {item.body}
          </p>
          {item.crag && (
            <Link
              href={`/crags/${item.crag.id}`}
              className="mt-2 inline-block text-sm text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
            >
              📍 {item.crag.name}
            </Link>
          )}
          {item.photos.length > 0 && (
            <ImageGallery
              images={item.photos}
              currentUserId={viewerId}
              isAdmin={isAdmin}
              entityType="status"
              entityId={item.id}
              canUpload={false}
            />
          )}
        </>
      ) : (
        <p className="mt-2 text-zinc-800 dark:text-zinc-200">
          {tickVerb[item.tickType] ?? "Climbed"}{" "}
          <Link
            href={`/crags/${item.crag.id}/routes/${item.route.id}`}
            className="font-medium hover:underline"
          >
            {item.route.name}
          </Link>{" "}
          <span className="text-zinc-500">{item.route.grade}</span>{" "}
          <span className="text-zinc-400">at</span>{" "}
          <Link
            href={`/crags/${item.crag.id}`}
            className="hover:underline"
          >
            {item.crag.name}
          </Link>
        </p>
      )}

      <div className="mt-3 flex items-center gap-4 text-sm text-zinc-500">
        <span>♥ {item.likeCount}</span>
        <span>💬 {item.commentCount}</span>
      </div>
    </article>
  );
}
```

- [ ] **Step 2: Lint + build + commit**

```bash
npm run lint && npm run build
git add app/ui/feed-item.tsx
git commit -m "Add FeedItem card component"
```

---

### Task 9: Status composer

**Files:**
- Create: `app/ui/status-composer.tsx`

- [ ] **Step 1: Write the composer**

Reuses the existing two-step `CreateModal` (info → photos). Step 1 = text +
optional crag; step 2 = up to 5 photos via `ImageUpload`.

```tsx
"use client";

import { useState } from "react";
import CreateModal from "@/app/ui/create-modal";
import ImageUpload from "@/app/ui/image-upload";
import ImageGallery from "@/app/ui/image-gallery";
import Select from "@/app/ui/select";
import { createStatus, STATUS_MAX_LEN } from "@/app/actions";
import { inputClass } from "@/app/ui/style";

type Crag = { id: number; name: string };
type Photo = { id: number; url: string; uploaded_by: number | null };

export default function StatusComposer({
  crags,
  viewerId,
}: {
  crags: Crag[];
  viewerId: number;
}) {
  const [text, setText] = useState("");
  const remaining = STATUS_MAX_LEN - text.length;

  return (
    <CreateModal
      triggerLabel="Post status"
      title="Post a status"
      subtitle="Share what's on your mind. Add photos and tag a crag (optional)."
      action={createStatus}
      canSubmit={text.trim().length > 0 && remaining >= 0}
      submitLabel="Post"
      doneHref={() => "/feed"}
      renderStep2={(id) => (
        <Step2Photos statusId={id} viewerId={viewerId} />
      )}
    >
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Status
        </span>
        <textarea
          name="body"
          value={text}
          onChange={(e) => setText(e.target.value)}
          rows={3}
          maxLength={STATUS_MAX_LEN}
          placeholder="Sent my first 7a today!! 🙌"
          className={inputClass}
        />
        <span
          className={`mt-1 block text-right text-xs ${
            remaining < 0 ? "text-red-500" : "text-zinc-400"
          }`}
        >
          {remaining}
        </span>
      </label>
      <label>
        <span className="mb-1 block text-xs font-medium text-zinc-600 dark:text-zinc-400">
          Crag (optional)
        </span>
        <Select name="crag_id" defaultValue="">
          <option value="">—</option>
          {crags.map((c) => (
            <option key={c.id} value={c.id}>
              {c.name}
            </option>
          ))}
        </Select>
      </label>
    </CreateModal>
  );
}

// Step 2: up to 5 photos. Hides the upload tile once 5 are attached.
function Step2Photos({
  statusId,
  viewerId,
}: {
  statusId: number;
  viewerId: number;
}) {
  // Photos uploaded during this session aren't reflected here without a
  // refresh; the gallery on /feed shows them after "Done". We cap by counting
  // the gallery's current images via a key the upload increments.
  return (
    <div>
      <p className="text-sm font-medium">Add photos (up to 5)</p>
      <div className="mt-2">
        <ImageUpload entityType="status" entityId={statusId} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Add a few, then press “Done →”. <PhotoCap statusId={statusId} viewerId={viewerId} />
      </p>
    </div>
  );
}

// Lightweight placeholder kept intentionally simple: the 5-photo cap is also
// enforced server-side in saveImage (see Task 9, Step 2).
function PhotoCap({ statusId, viewerId }: { statusId: number; viewerId: number }) {
  void statusId;
  void viewerId;
  return null;
}

// Avoid an unused import error if ImageGallery isn't used in this file build.
void ImageGallery;
```

> Note: the `void ImageGallery` line above is a stopgap. Replace the
> `Step2Photos`/`PhotoCap` block with the cleaner version below if you prefer no
> placeholder — but the cap MUST be enforced server-side regardless (Step 2).

- [ ] **Step 2: Enforce the 5-photo cap server-side in `saveImage`**

The composer can't reliably count photos client-side mid-session, so enforce the
cap in the action. In `app/actions/index.ts`, modify `saveImage` to reject a 6th
status photo. Replace the body of `saveImage` with:

```ts
export async function saveImage(
  url: string,
  entityType: ImageEntityType,
  entityId: number,
) {
  const userId = await currentUserId();
  if (!userId) return;

  // Statuses are capped at 5 photos.
  if (entityType === "status") {
    const { count } = await db
      .selectFrom("images")
      .select((eb) => eb.fn.countAll<number>().as("count"))
      .where("entity_type", "=", "status")
      .where("entity_id", "=", entityId)
      .executeTakeFirstOrThrow();
    if (Number(count) >= 5) return;
  }

  await db
    .insertInto("images")
    .values({
      entity_type: entityType,
      entity_id: entityId,
      url,
      uploaded_by: userId,
    })
    .execute();

  revalidatePath("/crags", "layout");
  if (entityType === "status") revalidatePath("/feed");
}
```

- [ ] **Step 3: Simplify the composer (remove the placeholder)**

Replace the `Step2Photos`, `PhotoCap`, and `void ImageGallery` block in
`app/ui/status-composer.tsx`, and the unused `ImageGallery`/`Photo` imports,
with this final version:

```tsx
// Step 2: up to 5 photos (cap enforced server-side in saveImage).
function Step2Photos({ statusId }: { statusId: number }) {
  return (
    <div>
      <p className="text-sm font-medium">Add photos (up to 5)</p>
      <div className="mt-2">
        <ImageUpload entityType="status" entityId={statusId} />
      </div>
      <p className="mt-2 text-xs text-zinc-400">
        Add a few photos, then press “Done →”.
      </p>
    </div>
  );
}
```

And update the `renderStep2` prop to `renderStep2={(id) => <Step2Photos statusId={id} />}`,
remove the `viewerId` usage from the composer if no longer needed (keep the
`viewerId` prop only if used elsewhere — otherwise drop it and its call site
arg), and delete the now-unused `import ImageGallery` and `type Photo` lines.

- [ ] **Step 4: Lint + build + commit**

```bash
npm run lint && npm run build
git add app/ui/status-composer.tsx app/actions/index.ts
git commit -m "Add StatusComposer and cap status photos at 5"
```

---

### Task 10: Feed page + nav link

**Files:**
- Create: `app/feed/page.tsx`
- Modify: `app/ui/header-nav.tsx`

- [ ] **Step 1: Write the feed page**

```tsx
import Link from "next/link";
import { auth } from "@/auth";
import db from "@/lib/db";
import { buildFeed, suggestedUsers } from "@/lib/feed";
import FeedItemCard from "@/app/ui/feed-item";
import StatusComposer from "@/app/ui/status-composer";
import FollowButton from "@/app/ui/follow-button";
import LoginToAdd from "@/app/ui/login-to-add";

export const dynamic = "force-dynamic";

export default async function FeedPage() {
  const session = await auth();
  const viewer = session?.user?.email
    ? ((await db
        .selectFrom("users")
        .select(["id", "role"])
        .where("email", "=", session.user.email.toLowerCase())
        .executeTakeFirst()) ?? null)
    : null;

  if (!viewer) {
    return (
      <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
        <h1 className="text-4xl font-bold tracking-tight">Feed</h1>
        <div className="mt-8 border border-dashed border-zinc-300 py-16 text-center dark:border-zinc-700">
          <p className="font-medium">Follow climbers and see their activity.</p>
          <p className="mx-auto mt-2 max-w-md text-sm text-zinc-500">
            <LoginToAdd to="to post statuses and follow people" />
          </p>
        </div>
      </main>
    );
  }

  const isAdmin = viewer.role === "admin";
  const [{ items }, crags] = await Promise.all([
    buildFeed(db, viewer.id),
    db
      .selectFrom("crags")
      .select(["id", "name"])
      .where("deleted", "=", false)
      .orderBy("name")
      .execute(),
  ]);

  return (
    <main className="mx-auto w-full max-w-2xl flex-1 px-6 py-12">
      <header className="flex flex-wrap items-center justify-between gap-4">
        <h1 className="text-4xl font-bold tracking-tight">Feed</h1>
        <StatusComposer crags={crags} viewerId={viewer.id} />
      </header>

      {items.length === 0 ? (
        <FeedEmptyState viewerId={viewer.id} />
      ) : (
        <div className="mt-8 space-y-4">
          {items.map((item) => (
            <FeedItemCard
              key={`${item.kind}:${item.id}`}
              item={item}
              viewerId={viewer.id}
              isAdmin={isAdmin}
            />
          ))}
        </div>
      )}
    </main>
  );
}

async function FeedEmptyState({ viewerId }: { viewerId: number }) {
  const suggestions = await suggestedUsers(db, viewerId);
  return (
    <div className="mt-8 border border-dashed border-zinc-300 p-8 text-center dark:border-zinc-700">
      <p className="font-medium">Your feed is empty.</p>
      <p className="mt-1 text-sm text-zinc-500">
        Follow some climbers to see their statuses and ascents here.
      </p>
      {suggestions.length > 0 && (
        <ul className="mx-auto mt-6 max-w-sm space-y-3 text-left">
          {suggestions.map((u) => (
            <li key={u.id} className="flex items-center justify-between gap-3">
              <Link
                href={`/users/${u.id}`}
                className="font-medium text-zinc-900 hover:underline dark:text-zinc-100"
              >
                {u.name}
              </Link>
              <FollowButton followeeId={u.id} initialFollowing={false} />
            </li>
          ))}
        </ul>
      )}
    </div>
  );
}
```

- [ ] **Step 2: Add the "Feed" nav link**

In `app/ui/header-nav.tsx`, add a Feed link to the desktop nav, right after the
`Crags` link (around line 29):

```tsx
        <Link href="/feed" className={linkCls}>
          Feed
        </Link>
```

And to the mobile panel, right after the mobile `Crags` link (around line 170):

```tsx
            <Link href="/feed" className={mobileLinkCls}>
              Feed
            </Link>
```

- [ ] **Step 3: Verify in dev**

Run: `npm run dev`
Check:
- Logged out `/feed` → login prompt.
- Logged in `/feed` → "Post status" opens the composer; posting text (and an
  optional crag) creates an item; step 2 lets you add ≤5 photos; the new status
  appears newest-first.
- Following a user makes their statuses + ascents appear.
- Empty feed shows suggested users with working Follow buttons.

- [ ] **Step 4: Lint + build + commit**

```bash
npm run lint && npm run build
git add app/feed/ app/ui/header-nav.tsx
git commit -m "Add /feed page with composer, suggestions, and nav link"
```

---

### Task 11: Switch profile timeline to the unified feed

**Files:**
- Modify: `app/users/[userId]/page.tsx`

- [ ] **Step 1: Replace the ascents-only list with the feed timeline**

In `app/users/[userId]/page.tsx`: remove the `ascents` query and the "Recent
ascents" `<section>`. Add the import:

```tsx
import { buildProfileTimeline } from "@/lib/feed";
import FeedItemCard from "@/app/ui/feed-item";
```

Compute the timeline after resolving `viewer` (admins can delete; capture role):

```tsx
  const viewerIsAdmin = !!(session?.user?.email && viewer && (await db
    .selectFrom("users")
    .select("role")
    .where("id", "=", viewer.id)
    .executeTakeFirst())?.role === "admin");

  const { items } = await buildProfileTimeline(db, viewer?.id ?? null, profileId);
```

> Simpler: change the `viewer` select to include `role` (`.select(["id","role"])`)
> and use `viewer?.role === "admin"` instead of the extra query above. Prefer
> that — update the `viewer` query's select list accordingly.

Replace the section body with:

```tsx
      <section className="mt-10">
        <h2 className="text-lg font-bold tracking-tight">Activity</h2>
        {items.length === 0 ? (
          <p className="mt-3 text-sm text-zinc-500">Nothing here yet.</p>
        ) : (
          <div className="mt-4 space-y-4">
            {items.map((item) => (
              <FeedItemCard
                key={`${item.kind}:${item.id}`}
                item={item}
                viewerId={viewer?.id ?? null}
                isAdmin={viewer?.role === "admin"}
              />
            ))}
          </div>
        )}
      </section>
```

Remove the now-unused `TimeAgo` import if it is no longer referenced in this file.

- [ ] **Step 2: Verify in dev**

Run: `npm run dev`
Check `/users/[id]` shows the user's statuses **and** ascents merged, newest
first, with the same card styling as `/feed`.

- [ ] **Step 3: Lint + build + commit**

```bash
npm run lint && npm run build
git add "app/users/[userId]/page.tsx"
git commit -m "Use unified feed timeline on profile pages"
```

---

# Phase 3 — Likes + comments

### Task 12: Like toggle action + button

**Files:**
- Modify: `app/actions/index.ts`
- Create: `app/ui/like-button.tsx`
- Modify: `app/ui/feed-item.tsx`

- [ ] **Step 1: Add `toggleLike`**

Append to `app/actions/index.ts` (uses the `FeedTargetType` import — add it to
the existing `import db, { ... } from "@/lib/db";` list):

```ts
const feedTargetTypes: FeedTargetType[] = ["status", "ascent"];

export async function toggleLike(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const targetType = String(formData.get("target_type")) as FeedTargetType;
  const targetId = Number(formData.get("target_id"));
  if (!feedTargetTypes.includes(targetType) || !Number.isInteger(targetId))
    return;

  const existing = await db
    .selectFrom("likes")
    .select("id")
    .where("user_id", "=", userId)
    .where("target_type", "=", targetType)
    .where("target_id", "=", targetId)
    .executeTakeFirst();

  if (existing) {
    await db.deleteFrom("likes").where("id", "=", existing.id).execute();
  } else {
    await db
      .insertInto("likes")
      .values({ user_id: userId, target_type: targetType, target_id: targetId })
      .onConflict((oc) =>
        oc.columns(["user_id", "target_type", "target_id"]).doNothing(),
      )
      .execute();
  }

  revalidatePath("/feed");
}
```

Add `type FeedTargetType` to the `@/lib/db` import at the top of the file.

- [ ] **Step 2: Write `app/ui/like-button.tsx`**

```tsx
"use client";

import { useState, useTransition } from "react";
import { toggleLike } from "@/app/actions";
import type { FeedTargetType } from "@/lib/db";

export default function LikeButton({
  targetType,
  targetId,
  initialLiked,
  initialCount,
  disabled,
}: {
  targetType: FeedTargetType;
  targetId: number;
  initialLiked: boolean;
  initialCount: number;
  disabled?: boolean;
}) {
  const [liked, setLiked] = useState(initialLiked);
  const [count, setCount] = useState(initialCount);
  const [pending, startTransition] = useTransition();

  function toggle() {
    const next = !liked;
    setLiked(next);
    setCount((c) => c + (next ? 1 : -1));
    startTransition(async () => {
      const fd = new FormData();
      fd.set("target_type", targetType);
      fd.set("target_id", String(targetId));
      await toggleLike(fd);
    });
  }

  return (
    <button
      type="button"
      onClick={toggle}
      disabled={disabled || pending}
      aria-pressed={liked}
      className={`inline-flex items-center gap-1 transition disabled:opacity-50 ${
        liked ? "text-red-500" : "text-zinc-500 hover:text-zinc-900 dark:hover:text-zinc-100"
      }`}
    >
      {liked ? "♥" : "♡"} {count}
    </button>
  );
}
```

- [ ] **Step 3: Wire the like button into `feed-item.tsx`**

In `app/ui/feed-item.tsx`, add the import:

```tsx
import LikeButton from "@/app/ui/like-button";
```

Replace the static like span in the footer:

```tsx
        <span>♥ {item.likeCount}</span>
```

with:

```tsx
        <LikeButton
          targetType={item.kind}
          targetId={item.id}
          initialLiked={item.likedByMe}
          initialCount={item.likeCount}
          disabled={viewerId === null}
        />
```

- [ ] **Step 4: Integration-test like counts in the feed**

Create `test/integration/likes-comments.int.test.ts`:

```ts
import { describe, it, expect } from "vitest";
import db from "@/lib/db";
import { buildFeed } from "@/lib/feed";
import { makeUser } from "./db";

async function makeStatus(userId: number): Promise<number> {
  const row = await db
    .insertInto("statuses")
    .values({ user_id: userId, body: "hi", crag_id: null })
    .returning("id")
    .executeTakeFirstOrThrow();
  return row.id;
}

describe("feed interaction counts", () => {
  it("reports likeCount and likedByMe", async () => {
    const me = await makeUser("Me");
    const other = await makeUser("Other");
    const statusId = await makeStatus(me);

    await db
      .insertInto("likes")
      .values([
        { user_id: me, target_type: "status", target_id: statusId },
        { user_id: other, target_type: "status", target_id: statusId },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status" && i.id === statusId)!;
    expect(item.likeCount).toBe(2);
    expect(item.likedByMe).toBe(true);
  });
});
```

Run: `TEST_DATABASE_URL=postgresql://localhost:5432/whipperbook_test npm run test:integration`
Expected: passes.

- [ ] **Step 5: Verify in dev + lint + build + commit**

Run: `npm run dev` — like/unlike a status and an ascent; the count updates
immediately and persists on reload.

```bash
npm run test && npm run lint && npm run build
git add app/actions/index.ts app/ui/like-button.tsx app/ui/feed-item.tsx test/integration/likes-comments.int.test.ts
git commit -m "Add likes (toggleLike action + LikeButton) with feed-count test"
```

---

### Task 13: Comments

**Files:**
- Modify: `app/actions/index.ts`
- Create: `app/ui/comment-list.tsx`
- Modify: `app/ui/feed-item.tsx`

- [ ] **Step 1: Add `addComment` + `deleteComment` + a loader**

Append to `app/actions/index.ts`:

```ts
export async function addComment(formData: FormData) {
  const userId = await currentUserId();
  if (userId === null) return;

  const targetType = String(formData.get("target_type")) as FeedTargetType;
  const targetId = Number(formData.get("target_id"));
  const body = String(formData.get("body") ?? "").trim();
  if (
    !feedTargetTypes.includes(targetType) ||
    !Number.isInteger(targetId) ||
    !body
  )
    return;

  await db
    .insertInto("comments")
    .values({ user_id: userId, target_type: targetType, target_id: targetId, body })
    .execute();

  revalidatePath("/feed");
}

export async function deleteComment(formData: FormData) {
  const user = await currentUserFull();
  if (!user) return;

  const commentId = Number(formData.get("comment_id"));
  if (!Number.isInteger(commentId)) return;

  const comment = await db
    .selectFrom("comments")
    .select(["id", "user_id"])
    .where("id", "=", commentId)
    .executeTakeFirst();
  if (!comment || !canModify(user, comment.user_id)) return;

  await db.deleteFrom("comments").where("id", "=", commentId).execute();
  revalidatePath("/feed");
}
```

Add a comment loader to `lib/feed.ts` (so the card can fetch on demand):

```ts
export type FeedComment = {
  id: number;
  author: FeedAuthor;
  body: string;
  createdAt: Date;
};

export async function loadComments(
  db: Kysely<Database>,
  targetType: "status" | "ascent",
  targetId: number,
): Promise<FeedComment[]> {
  const rows = await db
    .selectFrom("comments")
    .innerJoin("users", "users.id", "comments.user_id")
    .select([
      "comments.id",
      "comments.body",
      "comments.created_at",
      "users.id as author_id",
      "users.name as author_name",
    ])
    .where("comments.target_type", "=", targetType)
    .where("comments.target_id", "=", targetId)
    .orderBy("comments.created_at", "asc")
    .execute();
  return rows.map((r) => ({
    id: r.id,
    author: { id: r.author_id, name: r.author_name },
    body: r.body,
    createdAt: r.created_at,
  }));
}
```

- [ ] **Step 2: Write `app/ui/comment-list.tsx`**

A client component that lazily loads comments on expand and posts new ones. It
takes already-loaded comments as a prop to keep it a server-render-friendly,
simple control.

```tsx
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
```

- [ ] **Step 3: Render comments in `feed-item.tsx`**

`FeedItemCard` is a server component, so load comments there and pass them down.
In `app/ui/feed-item.tsx` add imports:

```tsx
import db from "@/lib/db";
import { loadComments } from "@/lib/feed";
import CommentList from "@/app/ui/comment-list";
```

Make the component async and load comments when there are any:

```tsx
export default async function FeedItemCard({ item, viewerId, isAdmin }: {
  item: FeedItem;
  viewerId: number | null;
  isAdmin: boolean;
}) {
```

Before the `return`, load comments:

```tsx
  const comments =
    item.commentCount > 0
      ? (await loadComments(db, item.kind, item.id)).map((c) => ({
          id: c.id,
          authorId: c.author.id,
          authorName: c.author.name,
          body: c.body,
        }))
      : [];
```

Replace the static comment span:

```tsx
        <span>💬 {item.commentCount}</span>
```

with nothing in the footer (the count is implied by the list), and add the list
after the footer `</div>`:

```tsx
      <CommentList
        targetType={item.kind}
        targetId={item.id}
        comments={comments}
        canComment={viewerId !== null}
      />
```

> Keep the like button in the footer. `isAdmin` stays used by the delete
> affordance.

- [ ] **Step 4: Integration-test comment count + loader**

Append to `test/integration/likes-comments.int.test.ts`:

```ts
import { loadComments } from "@/lib/feed";

describe("comments", () => {
  it("reports commentCount and loads comments oldest-first", async () => {
    const me = await makeUser("Me");
    const statusId = await makeStatus(me);

    await db
      .insertInto("comments")
      .values([
        { user_id: me, target_type: "status", target_id: statusId, body: "first", created_at: new Date("2026-06-10T00:00:00Z") },
        { user_id: me, target_type: "status", target_id: statusId, body: "second", created_at: new Date("2026-06-11T00:00:00Z") },
      ])
      .execute();

    const { items } = await buildFeed(db, me);
    const item = items.find((i) => i.kind === "status" && i.id === statusId)!;
    expect(item.commentCount).toBe(2);

    const comments = await loadComments(db, "status", statusId);
    expect(comments.map((c) => c.body)).toEqual(["first", "second"]);
  });
});
```

Run: `TEST_DATABASE_URL=postgresql://localhost:5432/whipperbook_test npm run test:integration`
Expected: passes.

- [ ] **Step 5: Verify in dev + lint + build + commit**

Run: `npm run dev` — add a comment to a status and an ascent; it appears
immediately and persists; author/admin can't yet delete comments via UI (delete
action exists for future use). Confirm comment author names link to profiles.

```bash
npm run test && npm run lint && npm run build
git add app/actions/index.ts lib/feed.ts app/ui/comment-list.tsx app/ui/feed-item.tsx test/integration/likes-comments.int.test.ts
git commit -m "Add flat comments on feed items with count/loader test"
```

---

### Task 14: Clean up ascent deletion

**Files:**
- Modify: `app/actions/index.ts` (`deleteAscent`)

- [ ] **Step 1: Remove an ascent's likes/comments when it's deleted**

In `deleteAscent` (around line 211), after the `deleteFrom("ascents")` call and
before the `revalidatePath`s, add:

```ts
  await db
    .deleteFrom("likes")
    .where("target_type", "=", "ascent")
    .where("target_id", "=", ascentId)
    .execute();
  await db
    .deleteFrom("comments")
    .where("target_type", "=", "ascent")
    .where("target_id", "=", ascentId)
    .execute();
```

Also add `revalidatePath("/feed");` to the existing revalidations.

- [ ] **Step 2: Lint + build + commit**

```bash
npm run lint && npm run build
git add app/actions/index.ts
git commit -m "Drop an ascent's likes/comments when it is deleted"
```

---

## Self-review notes

- **Spec coverage:** statuses (T6/T9), photos≤5 (T9), crag link (T6/T9),
  ascents in feed (T7/T8), follows (T3/T4), public profiles (T5/T11), feed
  scope = follows∪self (T7 `buildFeed`), newest-first (T7 sort), likes (T12),
  comments (T13), discovery via suggested users (T10), `images` `'status'` type
  (T1), `deleteAscent` cleanup (T14). All spec sections map to a task.
- **Migration safety:** the only existing-data change is swapping the `images`
  CHECK constraint, reversed in `down`.
- **No FK for polymorphic likes/comments** (matches `images`/`entity_reviews`);
  cascade-on-delete is handled in `deleteStatus` (T6) and `deleteAscent` (T14).
- **Type consistency:** `FeedItem.kind` values (`"status"`/`"ascent"`) equal
  `FeedTargetType`, so `targetType={item.kind}` typechecks in T12/T13.
- **Testing:** Vitest set up in Phase 0 (unit config + Postgres integration
  harness). Unit tests cover the pure logic (`timeAgo`, `sortFeedNewestFirst`);
  integration tests cover `buildFeed` scope/ordering and the feed's
  like/comment counts + `loadComments` against a real `*_test` database.
  Auth-gated actions (which call NextAuth `auth()`) stay verified via manual
  `dev`, as the harness can't impersonate a session — their testable logic is
  exercised through `lib/feed.ts`.
