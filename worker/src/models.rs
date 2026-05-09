use serde::{Deserialize, Serialize};

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct StockAnalysis {
    pub symbol: String,
    pub name: String,
    pub price: f64,
    pub change_pct: f64,
    pub volume: u64,
    pub avg_volume: u64,
    pub volume_ratio: f64,
    pub pe_ratio: Option<f64>,
    pub eps: Option<f64>,
    pub market_cap: Option<f64>,
    pub revenue_growth: Option<f64>,
    pub profit_margin: Option<f64>,
    pub debt_to_equity: Option<f64>,
    pub rsi: Option<f64>,
    pub macd: Option<f64>,
    pub macd_signal: Option<f64>,
    pub sma_50: Option<f64>,
    pub sma_200: Option<f64>,
    pub price_vs_sma50: Option<f64>,
    pub price_vs_sma200: Option<f64>,
    pub buy_score: f64,
    pub technical_signal: String,
    pub fundamental_signal: String,
    pub volume_signal: String,
    pub sector: Option<String>,
    pub industry: Option<String>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct HistoryPoint {
    pub date: String,
    pub open: f64,
    pub high: f64,
    pub low: f64,
    pub close: f64,
    pub volume: u64,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct SectorData {
    pub name: String,
    pub etf: String,
    pub price: f64,
    pub change_1d: f64,
    pub change_1w: f64,
    pub change_1m: f64,
    pub change_3m: f64,
    pub momentum_score: f64,
    pub rotation_signal: String,
    pub volume_ratio: f64,
    pub vs_benchmark: Option<f64>,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct UnusualVolumeStock {
    pub symbol: String,
    pub name: String,
    pub price: f64,
    pub change_pct: f64,
    pub volume: u64,
    pub avg_volume: u64,
    pub volume_ratio: f64,
    pub sector: String,
}

#[derive(Debug, Clone, Serialize, Deserialize)]
pub struct TurnoverStock {
    pub rank: u32,
    pub symbol: String,
    pub name: String,
    pub price: f64,
    pub change_pct: f64,
    pub volume: u64,
    pub avg_volume: u64,
    pub turnover: f64,
    pub market_cap: Option<f64>,
    pub pe_ratio: Option<f64>,
    pub sector: String,
}
