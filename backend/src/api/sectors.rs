use axum::{extract::Query, http::StatusCode, Json};
use futures::future::join_all;

use crate::{
    models::{MarketQuery, SectorData},
    services::yahoo::{fetch_chart, pct_change_from_history},
};

// US sector ETFs (SPDR Select Sector)
const US_SECTORS: &[(&str, &str)] = &[
    ("Technology", "XLK"),
    ("Healthcare", "XLV"),
    ("Financials", "XLF"),
    ("Energy", "XLE"),
    ("Industrials", "XLI"),
    ("Consumer Discretionary", "XLY"),
    ("Consumer Staples", "XLP"),
    ("Utilities", "XLU"),
    ("Real Estate", "XLRE"),
    ("Materials", "XLB"),
    ("Communication Services", "XLC"),
];

// TW sectors — multiple representative stocks per sector, averaged for signal
const TW_SECTORS_MULTI: &[(&str, &[&str])] = &[
    ("半導體製造", &["2330.TW", "2303.TW"]),
    ("IC設計",    &["2454.TW", "3034.TW", "2379.TW"]),
    ("AI伺服器",  &["2382.TW", "6669.TW", "3231.TW"]),
    ("記憶體DRAM",&["2408.TW", "2344.TW", "2337.TW"]),
    ("半導體封測", &["3711.TW"]),
    ("被動元件",  &["2327.TW"]),
    ("電子製造",  &["2317.TW", "2354.TW"]),
    ("電子零組件",&["2308.TW", "3008.TW", "2301.TW"]),
    ("電腦周邊",  &["2357.TW", "2353.TW", "2376.TW", "2395.TW"]),
    ("金融保險",  &["2882.TW", "2881.TW", "2891.TW", "2886.TW", "2884.TW"]),
    ("電信通訊",  &["2412.TW", "4904.TW", "3045.TW"]),
    ("石化原料",  &["6505.TW", "1301.TW", "1303.TW", "1326.TW"]),
    ("鋼鐵傳產",  &["2002.TW"]),
    ("食品消費",  &["1216.TW", "2912.TW"]),
    ("汽車運輸",  &["2207.TW"]),
];

const TW_BENCHMARK: &str = "0050.TW";

// Fetch a single-symbol sector (used for US ETFs and TW benchmark)
async fn fetch_sector_single(name: &str, symbol: &str) -> Option<SectorData> {
    let (history, meta) = fetch_chart(symbol).await.ok()?;

    let price = meta["regularMarketPrice"].as_f64().unwrap_or(0.0);
    let change_1d = {
        let from_meta = meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
        if from_meta != 0.0 { from_meta } else { pct_change_from_history(&history, 1) }
    };
    let volume = meta["regularMarketVolume"].as_u64().unwrap_or(0);
    let avg_volume = meta["averageDailyVolume3Month"].as_u64().unwrap_or(1);
    let volume_ratio = volume as f64 / avg_volume.max(1) as f64;

    let change_1w = pct_change_from_history(&history, 5);
    let change_1m = pct_change_from_history(&history, 21);
    let change_3m = pct_change_from_history(&history, 63);
    let momentum_score = change_3m * 0.4 + change_1m * 0.3 + change_1w * 0.2 + change_1d * 0.1;

    let rotation_signal = if momentum_score > 5.0 {
        "inflow".to_string()
    } else if momentum_score < -5.0 {
        "outflow".to_string()
    } else {
        "neutral".to_string()
    };

    Some(SectorData {
        name: name.to_string(),
        etf: symbol.to_string(),
        price,
        change_1d,
        change_1w,
        change_1m,
        change_3m,
        momentum_score,
        rotation_signal,
        volume_ratio,
        vs_benchmark: None,
    })
}

