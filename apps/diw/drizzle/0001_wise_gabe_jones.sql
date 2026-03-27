ALTER TABLE "fair_details" DISABLE ROW LEVEL SECURITY;--> statement-breakpoint
DROP TABLE "fair_details" CASCADE;--> statement-breakpoint
ALTER TABLE "time_slots" DROP COLUMN "startTime";--> statement-breakpoint
ALTER TABLE "time_slots" DROP COLUMN "endTime";--> statement-breakpoint
ALTER TABLE "time_slots" ADD COLUMN "startTime" time;--> statement-breakpoint
ALTER TABLE "time_slots" ADD COLUMN "endTime" time;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "member_id" text;--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "address" text;--> statement-breakpoint
ALTER TABLE "user" DROP COLUMN "role";--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN "fairId";--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN "startTime";--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN "endTime";--> statement-breakpoint
ALTER TABLE "shifts" DROP COLUMN "numberOfVolunteers";--> statement-breakpoint
ALTER TABLE "user" ADD CONSTRAINT "user_member_id_unique" UNIQUE("member_id");