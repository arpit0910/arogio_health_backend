CREATE TABLE "cycle_entries" (
	"user_id" uuid NOT NULL,
	"day" date NOT NULL,
	"flow" text NOT NULL,
	"symptoms" jsonb NOT NULL,
	"mood" text,
	"notes" text DEFAULT '' NOT NULL,
	CONSTRAINT "cycle_entries_user_id_day_pk" PRIMARY KEY("user_id","day"),
	CONSTRAINT "cycle_flow_values" CHECK ("cycle_entries"."flow" in ('none', 'spotting', 'light', 'medium', 'heavy'))
);
--> statement-breakpoint
CREATE TABLE "cycle_periods" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"start_date" date NOT NULL,
	"end_date" date,
	CONSTRAINT "period_date_order" CHECK ("cycle_periods"."end_date" is null or "cycle_periods"."end_date" >= "cycle_periods"."start_date")
);
--> statement-breakpoint
CREATE TABLE "water_logs" (
	"id" uuid PRIMARY KEY NOT NULL,
	"user_id" uuid NOT NULL,
	"amount_ml" integer NOT NULL,
	"logged_at" timestamp with time zone NOT NULL,
	"day" date NOT NULL,
	"target_ml" integer NOT NULL,
	"task_id" text,
	CONSTRAINT "water_log_amount_range" CHECK ("water_logs"."amount_ml" between 1 and 3000)
);
--> statement-breakpoint
CREATE TABLE "water_task_states" (
	"user_id" uuid NOT NULL,
	"task_id" text NOT NULL,
	"day" date NOT NULL,
	"status" text NOT NULL,
	"snoozed_until" timestamp with time zone,
	CONSTRAINT "water_task_states_user_id_task_id_pk" PRIMARY KEY("user_id","task_id"),
	CONSTRAINT "water_task_status" CHECK ("water_task_states"."status" in ('pending', 'skipped'))
);
--> statement-breakpoint
CREATE TABLE "wellness_settings" (
	"user_id" uuid PRIMARY KEY NOT NULL,
	"water_plan" jsonb,
	"cycle_settings" jsonb,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "cycle_entries" ADD CONSTRAINT "cycle_entries_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "cycle_periods" ADD CONSTRAINT "cycle_periods_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_logs" ADD CONSTRAINT "water_logs_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "water_task_states" ADD CONSTRAINT "water_task_states_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "wellness_settings" ADD CONSTRAINT "wellness_settings_user_id_users_id_fk" FOREIGN KEY ("user_id") REFERENCES "public"."users"("id") ON DELETE cascade ON UPDATE no action;--> statement-breakpoint
CREATE INDEX "cycle_periods_user_start" ON "cycle_periods" USING btree ("user_id","start_date");--> statement-breakpoint
CREATE INDEX "water_logs_user_day" ON "water_logs" USING btree ("user_id","day");--> statement-breakpoint
CREATE UNIQUE INDEX "water_logs_task_once" ON "water_logs" USING btree ("user_id","task_id");--> statement-breakpoint
CREATE INDEX "water_tasks_user_day" ON "water_task_states" USING btree ("user_id","day");