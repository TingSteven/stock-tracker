import type { HistoryPoint, SectorData, StockAnalysis, TurnoverStock, UnusualVolumeStock } from '../types';

const BASE = '/api';

async function get<T>(path: string): Promise<T> {
  const res = await fetch(`${BASE}${path}`);
  if (!res.ok) throw new Error(`API error ${res.status}: ${path}`);
  return res.json();
}

export const fetchStock = (symbol: string) =>
  get<StockAnalysis>(`/stock/${symbol.toUpperCase()}`);

export const fetchHistory = (symbol: string) =>
  get<HistoryPoint[]>(`/stock/${symbol.toUpperCase()}/history`);

export const fetchSectors = (market = 'us') =>
  get<SectorData[]>(`/sectors?market=${market}`);

export const fetchUnusualVolume = (market = 'us') =>
  get<UnusualVolumeStock[]>(`/flow/unusual-volume?market=${market}`);

export const fetchTopTurnover = (market = 'us') =>
  get<TurnoverStock[]>(`/flow/top-turnover?market=${market}`);

export interface ScreenerParams {
  pe_max?: number;
  rsi_min?: number;
  rsi_max?: number;
  volume_ratio_min?: number;
}

export function fetchScreener(params: ScreenerParams) {
  const q = new URLSearchParams();
  if (params.pe_max != null) q.set('pe_max', String(params.pe_max));
  if (params.rsi_min != null) q.set('rsi_min', String(params.rsi_min));
  if (params.rsi_max != null) q.set('rsi_max', String(params.rsi_max));
  if (params.volume_ratio_min != null)
    q.set('volume_ratio_min', String(params.volume_ratio_min));
  return get<StockAnalysis[]>(`/screener?${q}`);
}
