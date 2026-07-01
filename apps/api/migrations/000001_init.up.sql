-- ============================================================================
-- Canopy initial schema
-- Conventions: UUID PKs, timestamptz, soft-delete via deleted_at on key tables,
-- foreign keys with explicit ON DELETE, updated_at maintained by trigger.
-- ============================================================================

CREATE EXTENSION IF NOT EXISTS citext;
-- gen_random_uuid() is built into PostgreSQL 13+ core.

-- Generic updated_at trigger -------------------------------------------------
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- Enums ----------------------------------------------------------------------
CREATE TYPE account_status AS ENUM ('pending', 'active', 'suspended', 'banned');
CREATE TYPE kyc_status     AS ENUM ('none', 'submitted', 'in_review', 'verified', 'rejected');
CREATE TYPE care_type      AS ENUM ('water', 'fertilize', 'prune', 'repot', 'rotate', 'mist', 'custom');

-- ============================================================================
-- 1. Auth & users
-- ============================================================================
CREATE TABLE users (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email             CITEXT UNIQUE NOT NULL,
  password_hash     TEXT NOT NULL,
  full_name         TEXT NOT NULL,
  phone             TEXT,
  avatar_url        TEXT,
  is_player         BOOLEAN NOT NULL DEFAULT TRUE,
  is_seller         BOOLEAN NOT NULL DEFAULT FALSE,
  is_caretaker      BOOLEAN NOT NULL DEFAULT FALSE,
  is_system_admin   BOOLEAN NOT NULL DEFAULT FALSE,
  account_status    account_status NOT NULL DEFAULT 'pending',
  email_verified_at TIMESTAMPTZ,
  kyc_status        kyc_status NOT NULL DEFAULT 'none',
  created_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at        TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at        TIMESTAMPTZ
);
CREATE INDEX idx_users_account_status ON users (account_status);
CREATE INDEX idx_users_is_system_admin ON users (is_system_admin) WHERE is_system_admin;
CREATE TRIGGER trg_users_updated_at BEFORE UPDATE ON users
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE refresh_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  revoked_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_refresh_tokens_user ON refresh_tokens (user_id);
CREATE INDEX idx_refresh_tokens_hash ON refresh_tokens (token_hash);

CREATE TABLE email_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  purpose    TEXT NOT NULL,            -- 'verify_email' | 'reset_password'
  token_hash TEXT NOT NULL,
  expires_at TIMESTAMPTZ NOT NULL,
  used_at    TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_email_tokens_user ON email_tokens (user_id);
CREATE INDEX idx_email_tokens_hash ON email_tokens (token_hash);

