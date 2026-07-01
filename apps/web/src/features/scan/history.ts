import type { DiagnoseResult, IdentifyResult } from '@canopy/shared';

export type ScanResult =
  | { kind: 'identify'; data: IdentifyResult }
  | { kind: 'diagnose'; data: DiagnoseResult };

export interface HistoryItem {
  id: string;
  mode: 'identify' | 'diagnose';
  title: string;
  thumb: string; // small data URL
  createdAt: number;
  result: ScanResult;
}

const MAX = 20;
const key = (uid: string) => `canopy-scan-history-${uid}`;

export function getHistory(uid: string): HistoryItem[] {
  try {
    const raw = localStorage.getItem(key(uid));
    return raw ? (JSON.parse(raw) as HistoryItem[]) : [];
  } catch {
    return [];
  }
}

export function addHistory(uid: string, item: HistoryItem): HistoryItem[] {
  const list = [item, ...getHistory(uid).filter((h) => h.id !== item.id)].slice(0, MAX);
  try {
    localStorage.setItem(key(uid), JSON.stringify(list));
  } catch {
    /* quota — drop silently */
  }
  return list;
}

export function removeHistory(uid: string, id: string): HistoryItem[] {
  const list = getHistory(uid).filter((h) => h.id !== id);
  try {
    localStorage.setItem(key(uid), JSON.stringify(list));
  } catch {
    /* ignore */
  }
  return list;
}
