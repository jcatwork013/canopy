// Domain DTOs shared across web + mobile. These mirror the Postgres schema and
// the normalized AI output schemas defined in docs/SPEC.md §7.

// --- Plants & species ------------------------------------------------------
export interface CareProfile {
  watering: string;
  light: string;
  soil: string;
  temperature: string;
  humidity: string;
  fertilizer: string;
  special_notes: string[];
}

export interface PlantSpecies {
  id: string;
  scientific_name: string;
  common_names: string[];
  family?: string | null;
  description?: string | null;
  native_region?: string | null;
  care_profile?: CareProfile | null;
  image_url?: string | null;
  source: 'ai' | 'admin';
}

export type PlantStatus = 'healthy' | 'sick' | 'recovering' | 'dead';

export interface UserPlant {
  id: string;
  user_id: string;
  species_id?: string | null;
  nickname?: string | null;
  cover_url?: string | null;
  location?: string | null;
  acquired_date?: string | null;
  status: PlantStatus;
  notes?: string | null;
  created_at: string;
}

// --- AI: identification ----------------------------------------------------
export interface IdentifyResult {
  is_plant?: boolean;
  scientific_name: string;
  common_names: string[];
  family: string;
  confidence: number;
  alternatives: { scientific_name: string; confidence: number }[];
  characteristics: string[];
  care_profile: CareProfile;
}

// --- AI: diagnosis ---------------------------------------------------------
export type DiseaseCategory =
  | 'healthy'
  | 'fungal'
  | 'bacterial'
  | 'viral'
  | 'pest'
  | 'nutrient'
  | 'environmental'
  | 'unknown';

export type Severity = 'mild' | 'moderate' | 'severe';

export interface DiagnoseResult {
  is_plant?: boolean;
  plant?: string;
  disease_name: string;
  category: DiseaseCategory;
  confidence: number;
  severity: Severity;
  observed_symptoms: string[];
  likely_causes: string[];
  differential: { name: string; confidence: number }[];
  immediate_actions: string[];
  needs_more_info: string[];
}

// --- AI: treatment plan ----------------------------------------------------
export interface TreatmentStep {
  id?: string;
  day_offset: number;
  title: string;
  description: string;
  completed_at?: string | null;
}

export interface TreatmentPlan {
  id?: string;
  diagnosis_id?: string;
  duration_days: number;
  status?: 'active' | 'completed' | 'abandoned';
  summary: string;
  steps: TreatmentStep[];
  prevention: string;
  warning_signs: string[];
}

// --- Care plans (phác đồ / roadmap chăm sóc) -------------------------------
/** Drives the status colour in the UI: ok=xanh, warning=vàng, disease=đỏ. */
export type CarePlanHealth = 'ok' | 'warning' | 'disease';
export type CarePlanStatus = 'active' | 'completed' | 'abandoned';
export type CareStepCategory =
  | 'water'
  | 'fertilize'
  | 'light'
  | 'soil'
  | 'prune'
  | 'monitor'
  | 'treat'
  | 'other';

export interface CarePlanStep {
  id: string;
  day_offset: number;
  sort: number;
  title: string;
  description: string;
  category: CareStepCategory;
  /** Liều lượng cụ thể: "nhiều/vừa/ít nước", "bón ít NPK 20-20-15"... */
  amount?: string | null;
  completed_at?: string | null;
}

export interface CarePlan {
  id: string;
  user_id: string;
  user_plant_id?: string | null;
  title: string;
  plant_name?: string | null;
  health: CarePlanHealth;
  status: CarePlanStatus;
  summary: string;
  watering?: string | null;
  fertilizer?: string | null;
  light?: string | null;
  prevention?: string | null;
  warning_signs: string[];
  duration_days: number;
  cover_url?: string | null;
  steps: CarePlanStep[];
  created_at: string;
  updated_at: string;
}

/** Request to have the AI generate + save a care roadmap. */
export interface GenerateCarePlanRequest {
  plant_name?: string;
  source?: 'identify' | 'diagnose' | 'manual';
  /** Hint from a prior scan so the AI starts from the right status. */
  health_hint?: CarePlanHealth;
  /** Serialized identify/diagnose summary or free-form notes from the user. */
  context?: string;
  cover_url?: string;
}

// --- Care & reminders ------------------------------------------------------
export type CareType = 'water' | 'fertilize' | 'prune' | 'repot' | 'rotate' | 'mist' | 'custom';

export interface CareSchedule {
  id: string;
  user_plant_id: string;
  type: CareType;
  label?: string | null;
  frequency_days: number;
  time_of_day?: string | null;
  next_due_at: string;
  last_done_at?: string | null;
  active: boolean;
}

export interface AppNotification {
  id: string;
  type: 'care_reminder' | 'kyc_update' | 'message' | 'system';
  title: string;
  body?: string | null;
  data?: Record<string, unknown> | null;
  read_at?: string | null;
  created_at: string;
}

// --- Marketplace -----------------------------------------------------------
export interface Listing {
  id: string;
  owner_id: string;
  kind: 'plant_sale' | 'care_service';
  title: string;
  description?: string | null;
  species_id?: string | null;
  price?: number | null;
  currency: string;
  photos: string[];
  location?: string | null;
  status: 'active' | 'paused' | 'sold' | 'archived';
  created_at: string;
}

// --- Garden journal (Khu vườn / nhật ký cây) -------------------------------
export type GardenHealth = 'ok' | 'warning' | 'disease' | 'unknown';

export interface GardenCheckIn {
  id: string;
  at: string; // ISO timestamp
  mode: 'identify' | 'diagnose';
  health: GardenHealth;
  title: string;
  summary: string;
  note?: string | null;
  thumb?: string | null;
  result?: unknown;
}

export interface GardenPlant {
  id: string;
  user_id: string;
  name: string;
  species?: string | null;
  cover?: string | null;
  health: GardenHealth;
  created_at: string;
  updated_at: string;
  check_ins: GardenCheckIn[];
}

export interface GardenCheckInInput {
  mode: 'identify' | 'diagnose';
  health: GardenHealth;
  title: string;
  summary: string;
  note?: string;
  thumb?: string;
  result?: unknown;
}

export interface CreateGardenPlantRequest {
  name: string;
  species?: string;
  cover?: string;
  check_in: GardenCheckInInput;
}

// --- Scan history (lịch sử quét) -------------------------------------------
export interface ScanHistoryItem {
  id: string;
  mode: 'identify' | 'diagnose';
  title: string;
  thumb?: string | null;
  result?: unknown;
  created_at: string;
}
export interface ScanHistoryInput {
  mode: 'identify' | 'diagnose';
  title: string;
  thumb?: string;
  result?: unknown;
}

// --- Profile preferences (tên hiển thị, avatar, ảnh bìa) -------------------
export interface ProfilePrefsDTO {
  name?: string | null;
  avatar?: string | null;
  banner?: string | null;
}

/** AI results are advisory — surface this disclaimer wherever AI output shows. */
export const AI_DISCLAIMER =
  'Kết quả AI mang tính tham khảo, không thay thế ý kiến chuyên gia thực vật.';