-- ============================================================================
-- 2. KYC
-- ============================================================================
CREATE TABLE kyc_submissions (
  id                 UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id            UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  document_type      TEXT NOT NULL,    -- 'national_id' | 'passport' | 'driver_license'
  document_number    TEXT,
  document_front_url TEXT NOT NULL,    -- MinIO object key (private)
  document_back_url  TEXT,
  selfie_url         TEXT,
  status             kyc_status NOT NULL DEFAULT 'submitted',
  reviewed_by        UUID REFERENCES users(id),
  reviewed_at        TIMESTAMPTZ,
  rejection_reason   TEXT,
  created_at         TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_kyc_user ON kyc_submissions (user_id);
CREATE INDEX idx_kyc_status ON kyc_submissions (status);

-- ============================================================================
-- 3. Plants & species
-- ============================================================================
CREATE TABLE plant_species (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  scientific_name TEXT NOT NULL,
  common_names    TEXT[] NOT NULL DEFAULT '{}',
  family          TEXT,
  description     TEXT,
  native_region   TEXT,
  care_profile    JSONB,    -- { watering, light, soil, temperature, humidity, fertilizer, special_notes[] }
  image_url       TEXT,
  source          TEXT DEFAULT 'ai',   -- 'ai' | 'admin'
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_species_scientific_name ON plant_species (scientific_name);
CREATE TRIGGER trg_species_updated_at BEFORE UPDATE ON plant_species
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE user_plants (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  species_id    UUID REFERENCES plant_species(id),
  nickname      TEXT,
  cover_url     TEXT,
  location      TEXT,
  acquired_date DATE,
  status        TEXT DEFAULT 'healthy', -- 'healthy' | 'sick' | 'recovering' | 'dead'
  notes         TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_user_plants_user ON user_plants (user_id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_user_plants_updated_at BEFORE UPDATE ON user_plants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE plant_photos (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plant_id UUID NOT NULL REFERENCES user_plants(id) ON DELETE CASCADE,
  url           TEXT NOT NULL,
  kind          TEXT DEFAULT 'progress', -- 'identification' | 'progress' | 'disease'
  taken_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_plant_photos_plant ON plant_photos (user_plant_id);

-- ============================================================================
-- 4. AI: identification, diseases, diagnoses, treatment
-- ============================================================================
CREATE TABLE identifications (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  photo_url  TEXT NOT NULL,
  provider   TEXT NOT NULL,   -- 'gemini'
  model      TEXT,
  species_id UUID REFERENCES plant_species(id),
  result     JSONB NOT NULL,
  confidence NUMERIC(4,3),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_identifications_user ON identifications (user_id);

CREATE TABLE diseases (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name            TEXT NOT NULL,
  scientific_name TEXT,
  category        TEXT,    -- 'fungal' | 'bacterial' | 'viral' | 'pest' | 'nutrient' | 'environmental'
  symptoms        TEXT,
  causes          TEXT,
  description     TEXT,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_diseases_name ON diseases (name);

CREATE TABLE diagnoses (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_plant_id UUID REFERENCES user_plants(id) ON DELETE SET NULL,
  photo_urls    TEXT[] NOT NULL DEFAULT '{}',
  symptoms_text TEXT,
  provider      TEXT NOT NULL,
  disease_id    UUID REFERENCES diseases(id),
  severity      TEXT,            -- 'mild' | 'moderate' | 'severe'
  confidence    NUMERIC(4,3),
  result        JSONB NOT NULL,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_diagnoses_user ON diagnoses (user_id);
CREATE INDEX idx_diagnoses_plant ON diagnoses (user_plant_id);

CREATE TABLE treatment_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  diagnosis_id  UUID NOT NULL REFERENCES diagnoses(id) ON DELETE CASCADE,
  user_plant_id UUID REFERENCES user_plants(id) ON DELETE SET NULL,
  duration_days INT NOT NULL,
  status        TEXT DEFAULT 'active', -- 'active' | 'completed' | 'abandoned'
  summary       TEXT,
  prevention    TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_treatment_plans_diagnosis ON treatment_plans (diagnosis_id);

CREATE TABLE treatment_steps (
  id                UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  treatment_plan_id UUID NOT NULL REFERENCES treatment_plans(id) ON DELETE CASCADE,
  day_offset        INT NOT NULL,
  title             TEXT NOT NULL,
  description       TEXT,
  completed_at      TIMESTAMPTZ
);
CREATE INDEX idx_treatment_steps_plan ON treatment_steps (treatment_plan_id);

-- ============================================================================
-- 5. Care & reminders
-- ============================================================================
CREATE TABLE care_schedules (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plant_id  UUID NOT NULL REFERENCES user_plants(id) ON DELETE CASCADE,
  type           care_type NOT NULL,
  label          TEXT,
  frequency_days INT NOT NULL,
  time_of_day    TIME,
  next_due_at    TIMESTAMPTZ NOT NULL,
  last_done_at   TIMESTAMPTZ,
  active         BOOLEAN NOT NULL DEFAULT TRUE,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_care_schedules_due ON care_schedules (next_due_at) WHERE active;
CREATE INDEX idx_care_schedules_plant ON care_schedules (user_plant_id);

CREATE TABLE care_logs (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_plant_id UUID NOT NULL REFERENCES user_plants(id) ON DELETE CASCADE,
  schedule_id   UUID REFERENCES care_schedules(id) ON DELETE SET NULL,
  type          care_type NOT NULL,
  notes         TEXT,
  done_at       TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_care_logs_plant ON care_logs (user_plant_id);

CREATE TABLE notifications (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id      UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  type         TEXT NOT NULL,    -- 'care_reminder' | 'kyc_update' | 'message' | 'system'
  title        TEXT NOT NULL,
  body         TEXT,
  data         JSONB,
  scheduled_at TIMESTAMPTZ,
  sent_at      TIMESTAMPTZ,
  read_at      TIMESTAMPTZ,
  created_at   TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_notifications_user_unread ON notifications (user_id) WHERE read_at IS NULL;

CREATE TABLE push_tokens (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  platform   TEXT NOT NULL,     -- 'ios' | 'android' | 'web'
  token      TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (user_id, token)
);

-- ============================================================================
-- 6. Marketplace & community
-- ============================================================================
CREATE TABLE listings (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  kind        TEXT NOT NULL,    -- 'plant_sale' | 'care_service'
  title       TEXT NOT NULL,
  description TEXT,
  species_id  UUID REFERENCES plant_species(id),
  price       NUMERIC(12,2),
  currency    TEXT DEFAULT 'VND',
  photos      TEXT[] DEFAULT '{}',
  location    TEXT,
  status      TEXT DEFAULT 'active',  -- 'active' | 'paused' | 'sold' | 'archived'
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_listings_kind ON listings (kind) WHERE status = 'active';
CREATE INDEX idx_listings_owner ON listings (owner_id);
CREATE TRIGGER trg_listings_updated_at BEFORE UPDATE ON listings
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE conversations (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE conversation_participants (
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  user_id         UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  PRIMARY KEY (conversation_id, user_id)
);
CREATE INDEX idx_conv_participants_user ON conversation_participants (user_id);

CREATE TABLE messages (
  id              UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  conversation_id UUID NOT NULL REFERENCES conversations(id) ON DELETE CASCADE,
  sender_id       UUID NOT NULL REFERENCES users(id),
  body            TEXT NOT NULL,
  created_at      TIMESTAMPTZ NOT NULL DEFAULT now(),
  read_at         TIMESTAMPTZ
);
CREATE INDEX idx_messages_conv ON messages (conversation_id, created_at);

CREATE TABLE reviews (
  id             UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  reviewer_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  target_user_id UUID REFERENCES users(id) ON DELETE CASCADE,
  listing_id     UUID REFERENCES listings(id) ON DELETE CASCADE,
  rating         INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment        TEXT,
  created_at     TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_reviews_target ON reviews (target_user_id);

-- ============================================================================
-- 7. System configuration (activation gate)
-- ============================================================================
CREATE TABLE system_configs (
  key        TEXT PRIMARY KEY,         -- 'gemini_api_key', 'resend_api_key', ...
  value_enc  BYTEA,                    -- AES-256-GCM ciphertext (NULL = unset)
  is_secret  BOOLEAN NOT NULL DEFAULT TRUE,
  category   TEXT,                     -- 'ai' | 'email' | 'storage' | 'general'
  updated_by UUID REFERENCES users(id),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE ai_providers (
  id          UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name        TEXT NOT NULL,           -- 'Gemini'
  type        TEXT NOT NULL,           -- 'gemini' | 'openai' | ...
  api_key_enc BYTEA,
  model       TEXT,                    -- 'gemini-2.5-flash'
  enabled     BOOLEAN NOT NULL DEFAULT FALSE,
  is_default  BOOLEAN NOT NULL DEFAULT FALSE,
  created_at  TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at  TIMESTAMPTZ NOT NULL DEFAULT now()
);
-- Only one provider may be the default at a time.
CREATE UNIQUE INDEX uniq_ai_provider_default ON ai_providers (is_default) WHERE is_default;
CREATE TRIGGER trg_ai_providers_updated_at BEFORE UPDATE ON ai_providers
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
