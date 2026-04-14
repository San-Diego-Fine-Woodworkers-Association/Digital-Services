CREATE TABLE "user_settings" (
	"memberId" text PRIMARY KEY NOT NULL,
	"fairId" uuid,
	"contactValidated" boolean DEFAULT false NOT NULL
);
--> statement-breakpoint
ALTER TABLE "user" ADD COLUMN "phone" text;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_memberId_user_member_id_fk" FOREIGN KEY ("memberId") REFERENCES "public"."user"("member_id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "user_settings" ADD CONSTRAINT "user_settings_fairId_fair_details_id_fk" FOREIGN KEY ("fairId") REFERENCES "public"."fair_details"("id") ON DELETE set null ON UPDATE no action;