-- Wipe all data from the Whipperbook database.
-- TRUNCATE ... RESTART IDENTITY CASCADE empties the tables, resets the id
-- sequences back to 1, and follows foreign keys so order doesn't matter.
--
-- DESTRUCTIVE: this deletes every row. There is no undo. Make sure you are
-- pointed at the right database (check your DATABASE_URL / \conninfo first).
--
-- Usage:
--   psql "$DATABASE_URL" -f scripts/wipe-db.sql

BEGIN;

-- ── Option A: full wipe (everything, including seeded reference data) ──────────
-- After this you must re-seed countries / grading_systems / grade_equivalencies
-- (e.g. re-run migrations) before the app will work again.
TRUNCATE TABLE
  entity_reviews,
  gear_reviews,
  gear_items,
  ascents,
  images,
  forum_posts,
  forum_topics,
  deletion_log,
  routes,
  sectors,
  crags,
  users,
  grade_equivalencies,
  grading_systems,
  countries
RESTART IDENTITY CASCADE;

-- ── Option B: keep reference data (countries / grading systems / equivalencies) ─
-- Comment out Option A above and uncomment this block instead to wipe only the
-- user-generated content while leaving the app immediately usable.
--
-- TRUNCATE TABLE
--   entity_reviews,
--   gear_reviews,
--   gear_items,
--   ascents,
--   images,
--   forum_posts,
--   forum_topics,
--   deletion_log,
--   routes,
--   sectors,
--   crags,
--   users
-- RESTART IDENTITY CASCADE;

COMMIT;
