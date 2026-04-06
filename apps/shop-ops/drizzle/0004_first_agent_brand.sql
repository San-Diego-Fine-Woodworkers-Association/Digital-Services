CREATE TABLE "tool_maintainer" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"tool_id" uuid NOT NULL,
	"maintainer_id" uuid NOT NULL
);
--> statement-breakpoint
ALTER TABLE "tool_maintainer" ADD CONSTRAINT "tool_maintainer_tool_id_tool_id_fk" FOREIGN KEY ("tool_id") REFERENCES "public"."tool"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "tool_maintainer" ADD CONSTRAINT "tool_maintainer_maintainer_id_maintainer_id_fk" FOREIGN KEY ("maintainer_id") REFERENCES "public"."maintainer"("id") ON DELETE no action ON UPDATE no action;