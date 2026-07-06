import type { DiagnoseResult, IdentifyResult } from '@canopy/shared';

/**
 * Plant journal — the user's "Khu vườn". Each tracked plant keeps a timeline of
 * check-ins (scans / diagnoses). This gives the AI a memory: when the user
 * re-checks the SAME plant, we hand the model the prior check-ins so it can say
 * "hai tuần trước cây này bị… giờ đã…". Stored per-user in localStorage; a real
 * backend can mirror this shape later without touching the UI.
 */

export type PlantHealth = 'ok' | 'warning' | 'disease' | 'unknown';

export type ScanResult =
  | { kind: 'identify'; data: IdentifyResult }
  | { kind: 'diagnose'; data: DiagnoseResult };

export interface CheckIn {
  id: string;
  at: number;
  mode: 'identify' | 'diagnose';
  health: PlantHealth;
  title: string; // disease name / species — the headline of this check
  summary: string; // one-line takeaway
  note?: string; // optional user note
  thumb?: string; // small data URL
  result?: ScanResult; // full result so a check-in can be reopened
}

export interface Plant {
  id: string;
  name: string;
  species?: string;
  cover?: string; // small data URL
  createdAt: number;
  updatedAt: number;
  health: PlantHealth;
  checkIns: CheckIn[]; // newest first
}

const MAX_PLANTS = 60;
const MAX_CHECKINS = 40;
const key = (uid: string) => `canopy-garden-${uid}`;

// --- persistence ------------------------------------------------------------

export function getPlants(uid: string): Plant[] {
  try {
    const raw = localStorage.getItem(key(uid));
    const list = raw ? (JSON.parse(raw) as Plant[]) : [];
    return list.sort((a, b) => b.updatedAt - a.updatedAt);
  } catch {
    return [];
  }
}

export function getPlant(uid: string, id: string): Plant | undefined {
  return getPlants(uid).find((p) => p.id === id);
}

function writePlants(uid: string, list: Plant[]): Plant[] {
  const trimmed = list.slice(0, MAX_PLANTS);
  try {
    localStorage.setItem(key(uid), JSON.stringify(trimmed));
  } catch {
    /* quota — drop silently */
  }
  return trimmed;
}

function upsert(uid: string, plant: Plant): Plant[] {
  const list = getPlants(uid).filter((p) => p.id !== plant.id);
  return writePlants(uid, [plant, ...list]);
}

export function removePlant(uid: string, id: string): Plant[] {
  return writePlants(
    uid,
    getPlants(uid).filter((p) => p.id !== id),
  );
}

export function renamePlant(uid: string, id: string, name: string): Plant | undefined {
  const plant = getPlant(uid, id);
  if (!plant) return undefined;
  const next = { ...plant, name: name.trim() || plant.name, updatedAt: Date.now() };
  upsert(uid, next);
  return next;
}

/** Create a new tracked plant seeded with its first check-in. */
export function createPlant(
  uid: string,
  input: { name: string; species?: string; cover?: string; checkIn: CheckIn },
): Plant {
  const now = Date.now();
  const plant: Plant = {
    id: `p_${now}_${Math.floor(now % 100000)}`,
    name: input.name.trim() || 'Cây của tôi',
    species: input.species,
    cover: input.cover,
    createdAt: now,
    updatedAt: now,
    health: input.checkIn.health,
    checkIns: [input.checkIn],
  };
  upsert(uid, plant);
  return plant;
}

/** Append a check-in to an existing plant; refreshes its health/cover. */
export function addCheckIn(uid: string, plantId: string, checkIn: CheckIn): Plant | undefined {
  const plant = getPlant(uid, plantId);
  if (!plant) return undefined;
  const next: Plant = {
    ...plant,
    updatedAt: Date.now(),
    health: checkIn.health,
    cover: checkIn.thumb ?? plant.cover,
    species: plant.species ?? checkIn.title,
    checkIns: [checkIn, ...plant.checkIns].slice(0, MAX_CHECKINS),
  };
  upsert(uid, next);
  return next;
}

