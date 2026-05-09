export interface StockAnalysis {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  volume_ratio: number;
  pe_ratio: number | null;
  eps: number | null;
  market_cap: number | null;
  revenue_growth: number | null;
  profit_margin: number | null;
  debt_to_equity: number | null;
  rsi: number | null;
  macd: number | null;
  macd_signal: number | null;
  sma_50: number | null;
  sma_200: number | null;
  price_vs_sma50: number | null;
  price_vs_sma200: number | null;
  buy_score: number;
  technical_signal: string;
  fundamental_signal: string;
  volume_signal: string;
  sector: string | null;
  industry: string | null;
}

export interface HistoryPoint {
  date: string;
  open: number;
  high: number;
  low: number;
  close: number;
  volume: number;
}

export interface SectorData {
  name: string;
  etf: string;
  price: number;
  change_1d: number;
  change_1w: number;
  change_1m: number;
  change_3m: number;
  momentum_score: number;
  rotation_signal: string;
  volume_ratio: number;
  vs_benchmark: number | null;
}

export interface UnusualVolumeStock {
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  volume_ratio: number;
  sector: string;
}

export interface TurnoverStock {
  rank: number;
  symbol: string;
  name: string;
  price: number;
  change_pct: number;
  volume: number;
  avg_volume: number;
  turnover: number;
  market_cap: number | null;
  pe_ratio: number | null;
  sector: string;
}

export interface PortfolioItem {
  symbol: string;
  shares: number;
  avg_cost: number;
}
