-- Migrate diw off its embedded Better-Auth schema onto the shared auth app.
-- Identity (user/session/account/verification) and the temp member tables
-- (admin_users, membership) move to apps/auth. Registrations are re-keyed by
-- ProClass memberId with denormalized name/email, so existing rows can't be
-- mapped to the new model and must be cleared. Other setup data
-- (fair_details, roles, slots, user_settings) is preserved.

-- Clear existing registrations: rows reference user.id which is going away,
-- and the new NOT NULL columns can't be backfilled.
DELETE FROM "registrations";--> statement-breakpoint

-- Drop FK constraints before dropping referenced tables. Use IF EXISTS so the
-- migration is idempotent and safe across slightly differing prod schemas.
ALTER TABLE "registrations" DROP CONSTRAINT IF EXISTS "registrations_userId_user_id_fk";--> statement-breakpoint
ALTER TABLE "user_settings" DROP CONSTRAINT IF EXISTS "user_settings_memberId_user_member_id_fk";--> statement-breakpoint

-- Drop obsolete tables. CASCADE handles any straggler FKs.
DROP TABLE IF EXISTS "account" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "session" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "verification" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "admin_users" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "membership" CASCADE;--> statement-breakpoint
DROP TABLE IF EXISTS "user" CASCADE;--> statement-breakpoint

-- Re-key registrations to ProClass memberId with denormalized name/email.
ALTER TABLE "registrations" ADD COLUMN "memberId" text NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "name" text NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" ADD COLUMN "email" text NOT NULL;--> statement-breakpoint
ALTER TABLE "registrations" DROP COLUMN "userId";