/** Plants that look like the same species — surfaced as "đây là cây đã có?". */
export function findBySpecies(uid: string, species?: string): Plant[] {
  if (!species) return [];
  const s = species.trim().toLowerCase();
  if (!s) return [];
  return getPlants(uid).filter((p) => (p.species ?? '').trim().toLowerCase() === s);
}

// --- deriving a check-in from a scan result ---------------------------------

export function resultHealth(r: ScanResult): PlantHealth {
  if (r.kind === 'identify') return r.data.is_plant === false ? 'unknown' : 'ok';
  if (r.data.is_plant === false) return 'unknown';
  if (r.data.category === 'healthy') return 'ok';
  return r.data.severity === 'mild' ? 'warning' : 'disease';
}

export function resultSpecies(r: ScanResult): string | undefined {
  if (r.kind === 'identify') return r.data.scientific_name || undefined;
  return r.data.plant || undefined;
}

export function resultTitle(r: ScanResult): string {
  if (r.kind === 'identify') return r.data.scientific_name || 'Nhận diện cây';
  return r.data.disease_name || 'Chẩn đoán';
}

export function resultSummary(r: ScanResult): string {
  if (r.kind === 'identify') {
    return r.data.common_names?.slice(0, 2).join(', ') || r.data.family || 'Đã nhận diện loài';
  }
  if (r.data.category === 'healthy') return 'Cây khỏe mạnh, không phát hiện vấn đề rõ rệt.';
  return r.data.observed_symptoms?.slice(0, 2).join('; ') || r.data.disease_name;
}

// --- time helpers -----------------------------------------------------------

export function fmtDate(at: number): string {
  return new Date(at).toLocaleDateString('vi-VN', { day: '2-digit', month: '2-digit', year: 'numeric' });
}

/** Vietnamese relative time — "hôm nay", "2 tuần trước"… */
export function relTime(at: number): string {
  const days = Math.floor((Date.now() - at) / 86_400_000);
  if (days <= 0) return 'hôm nay';
  if (days === 1) return 'hôm qua';
  if (days < 7) return `${days} ngày trước`;
  if (days < 30) return `${Math.round(days / 7)} tuần trước`;
  if (days < 365) return `${Math.round(days / 30)} tháng trước`;
  return `${Math.round(days / 365)} năm trước`;
}

const HEALTH_VI: Record<PlantHealth, string> = {
  ok: 'ổn/khỏe',
  warning: 'chưa ổn, cần điều chỉnh',
  disease: 'có dấu hiệu bệnh',
  unknown: 'chưa rõ',
};

/**
 * Compact history handed to the AI as context so it "remembers" this exact
 * plant. `sinceIndex` lets the caller pass only PRIOR check-ins (skip the one
 * just taken) so the model compares "lần trước" with the current photo.
 */
export function buildMemory(plant: Plant, checkIns = plant.checkIns): string | undefined {
  if (!checkIns.length) return undefined;
  const lines = checkIns
    .slice(0, 6)
    .map((c) => {
      const note = c.note ? ` Ghi chú người dùng: ${c.note}.` : '';
      return `- ${fmtDate(c.at)} (${relTime(c.at)}): [${HEALTH_VI[c.health]}] ${c.title} — ${c.summary}.${note}`;
    })
    .join('\n');
  return [
    `[BỐI CẢNH HỆ THỐNG — KHÔNG PHẢI CÂU HỎI]`,
    `Người dùng đang theo dõi một cây cụ thể trong nhật ký: "${plant.name}"${plant.species ? ` (${plant.species})` : ''}.`,
    `Các lần kiểm tra trước đây (mới → cũ):`,
    lines,
    `Hãy coi đây LÀ CÙNG MỘT CÂY. Khi trả lời hoặc khi có ảnh mới: so sánh với lần kiểm tra gần nhất, xác nhận tình trạng hiện tại, nêu rõ tiến triển (tốt lên / giữ nguyên / xấu đi) và bước tiếp theo nên làm. Nếu người dùng hỏi chung, vẫn ưu tiên ngữ cảnh của chính cây này.`,
  ].join('\n');
}
