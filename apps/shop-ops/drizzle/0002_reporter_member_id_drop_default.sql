DO $$
BEGIN
  -- If member_id still has a default (e.g. gen_random_uuid()), remove it.
  IF EXISTS (
    SELECT 1
    FROM information_schema.columns
    WHERE table_schema = 'public'
      AND table_name = 'reporter'
      AND column_name = 'member_id'
      AND column_default IS NOT NULL
  ) THEN
    ALTER TABLE "reporter" ALTER COLUMN "member_id" DROP DEFAULT;
  END IF;
END
$$;

