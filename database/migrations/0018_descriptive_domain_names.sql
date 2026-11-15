-- Rename application tables and their dependent names without changing rows or columns.
ALTER TABLE "public"."users" RENAME TO "user_accounts";
--> statement-breakpoint
ALTER TABLE "public"."auth_identities" RENAME TO "authentication_identities";
--> statement-breakpoint
ALTER TABLE "public"."auth_sessions" RENAME TO "authentication_sessions";
--> statement-breakpoint
ALTER TABLE "public"."wellness_settings" RENAME TO "personal_wellness_settings";
--> statement-breakpoint
ALTER TABLE "public"."water_logs" RENAME TO "water_intake_logs";
--> statement-breakpoint
ALTER TABLE "public"."medicine_doses" RENAME TO "medicine_dose_logs";
--> statement-breakpoint
ALTER TABLE "public"."water_task_states" RENAME TO "water_reminder_states";
--> statement-breakpoint
ALTER TABLE "public"."cycle_periods" RENAME TO "menstrual_periods";
--> statement-breakpoint
ALTER TABLE "public"."cycle_entries" RENAME TO "menstrual_daily_logs";
--> statement-breakpoint
ALTER TABLE "public"."articles" RENAME TO "health_articles";
--> statement-breakpoint
ALTER TABLE "public"."article_categories" RENAME TO "health_article_categories";
--> statement-breakpoint
ALTER TABLE "public"."blood_banks" RENAME TO "blood_bank_directory_entries";
--> statement-breakpoint
ALTER TABLE "public"."care_entries" RENAME TO "care_directory_entries";
--> statement-breakpoint
ALTER TABLE "public"."care_affiliations" RENAME TO "care_provider_affiliations";
--> statement-breakpoint
ALTER TABLE "public"."care_corrections" RENAME TO "care_directory_corrections";
--> statement-breakpoint
ALTER TABLE "public"."bank_corrections" RENAME TO "blood_bank_corrections";
--> statement-breakpoint
ALTER TABLE "public"."admin_audit" RENAME TO "administration_audit_logs";
--> statement-breakpoint
ALTER TABLE "public"."meditation_content" RENAME TO "meditation_library_items";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_pkey" TO "user_accounts_pkey";
--> statement-breakpoint
ALTER INDEX "public"."users_referral_code_unique" RENAME TO "user_accounts_referral_code_unique";
--> statement-breakpoint
ALTER INDEX "public"."users_referred_by_idx" RENAME TO "user_accounts_referred_by_idx";
--> statement-breakpoint
ALTER INDEX "public"."users_email_unique" RENAME TO "user_accounts_email_unique";
--> statement-breakpoint
ALTER INDEX "public"."users_username_unique" RENAME TO "user_accounts_username_unique";
--> statement-breakpoint
ALTER INDEX "public"."users_mobile_number_unique" RENAME TO "user_accounts_mobile_number_unique";
--> statement-breakpoint
ALTER INDEX "public"."users_status_idx" RENAME TO "user_accounts_status_idx";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_referred_by_user_id_users_id_fk" TO "user_accounts_referred_by_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_referral_not_self" TO "user_accounts_referral_not_self";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_role_values" TO "user_accounts_role_values";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_height_cm_range" TO "user_accounts_height_cm_range";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_weight_kg_range" TO "user_accounts_weight_kg_range";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_height_measurement_complete" TO "user_accounts_height_measurement_complete";
--> statement-breakpoint
ALTER TABLE "public"."user_accounts" RENAME CONSTRAINT "users_weight_measurement_complete" TO "user_accounts_weight_measurement_complete";
--> statement-breakpoint
ALTER TABLE "public"."authentication_identities" RENAME CONSTRAINT "auth_identities_pkey" TO "authentication_identities_pkey";
--> statement-breakpoint
ALTER INDEX "public"."auth_identities_provider_subject_unique" RENAME TO "authentication_identities_provider_subject_unique";
--> statement-breakpoint
ALTER INDEX "public"."auth_identities_user_id_idx" RENAME TO "authentication_identities_user_id_idx";
--> statement-breakpoint
ALTER TABLE "public"."authentication_identities" RENAME CONSTRAINT "auth_identities_user_id_users_id_fk" TO "authentication_identities_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."authentication_sessions" RENAME CONSTRAINT "auth_sessions_pkey" TO "authentication_sessions_pkey";
--> statement-breakpoint
ALTER INDEX "public"."auth_sessions_token_hash_unique" RENAME TO "authentication_sessions_token_hash_unique";
--> statement-breakpoint
ALTER INDEX "public"."auth_sessions_user_id_idx" RENAME TO "authentication_sessions_user_id_idx";
--> statement-breakpoint
ALTER INDEX "public"."auth_sessions_family_id_idx" RENAME TO "authentication_sessions_family_id_idx";
--> statement-breakpoint
ALTER INDEX "public"."auth_sessions_expires_at_idx" RENAME TO "authentication_sessions_expires_at_idx";
--> statement-breakpoint
ALTER TABLE "public"."authentication_sessions" RENAME CONSTRAINT "auth_sessions_user_id_users_id_fk" TO "authentication_sessions_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."authentication_sessions" RENAME CONSTRAINT "auth_sessions_replaced_by_session_id_auth_sessions_id_fk" TO "authentication_sessions_replaced_by_session_id_authentication_sessions_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."personal_wellness_settings" RENAME CONSTRAINT "wellness_settings_pkey" TO "personal_wellness_settings_pkey";
--> statement-breakpoint
ALTER TABLE "public"."personal_wellness_settings" RENAME CONSTRAINT "wellness_settings_user_id_users_id_fk" TO "personal_wellness_settings_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."water_intake_logs" RENAME CONSTRAINT "water_logs_pkey" TO "water_intake_logs_pkey";
--> statement-breakpoint
ALTER INDEX "public"."water_logs_user_day" RENAME TO "water_intake_logs_user_day";
--> statement-breakpoint
ALTER INDEX "public"."water_logs_task_once" RENAME TO "water_intake_logs_task_once";
--> statement-breakpoint
ALTER TABLE "public"."water_intake_logs" RENAME CONSTRAINT "water_logs_user_id_users_id_fk" TO "water_intake_logs_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER INDEX "public"."medicine_doses_user_day" RENAME TO "medicine_dose_logs_user_day";
--> statement-breakpoint
ALTER TABLE "public"."medicine_dose_logs" RENAME CONSTRAINT "medicine_doses_user_id_users_id_fk" TO "medicine_dose_logs_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."medicine_dose_logs" RENAME CONSTRAINT "medicine_doses_user_id_medicine_id_day_time_pk" TO "medicine_dose_logs_user_id_medicine_id_day_time_pk";
--> statement-breakpoint
ALTER TABLE "public"."water_reminder_states" RENAME CONSTRAINT "water_task_states_user_id_users_id_fk" TO "water_reminder_states_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."water_reminder_states" RENAME CONSTRAINT "water_task_states_user_id_task_id_pk" TO "water_reminder_states_user_id_task_id_pk";
--> statement-breakpoint
ALTER TABLE "public"."menstrual_periods" RENAME CONSTRAINT "cycle_periods_pkey" TO "menstrual_periods_pkey";
--> statement-breakpoint
ALTER INDEX "public"."cycle_periods_user_start" RENAME TO "menstrual_periods_user_start";
--> statement-breakpoint
ALTER TABLE "public"."menstrual_periods" RENAME CONSTRAINT "cycle_periods_user_id_users_id_fk" TO "menstrual_periods_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."menstrual_daily_logs" RENAME CONSTRAINT "cycle_entries_user_id_users_id_fk" TO "menstrual_daily_logs_user_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."menstrual_daily_logs" RENAME CONSTRAINT "cycle_entries_user_id_day_pk" TO "menstrual_daily_logs_user_id_day_pk";
--> statement-breakpoint
ALTER TABLE "public"."health_articles" RENAME CONSTRAINT "articles_pkey" TO "health_articles_pkey";
--> statement-breakpoint
ALTER INDEX "public"."articles_published_created" RENAME TO "health_articles_published_created";
--> statement-breakpoint
ALTER INDEX "public"."articles_category_published" RENAME TO "health_articles_category_published";
--> statement-breakpoint
ALTER TABLE "public"."health_articles" RENAME CONSTRAINT "articles_source_id_unique" TO "health_articles_source_id_unique";
--> statement-breakpoint
ALTER TABLE "public"."health_article_categories" RENAME CONSTRAINT "article_categories_pkey" TO "health_article_categories_pkey";
--> statement-breakpoint
ALTER TABLE "public"."blood_bank_directory_entries" RENAME CONSTRAINT "blood_banks_pkey" TO "blood_bank_directory_entries_pkey";
--> statement-breakpoint
ALTER INDEX "public"."blood_banks_city" RENAME TO "blood_bank_directory_entries_city";
--> statement-breakpoint
ALTER INDEX "public"."blood_banks_active_geo" RENAME TO "blood_bank_directory_entries_active_geo";
--> statement-breakpoint
ALTER TABLE "public"."blood_bank_directory_entries" RENAME CONSTRAINT "blood_banks_source_id_unique" TO "blood_bank_directory_entries_source_id_unique";
--> statement-breakpoint
ALTER TABLE "public"."care_directory_entries" RENAME CONSTRAINT "care_entries_pkey" TO "care_directory_entries_pkey";
--> statement-breakpoint
ALTER TABLE "public"."care_directory_entries" RENAME CONSTRAINT "care_entries_reviewed_by_users_id_fk" TO "care_directory_entries_reviewed_by_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."care_directory_entries" RENAME CONSTRAINT "care_entries_source_key_unique" TO "care_directory_entries_source_key_unique";
--> statement-breakpoint
ALTER TABLE "public"."care_provider_affiliations" RENAME CONSTRAINT "care_affiliations_doctor_id_care_entries_id_fk" TO "care_provider_affiliations_doctor_id_care_directory_entries_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."care_provider_affiliations" RENAME CONSTRAINT "care_affiliations_hospital_id_care_entries_id_fk" TO "care_provider_affiliations_hospital_id_care_directory_entries_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."care_provider_affiliations" RENAME CONSTRAINT "care_affiliations_doctor_id_hospital_id_pk" TO "care_provider_affiliations_doctor_id_hospital_id_pk";
--> statement-breakpoint
ALTER TABLE "public"."care_directory_corrections" RENAME CONSTRAINT "care_corrections_pkey" TO "care_directory_corrections_pkey";
--> statement-breakpoint
ALTER TABLE "public"."care_directory_corrections" RENAME CONSTRAINT "care_corrections_entry_id_care_entries_id_fk" TO "care_directory_corrections_entry_id_care_directory_entries_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."care_directory_corrections" RENAME CONSTRAINT "care_corrections_resolved_by_users_id_fk" TO "care_directory_corrections_resolved_by_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."blood_bank_corrections" RENAME CONSTRAINT "bank_corrections_pkey" TO "blood_bank_corrections_pkey";
--> statement-breakpoint
ALTER TABLE "public"."blood_bank_corrections" RENAME CONSTRAINT "bank_corrections_bank_id_blood_banks_id_fk" TO "blood_bank_corrections_bank_id_blood_bank_directory_entries_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."blood_bank_corrections" RENAME CONSTRAINT "bank_corrections_resolved_by_users_id_fk" TO "blood_bank_corrections_resolved_by_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."home_banners" RENAME CONSTRAINT "home_banners_created_by_users_id_fk" TO "home_banners_created_by_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."administration_audit_logs" RENAME CONSTRAINT "admin_audit_pkey" TO "administration_audit_logs_pkey";
--> statement-breakpoint
ALTER INDEX "public"."admin_audit_created" RENAME TO "administration_audit_logs_created";
--> statement-breakpoint
ALTER TABLE "public"."administration_audit_logs" RENAME CONSTRAINT "admin_audit_actor_id_users_id_fk" TO "administration_audit_logs_actor_id_user_accounts_id_fk";
--> statement-breakpoint
ALTER TABLE "public"."meditation_library_items" RENAME CONSTRAINT "meditation_content_pkey" TO "meditation_library_items_pkey";
--> statement-breakpoint
ALTER TABLE "public"."meditation_library_items" RENAME CONSTRAINT "meditation_content_created_by_users_id_fk" TO "meditation_library_items_created_by_user_accounts_id_fk";