// Fetch multi-stock sector: average changes across all symbols, use lead stock for price
async fn fetch_sector_multi(name: &str, symbols: &[&str], bench_momentum: f64) -> Option<SectorData> {
    use serde_json::Value;
    use crate::models::HistoryPoint;

    let futures: Vec<_> = symbols.iter().map(|&s| fetch_chart(s)).collect();
    let results = join_all(futures).await;

    let valid: Vec<(Vec<HistoryPoint>, Value)> = results.into_iter().filter_map(|r| r.ok()).collect();
    if valid.is_empty() { return None; }

    let n = valid.len() as f64;
    let price = valid[0].1["regularMarketPrice"].as_f64().unwrap_or(0.0);

    let mut sum_1d = 0.0f64;
    let mut sum_1w = 0.0f64;
    let mut sum_1m = 0.0f64;
    let mut sum_3m = 0.0f64;
    let mut sum_vr = 0.0f64;

    for (hist, meta) in &valid {
        let d1 = {
            let v = meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
            if v != 0.0 { v } else { pct_change_from_history(hist, 1) }
        };
        sum_1d += d1;
        sum_1w += pct_change_from_history(hist, 5);
        sum_1m += pct_change_from_history(hist, 21);
        sum_3m += pct_change_from_history(hist, 63);
        let vol = meta["regularMarketVolume"].as_u64().unwrap_or(0);
        let avg_vol = meta["averageDailyVolume3Month"].as_u64().unwrap_or(1);
        sum_vr += vol as f64 / avg_vol.max(1) as f64;
    }

    let change_1d    = sum_1d / n;
    let change_1w    = sum_1w / n;
    let change_1m    = sum_1m / n;
    let change_3m    = sum_3m / n;
    let volume_ratio = sum_vr / n;

    let momentum_score = change_3m * 0.4 + change_1m * 0.3 + change_1w * 0.2 + change_1d * 0.1;
    let vs_benchmark   = momentum_score - bench_momentum;

    let rotation_signal = if vs_benchmark > 3.0 {
        "inflow".to_string()
    } else if vs_benchmark < -3.0 {
        "outflow".to_string()
    } else {
        "neutral".to_string()
    };

    Some(SectorData {
        name: name.to_string(),
        etf: symbols[0].to_string(),
        price,
        change_1d,
        change_1w,
        change_1m,
        change_3m,
        momentum_score,
        rotation_signal,
        volume_ratio,
        vs_benchmark: Some(vs_benchmark),
    })
}

pub async fn get_sectors(
    Query(params): Query<MarketQuery>,
) -> Result<Json<Vec<SectorData>>, (StatusCode, String)> {
    if params.market == "tw" {
        // Fetch benchmark (0050) first, then all sectors in parallel
        let bench = fetch_sector_single("大盤(0050)", TW_BENCHMARK).await;
        let bench_momentum = bench.as_ref().map(|b| b.momentum_score).unwrap_or(0.0);

        let futures: Vec<_> = TW_SECTORS_MULTI
            .iter()
            .map(|(name, symbols)| fetch_sector_multi(name, symbols, bench_momentum))
            .collect();

        let results = join_all(futures).await;
        let mut data: Vec<SectorData> = results.into_iter().flatten().collect();
        data.sort_by(|a, b| b.momentum_score.partial_cmp(&a.momentum_score).unwrap_or(std::cmp::Ordering::Equal));

        // Prepend benchmark entry so frontend can display it separately
        if let Some(mut b) = bench {
            b.vs_benchmark = Some(0.0);
            data.insert(0, b);
        }

        Ok(Json(data))
    } else {
        let futures: Vec<_> = US_SECTORS
            .iter()
            .map(|(name, etf)| fetch_sector_single(name, etf))
            .collect();

        let results = join_all(futures).await;
        let mut data: Vec<SectorData> = results.into_iter().flatten().collect();
        data.sort_by(|a, b| b.momentum_score.partial_cmp(&a.momentum_score).unwrap_or(std::cmp::Ordering::Equal));

        Ok(Json(data))
    }
}
