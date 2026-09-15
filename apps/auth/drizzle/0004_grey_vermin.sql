CREATE TABLE "ghl_sync_runs" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"mode" text NOT NULL,
	"status" text NOT NULL,
	"dry_run" boolean DEFAULT false NOT NULL,
	"started_at" timestamp DEFAULT now() NOT NULL,
	"finished_at" timestamp,
	"members_scanned" integer DEFAULT 0 NOT NULL,
	"contacts_upserted" integer DEFAULT 0 NOT NULL,
	"tags_added" integer DEFAULT 0 NOT NULL,
	"tags_removed" integer DEFAULT 0 NOT NULL,
	"error_message" text,
	"dry_run_output" jsonb
);
