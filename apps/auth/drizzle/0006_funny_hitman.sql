CREATE TABLE "ghl_contact_state" (
	"email" text PRIMARY KEY NOT NULL,
	"input_hash" text NOT NULL,
	"synced_at" timestamp DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "ghl_sync_runs" ADD COLUMN "members_unchanged" integer DEFAULT 0 NOT NULL;