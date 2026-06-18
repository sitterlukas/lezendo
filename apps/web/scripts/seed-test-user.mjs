// Creates a single ready-to-use, email-verified credentials account for local
// testing (handy for signing in from the mobile app via Expo Go).
//
// Idempotent: upserts on the email, so re-running just resets the password and
// re-verifies the account. Uses the same bcrypt cost (12) as registration.
//
// Run with: node scripts/seed-test-user.mjs

import { Pool } from "pg";
import { hash } from "bcryptjs";

try {
  process.loadEnvFile(".env.local");
} catch {}

const EMAIL = "test@whipperbook.dev";
const PASSWORD = "password123";
const NAME = "Test Climber";

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

async function main() {
  const password_hash = await hash(PASSWORD, 12);
  const {
    rows: [user],
  } = await pool.query(
    `INSERT INTO users (name, email, password_hash, email_verified_at)
     VALUES ($1, $2, $3, now())
     ON CONFLICT (email) DO UPDATE
       SET password_hash = EXCLUDED.password_hash,
           email_verified_at = now(),
           verification_token_hash = NULL,
           verification_token_expires_at = NULL
     RETURNING id, email`,
    [NAME, EMAIL, password_hash],
  );
  console.log(
    `Verified test user ready: ${user.email} / ${PASSWORD} (#${user.id})`,
  );
}

main()
  .catch((e) => {
    console.error(e);
    process.exit(1);
  })
  .finally(() => pool.end());
