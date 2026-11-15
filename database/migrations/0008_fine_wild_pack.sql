ALTER TABLE "users" ADD COLUMN "referral_code" text;--> statement-breakpoint
CREATE UNIQUE INDEX "users_referral_code_unique" ON "users" USING btree ("referral_code");--> statement-breakpoint
DO $$
DECLARE account record;
BEGIN
  FOR account IN SELECT id FROM users WHERE referral_code IS NULL LOOP
    LOOP
      BEGIN
        UPDATE users SET referral_code = upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12)) WHERE id = account.id;
        EXIT;
      EXCEPTION WHEN unique_violation THEN
        -- Generate again. Existing referral codes remain unchanged.
      END;
    END LOOP;
  END LOOP;
END $$;--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "referral_code" SET DEFAULT upper(substr(replace(gen_random_uuid()::text, '-', ''), 1, 12));--> statement-breakpoint
ALTER TABLE "users" ALTER COLUMN "referral_code" SET NOT NULL;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_by_user_id" uuid;--> statement-breakpoint
ALTER TABLE "users" ADD COLUMN "referred_at" timestamp with time zone;--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referred_by_user_id_users_id_fk" FOREIGN KEY ("referred_by_user_id") REFERENCES "public"."users"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "users_referred_by_idx" ON "users" USING btree ("referred_by_user_id");--> statement-breakpoint
ALTER TABLE "users" ADD CONSTRAINT "users_referral_not_self" CHECK ("users"."referred_by_user_id" is null or "users"."referred_by_user_id" <> "users"."id");