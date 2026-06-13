ALTER TABLE "user" RENAME COLUMN "kind" TO "account_origin";--> statement-breakpoint
UPDATE "user" SET "account_origin" = CASE
		WHEN "account_origin" = 'member' THEN 'proclass'
		WHEN "account_origin" = 'volunteer' THEN 'google'
		ELSE "account_origin"
	END;