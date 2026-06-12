ALTER TABLE "volunteers" ADD COLUMN "groups" text[] DEFAULT '{}'::text[] NOT NULL;--> statement-breakpoint
ALTER TABLE "volunteers" ADD COLUMN "last_groups_sync_at" timestamp;