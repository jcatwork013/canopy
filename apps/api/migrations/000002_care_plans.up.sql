-- ============================================================================
-- Care plans (phác đồ / roadmap chăm sóc cây)
-- A user-owned, AI-generated care roadmap. `health` drives the status colour in
-- the UI (ok=xanh, warning=vàng, disease=đỏ). Steps carry a `category` + `amount`
-- so the plan can say e.g. "tưới NHIỀU nước", "bón ÍT phân NPK".
-- ============================================================================
CREATE TABLE care_plans (
  id            UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id       UUID NOT NULL REFERENCES users(id) ON DELETE CASCADE,
  user_plant_id UUID REFERENCES user_plants(id) ON DELETE SET NULL,
  title         TEXT NOT NULL,
  plant_name    TEXT,
  health        TEXT NOT NULL DEFAULT 'ok',     -- 'ok' | 'warning' | 'disease'
  status        TEXT NOT NULL DEFAULT 'active',  -- 'active' | 'completed' | 'abandoned'
  summary       TEXT,
  watering      TEXT,                            -- tổng quan nhu cầu nước
  fertilizer    TEXT,                            -- tổng quan phân bón
  light         TEXT,                            -- tổng quan ánh sáng
  prevention    TEXT,
  warning_signs TEXT[] NOT NULL DEFAULT '{}',
  duration_days INT NOT NULL DEFAULT 0,
  cover_url     TEXT,
  created_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at    TIMESTAMPTZ NOT NULL DEFAULT now(),
  deleted_at    TIMESTAMPTZ
);
CREATE INDEX idx_care_plans_user ON care_plans (user_id) WHERE deleted_at IS NULL;
CREATE TRIGGER trg_care_plans_updated_at BEFORE UPDATE ON care_plans
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TABLE care_plan_steps (
  id           UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  care_plan_id UUID NOT NULL REFERENCES care_plans(id) ON DELETE CASCADE,
  day_offset   INT NOT NULL DEFAULT 0,           -- ngày thứ N trong phác đồ
  sort         INT NOT NULL DEFAULT 0,
  title        TEXT NOT NULL,
  description  TEXT,
  category     TEXT NOT NULL DEFAULT 'other',    -- water|fertilize|light|soil|prune|monitor|treat|other
  amount       TEXT,                             -- "nhiều / vừa / ít", liều lượng phân...
  completed_at TIMESTAMPTZ
);
CREATE INDEX idx_care_plan_steps_plan ON care_plan_steps (care_plan_id, day_offset, sort);
