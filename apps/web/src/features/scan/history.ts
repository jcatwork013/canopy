import type { DiagnoseResult, IdentifyResult, ScanHistoryItem } from '@canopy/shared';
import { api } from '@/lib/api';

/**
 * Recent scan history (lịch sử quét). Persisted on the backend so past results
 * can be reopened from any device without re-paying for AI.
 */

export type ScanResult =
  | { kind: 'identify'; data: IdentifyResult }
  | { kind: 'diagnose'; data: DiagnoseResult };

export interface HistoryItem {
  id: string;
  mode: 'identify' | 'diagnose';
  title: string;
  thumb: string;
  createdAt: number;
  result: ScanResult;
}

function mapItem(it: ScanHistoryItem): HistoryItem {
  return {
    id: it.id,
    mode: it.mode,
    title: it.title,
    thumb: it.thumb ?? '',
    createdAt: Date.parse(it.created_at),
    result: it.result as ScanResult,
  };
}

export async function getHistory(): Promise<HistoryItem[]> {
  try {
    return (await api.scans.list()).map(mapItem);
  } catch {
    return [];
  }
}

/** Save a scan, then return the refreshed list. */
export async function addHistory(input: {
  mode: 'identify' | 'diagnose';
  title: string;
  thumb?: string;
  result: ScanResult;
}): Promise<HistoryItem[]> {
  try {
    await api.scans.add({
      mode: input.mode,
      title: input.title,
      ...(input.thumb ? { thumb: input.thumb } : {}),
      result: input.result,
    });
  } catch {
    /* ignore — best effort */
  }
  return getHistory();
}

export async function removeHistory(id: string): Promise<HistoryItem[]> {
  await api.scans.remove(id).catch(() => undefined);
  return getHistory();
}
