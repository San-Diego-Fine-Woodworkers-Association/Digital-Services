CREATE TABLE "reporter" (
	"member_id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"email" text NOT NULL,
	"name" text NOT NULL,
	"deleted" boolean DEFAULT false NOT NULL
);
