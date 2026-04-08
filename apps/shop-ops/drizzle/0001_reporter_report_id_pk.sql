DO $$
BEGIN
  -- Add report_id if missing (new primary key)
  IF NOT EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reporter'
      AND column_name = 'report_id'
  ) THEN
    ALTER TABLE "reporter"
      ADD COLUMN "report_id" uuid DEFAULT gen_random_uuid() NOT NULL;
  END IF;

  -- Ensure member_id is text (and not nullable)
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reporter'
      AND column_name = 'member_id'
      AND data_type <> 'text'
  ) THEN
    ALTER TABLE "reporter"
      ALTER COLUMN "member_id" TYPE text USING "member_id"::text;
  END IF;

  ALTER TABLE "reporter"
    ALTER COLUMN "member_id" SET NOT NULL;

  -- If current PK is on member_id, drop it (default constraint name is reporter_pkey)
  IF EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'reporter'
      AND c.contype = 'p'
      AND c.conname = 'reporter_pkey'
  ) THEN
    ALTER TABLE "reporter" DROP CONSTRAINT "reporter_pkey";
  END IF;

  -- Add PK on report_id if none exists
  IF NOT EXISTS (
    SELECT 1
    FROM pg_constraint c
    JOIN pg_class t ON t.oid = c.conrelid
    JOIN pg_namespace n ON n.oid = t.relnamespace
    WHERE n.nspname = 'public'
      AND t.relname = 'reporter'
      AND c.contype = 'p'
  ) THEN
    ALTER TABLE "reporter" ADD CONSTRAINT "reporter_pkey" PRIMARY KEY ("report_id");
  END IF;
END
$$;

