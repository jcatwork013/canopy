-- ============================================================================
-- Garden journal + scan history + profile prefs.
-- These were client-side (localStorage) and therefore per-device. Persisting
-- them here keys them to the user so data is consistent across mobile/desktop.
-- Images are stored as data URLs (TEXT) to mirror the existing client shape.
-- ============================================================================

-- Tracked plants (Khu vườn / nhật ký cây) — mirrors web features/plants/journal.ts
CREATE TABLE garden_plants (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT NOT NULL,
  species    TEXT,
  cover_url  TEXT,
  health     TEXT NOT NULL DEFAULT 'unknown',  -- ok|warning|disease|unknown
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at TIMESTAMPTZ
);
CREATE INDEX idx_garden_plants_user ON garden_plants (user_id, updated_at DESC) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_garden_plants_updated_at BEFORE UPDATE ON garden_plants
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- Per-plant check-in timeline (each scan / re-check of that plant).
CREATE TABLE garden_check_ins (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  plant_id   UUID NOT NULL REFERENCES garden_plants(id) ON DELETE CASCADE,
  checked_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  mode       TEXT NOT NULL,                    -- identify|diagnose
  health     TEXT NOT NULL DEFAULT 'unknown',  -- ok|warning|disease|unknown
  title      TEXT NOT NULL,
  summary    TEXT NOT NULL DEFAULT '',
  note       TEXT,
  thumb_url  TEXT,
  result     JSONB,                            -- full scan result so it can be reopened
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_garden_check_ins_plant ON garden_check_ins (plant_id, checked_at DESC);

-- Recent scans (lịch sử quét) — quick reopen without re-paying for AI.
CREATE TABLE scan_history (
  id         UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id    UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  mode       TEXT NOT NULL,                    -- identify|diagnose
  title      TEXT NOT NULL,
  thumb_url  TEXT,
  result     JSONB,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE INDEX idx_scan_history_user ON scan_history (user_id, created_at DESC);

-- Profile preferences (display name + avatar + banner). One row per user.
CREATE TABLE user_profiles (
  user_id    UUID PRIMARY KEY REFERENCES users(id) ON DELETE CASCADE,
  name       TEXT,
  avatar_url TEXT,
  banner_url TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);
CREATE TRIGGER trg_user_profiles_updated_at BEFORE UPDATE ON user_profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();
