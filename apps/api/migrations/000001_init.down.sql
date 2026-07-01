-- Reverse of 000001_init.up.sql
DROP TABLE IF EXISTS ai_providers;
DROP TABLE IF EXISTS system_configs;
DROP TABLE IF EXISTS reviews;
DROP TABLE IF EXISTS messages;
DROP TABLE IF EXISTS conversation_participants;
DROP TABLE IF EXISTS conversations;
DROP TABLE IF EXISTS listings;
DROP TABLE IF EXISTS push_tokens;
DROP TABLE IF EXISTS notifications;
DROP TABLE IF EXISTS care_logs;
DROP TABLE IF EXISTS care_schedules;
DROP TABLE IF EXISTS treatment_steps;
DROP TABLE IF EXISTS treatment_plans;
DROP TABLE IF EXISTS diagnoses;
DROP TABLE IF EXISTS diseases;
DROP TABLE IF EXISTS identifications;
DROP TABLE IF EXISTS plant_photos;
DROP TABLE IF EXISTS user_plants;
DROP TABLE IF EXISTS plant_species;
DROP TABLE IF EXISTS kyc_submissions;
DROP TABLE IF EXISTS email_tokens;
DROP TABLE IF EXISTS refresh_tokens;
DROP TABLE IF EXISTS users;

DROP TYPE IF EXISTS care_type;
DROP TYPE IF EXISTS kyc_status;
DROP TYPE IF EXISTS account_status;

DROP FUNCTION IF EXISTS set_updated_at();
