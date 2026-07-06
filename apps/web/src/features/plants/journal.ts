import type { DiagnoseResult, GardenPlant, IdentifyResult } from '@canopy/shared';
import { api } from '@/lib/api';

/**
 * Plant journal — the user's "Khu vườn". Now persisted on the backend (keyed to
 * the user) so a plant tracked on mobile shows up on desktop too. This module
 * wraps the API and maps the wire shape (snake_case, ISO timestamps) onto the
 * camelCase / numeric-timestamp shape the screens already consume.
 */

export type PlantHealth = 'ok' | 'warning' | 'disease' | 'unknown';

export type ScanResult =
  | { kind: 'identify'; data: IdentifyResult }
  | { kind: 'diagnose'; data: DiagnoseResult };

export interface CheckIn {
  id: string;
  at: number; // epoch ms
  mode: 'identify' | 'diagnose';
  health: PlantHealth;
  title: string;
  summary: string;
  note?: string;
  thumb?: string;
  result?: ScanResult;
}

export interface Plant {
  id: string;
  name: string;
  species?: string;
  cover?: string;
  createdAt: number;
  updatedAt: number;
  health: PlantHealth;
  checkIns: CheckIn[]; // newest first
}

// --- wire ↔ client mapping --------------------------------------------------

function mapPlant(p: GardenPlant): Plant {
  return {
    id: p.id,
    name: p.name,
    species: p.species ?? undefined,
    cover: p.cover ?? undefined,
    createdAt: Date.parse(p.created_at),
    updatedAt: Date.parse(p.updated_at),
    health: p.health,
    checkIns: (p.check_ins ?? []).map((c) => ({
      id: c.id,
      at: Date.parse(c.at),
      mode: c.mode,
      health: c.health,
      title: c.title,
      summary: c.summary,
      note: c.note ?? undefined,
      thumb: c.thumb ?? undefined,
      result: c.result as ScanResult | undefined,
    })),
  };
}

/** The subset of a CheckIn we send to the server (it assigns id + timestamp). */
function checkInInput(ci: CheckIn) {
  return {
    mode: ci.mode,
    health: ci.health,
    title: ci.title,
    summary: ci.summary,
    ...(ci.note ? { note: ci.note } : {}),
    ...(ci.thumb ? { thumb: ci.thumb } : {}),
    ...(ci.result ? { result: ci.result } : {}),
  };
}

// --- API --------------------------------------------------------------------

export async function getPlants(): Promise<Plant[]> {
  return (await api.plants.list()).map(mapPlant);
}

export async function getPlant(id: string): Promise<Plant | undefined> {
  try {
    return mapPlant(await api.plants.get(id));
  } catch {
    return undefined;
  }
}

export async function createPlant(input: {
  name: string;
  species?: string;
  cover?: string;
  checkIn: CheckIn;
}): Promise<Plant> {
  const created = await api.plants.create({
    name: input.name.trim() || 'Cây của tôi',
    ...(input.species ? { species: input.species } : {}),
    ...(input.cover ? { cover: input.cover } : {}),
    check_in: checkInInput(input.checkIn),
  });
  return mapPlant(created);
}

export async function addCheckIn(plantId: string, checkIn: CheckIn): Promise<Plant | undefined> {
  try {
    return mapPlant(await api.plants.addCheckIn(plantId, checkInInput(checkIn)));
  } catch {
    return undefined;
  }
}

export async function renamePlant(id: string, name: string): Promise<Plant | undefined> {
  try {
    return mapPlant(await api.plants.rename(id, name.trim()));
  } catch {
    return undefined;
  }
}

export async function removePlant(id: string): Promise<void> {
  await api.plants.remove(id).catch(() => undefined);
}

/** Plants that look like the same species — surfaced as "đây là cây đã có?". */
export async function findBySpecies(species?: string): Promise<Plant[]> {
  if (!species?.trim()) return [];
  const s = species.trim().toLowerCase();
  return (await getPlants()).filter((p) => (p.species ?? '').trim().toLowerCase() === s);
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
 * plant. Pass a subset of check-ins (e.g. only the prior ones) so the model
 * compares "lần trước" with the current photo.
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
