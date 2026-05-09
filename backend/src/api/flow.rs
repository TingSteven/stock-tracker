use axum::{extract::Query, http::StatusCode, Json};
use futures::future::join_all;
use reqwest::Client;

use crate::{
    models::{MarketQuery, ScreenerQuery, StockAnalysis, TurnoverStock, UnusualVolumeStock},
    services::{
        indicators::{compute_buy_score, macd, rsi, signal_label, sma},
        sectors_static::{sector_map, tw_sector_map},
        yahoo::{fetch_chart, pct_change_from_history},
    },
};

const US_UNIVERSE: &[&str] = &[
    "AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA", "TSLA", "JPM", "V", "MA",
    "UNH", "JNJ", "PFE", "XOM", "CVX", "WMT", "HD", "BAC", "NFLX", "DIS",
    "PYPL", "ADBE", "CRM", "ORCL", "INTC", "AMD", "QCOM", "AVGO", "TXN", "MU",
    "GS", "MS", "BLK", "SPGI", "LLY", "MRK", "ABBV", "BMY", "AMGN", "CAT",
    "HON", "GE", "MMM", "BA", "RTX", "LMT", "DE", "EMR", "ETN", "NKE",
];

const TW_UNIVERSE: &[&str] = &[
    // 半導體
    "2330.TW", "2303.TW", "2344.TW", "2337.TW", "2408.TW",
    "3034.TW", "2379.TW", "2327.TW", "3711.TW",
    // 電子/科技
    "2317.TW", "2454.TW", "2308.TW", "2357.TW", "2382.TW",
    "2395.TW", "3008.TW", "6669.TW", "2354.TW", "2353.TW",
    "2376.TW", "2301.TW", "3231.TW",
    // 金融
    "2891.TW", "2882.TW", "2881.TW", "2886.TW", "2884.TW",
    "2892.TW", "2883.TW", "2880.TW", "2885.TW", "5876.TW",
    "2801.TW",
    // 電信
    "2412.TW", "4904.TW", "3045.TW",
    // 石化/材料
    "6505.TW", "1301.TW", "1303.TW", "1326.TW",
    // 鋼鐵/傳產
    "2002.TW", "2207.TW", "1216.TW", "2912.TW",
    // ETF
    "0050.TW", "0056.TW",
];

// Fetch current price/volume data using chart API (v8) — avoids blocked v7 batch-quote API
struct ChartData {
    name: String,
    price: f64,
    change_pct: f64,
    volume: u64,
    avg_volume: u64,
    market_cap: Option<f64>,
    pe_ratio: Option<f64>,
    sector: Option<String>,
}

async fn fetch_current(sym: &str) -> Option<ChartData> {
    let (history, meta) = fetch_chart(sym).await.ok()?;
    let price = meta["regularMarketPrice"].as_f64()?;
    let volume = meta["regularMarketVolume"].as_u64().unwrap_or(0);
    let change_pct = {
        let from_meta = meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
        if from_meta != 0.0 { from_meta } else { pct_change_from_history(&history, 1) }
    };
    let n = history.len().min(63);
    let avg_volume = if n > 0 {
        history[history.len() - n..].iter().map(|h| h.volume).sum::<u64>() / n as u64
    } else { 1 };
    let market_cap = meta["marketCap"].as_f64();
    let pe_ratio = meta["trailingPE"].as_f64();
    let name = meta["shortName"].as_str()
        .or_else(|| meta["longName"].as_str())
        .unwrap_or(sym)
        .to_string();
    let sector = meta["sector"].as_str().map(str::to_string);
    Some(ChartData { name, price, change_pct, volume, avg_volume, market_cap, pe_ratio, sector })
}

pub async fn get_unusual_volume(
    Query(params): Query<MarketQuery>,
) -> Result<Json<Vec<UnusualVolumeStock>>, (StatusCode, String)> {
    let is_tw = params.market == "tw";
    let universe: &[&str] = if is_tw { TW_UNIVERSE } else { US_UNIVERSE };
    let sectors = if is_tw { tw_sector_map() } else { sector_map() };

    let futures: Vec<_> = universe.iter().map(|&s| fetch_current(s)).collect();
    let results = join_all(futures).await;

    let mut stocks: Vec<UnusualVolumeStock> = universe
        .iter()
        .zip(results.into_iter())
        .filter_map(|(&sym, data)| {
            let d = data?;
            let volume_ratio = d.volume as f64 / d.avg_volume.max(1) as f64;
            let sector = sectors
                .get(sym)
                .map(|&s| s.to_string())
                .or(d.sector)
                .unwrap_or_else(|| "其他".to_string());
            Some(UnusualVolumeStock {
                symbol: sym.to_string(),
                name: d.name,
                price: d.price,
                change_pct: d.change_pct,
                volume: d.volume,
                avg_volume: d.avg_volume,
                volume_ratio,
                sector,
            })
        })
        .collect();

    stocks.sort_by(|a, b| b.volume_ratio.partial_cmp(&a.volume_ratio).unwrap_or(std::cmp::Ordering::Equal));
    stocks.truncate(20);
    Ok(Json(stocks))
}

async fn analyze_stock(symbol: &str) -> Option<StockAnalysis> {
    let (history, meta) = fetch_chart(symbol).await.ok()?;
    let closes: Vec<f64> = history.iter().map(|h| h.close).collect();

    let price = meta["regularMarketPrice"].as_f64()?;
    let change_pct = {
        let from_meta = meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
        if from_meta != 0.0 { from_meta } else { pct_change_from_history(&history, 1) }
    };
    let volume = meta["regularMarketVolume"].as_u64().unwrap_or(0);
    let n = history.len().min(63);
    let avg_volume = if n > 0 {
        history[history.len() - n..].iter().map(|h| h.volume).sum::<u64>() / n as u64
    } else { 1 };
    let volume_ratio = volume as f64 / avg_volume.max(1) as f64;
    let pe_ratio = meta["trailingPE"].as_f64();
    let eps = meta["epsTrailingTwelveMonths"].as_f64();
    let market_cap = meta["marketCap"].as_f64();
    let name = meta["shortName"].as_str()
        .or_else(|| meta["longName"].as_str())
        .unwrap_or(symbol)
        .to_string();
    let sector = meta["sector"].as_str().map(str::to_string);
    let industry = meta["industryDisp"]
        .as_str()
        .or_else(|| meta["industry"].as_str())
        .map(str::to_string);

    let rsi_val = rsi(&closes, 14);
    let (macd_val, macd_sig) = macd(&closes)
        .map(|(m, s)| (Some(m), Some(s)))
        .unwrap_or((None, None));
    let sma_50 = sma(&closes, 50);
    let sma_200 = sma(&closes, 200);
    let price_vs_sma50 = sma_50.map(|s| (price - s) / s * 100.0);
    let price_vs_sma200 = sma_200.map(|s| (price - s) / s * 100.0);

    let buy_score = compute_buy_score(rsi_val, macd_val, macd_sig, price_vs_sma50, pe_ratio, volume_ratio);

    let technical_score = {
        let mut score = 50.0f64;
        if let Some(r) = rsi_val {
            score = if r < 30.0 { 75.0 } else if r > 70.0 { 25.0 } else { 55.0 };
        }
        if let (Some(m), Some(s)) = (macd_val, macd_sig) {
            score = (score + if m > s { 70.0 } else { 30.0 }) / 2.0;
        }
        score
    };
    let fundamental_score = match pe_ratio {
        Some(pe) if pe > 0.0 && pe <= 25.0 => 70.0,
        Some(pe) if pe > 25.0 && pe <= 40.0 => 50.0,
        Some(_) => 30.0,
        None => 50.0,
    };
    let volume_score = if volume_ratio >= 1.5 { 70.0 } else if volume_ratio < 0.8 { 35.0 } else { 50.0 };

    Some(StockAnalysis {
        symbol: symbol.to_string(),
        name,
        price,
        change_pct,
        volume,
        avg_volume,
        volume_ratio,
        pe_ratio,
        eps,
        market_cap,
        revenue_growth: None,
        profit_margin: None,
        debt_to_equity: None,
        rsi: rsi_val,
        macd: macd_val,
        macd_signal: macd_sig,
        sma_50,
        sma_200,
        price_vs_sma50,
        price_vs_sma200,
        buy_score,
        technical_signal: signal_label(technical_score, "technical"),
        fundamental_signal: signal_label(fundamental_score, "fundamental"),
        volume_signal: signal_label(volume_score, "volume"),
        sector,
        industry,
    })
}

pub async fn get_screener(
    Query(params): Query<ScreenerQuery>,
) -> Result<Json<Vec<StockAnalysis>>, (StatusCode, String)> {
    let futures: Vec<_> = US_UNIVERSE.iter().map(|s| analyze_stock(s)).collect();
    let results = join_all(futures).await;

    let mut stocks: Vec<StockAnalysis> = results
        .into_iter()
        .flatten()
        .filter(|s| {
            if let Some(max_pe) = params.pe_max {
                if s.pe_ratio.map(|p| p > max_pe).unwrap_or(false) { return false; }
            }
            if let Some(rsi_min) = params.rsi_min {
                if s.rsi.map(|r| r < rsi_min).unwrap_or(true) { return false; }
            }
            if let Some(rsi_max) = params.rsi_max {
                if s.rsi.map(|r| r > rsi_max).unwrap_or(true) { return false; }
            }
            if let Some(vol_min) = params.volume_ratio_min {
                if s.volume_ratio < vol_min { return false; }
            }
            if let Some(cap_min) = params.min_market_cap {
                if s.market_cap.map(|c| c < cap_min).unwrap_or(true) { return false; }
            }
            true
        })
        .collect();

    stocks.sort_by(|a, b| b.buy_score.partial_cmp(&a.buy_score).unwrap_or(std::cmp::Ordering::Equal));
    stocks.truncate(20);
    Ok(Json(stocks))
}

pub async fn get_top_turnover(
    Query(params): Query<MarketQuery>,
) -> Result<Json<Vec<TurnoverStock>>, (StatusCode, String)> {
    if params.market == "tw" {
        return get_top_turnover_tw().await;
    }
    get_top_turnover_us().await
}

async fn get_top_turnover_tw() -> Result<Json<Vec<TurnoverStock>>, (StatusCode, String)> {
    let tw_sectors = tw_sector_map();
    let futures: Vec<_> = TW_UNIVERSE.iter().map(|&s| fetch_current(s)).collect();
    let results = join_all(futures).await;

    let mut stocks: Vec<TurnoverStock> = TW_UNIVERSE
        .iter()
        .zip(results.into_iter())
        .filter_map(|(&sym, data)| {
            let d = data?;
            let turnover = d.price * d.volume as f64;
            let sector = tw_sectors
                .get(sym)
                .map(|&s| s.to_string())
                .or(d.sector)
                .unwrap_or_else(|| "其他".to_string());
            Some(TurnoverStock {
                rank: 0,
                symbol: sym.to_string(),
                name: d.name,
                price: d.price,
                change_pct: d.change_pct,
                volume: d.volume,
                avg_volume: d.avg_volume,
                turnover,
                market_cap: d.market_cap,
                pe_ratio: d.pe_ratio,
                sector,
            })
        })
        .collect();

    stocks.sort_by(|a, b| b.turnover.partial_cmp(&a.turnover).unwrap_or(std::cmp::Ordering::Equal));
    for (i, s) in stocks.iter_mut().enumerate() {
        s.rank = (i + 1) as u32;
    }
    Ok(Json(stocks))
}

async fn get_top_turnover_us() -> Result<Json<Vec<TurnoverStock>>, (StatusCode, String)> {
    let url = "https://query1.finance.yahoo.com/v1/finance/screener/predefined/saved\
               ?formatted=false&lang=en-US&region=US&scrIds=most_actives&count=100&offset=0";

    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .map_err(|e| (StatusCode::INTERNAL_SERVER_ERROR, e.to_string()))?;

    let resp: serde_json::Value = client
        .get(url)
        .send()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?
        .json()
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;

    let quotes = resp["finance"]["result"][0]["quotes"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    // If screener returns empty, fall back to US_UNIVERSE via chart API
    if quotes.is_empty() {
        return get_top_turnover_us_fallback().await;
    }

    let sectors = sector_map();
    let mut stocks: Vec<TurnoverStock> = quotes
        .iter()
        .filter_map(|q| {
            let symbol = q["symbol"].as_str()?.to_string();
            let name = q["shortName"].as_str().or_else(|| q["longName"].as_str()).unwrap_or(&symbol).to_string();
            let price = q["regularMarketPrice"].as_f64()?;
            let volume = q["regularMarketVolume"].as_u64()?;
            let change_pct = q["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
            let avg_volume = q["averageDailyVolume3Month"].as_u64().unwrap_or(1);
            let market_cap = q["marketCap"].as_f64();
            let pe_ratio = q["trailingPE"].as_f64();
            let turnover = price * volume as f64;
            let sector = sectors.get(symbol.as_str()).map(|&s| s.to_string()).unwrap_or_else(|| "Other".to_string());
            Some(TurnoverStock { rank: 0, symbol, name, price, change_pct, volume, avg_volume, turnover, market_cap, pe_ratio, sector })
        })
        .collect();

    stocks.sort_by(|a, b| b.turnover.partial_cmp(&a.turnover).unwrap_or(std::cmp::Ordering::Equal));
    stocks.truncate(100);
    for (i, s) in stocks.iter_mut().enumerate() { s.rank = (i + 1) as u32; }
    Ok(Json(stocks))
}

async fn get_top_turnover_us_fallback() -> Result<Json<Vec<TurnoverStock>>, (StatusCode, String)> {
    let sectors = sector_map();
    let futures: Vec<_> = US_UNIVERSE.iter().map(|&s| fetch_current(s)).collect();
    let results = join_all(futures).await;

    let mut stocks: Vec<TurnoverStock> = US_UNIVERSE
        .iter()
        .zip(results.into_iter())
        .filter_map(|(&sym, data)| {
            let d = data?;
            let turnover = d.price * d.volume as f64;
            let sector = sectors.get(sym).map(|&s| s.to_string()).or(d.sector).unwrap_or_else(|| "Other".to_string());
            Some(TurnoverStock {
                rank: 0,
                symbol: sym.to_string(),
                name: d.name,
                price: d.price,
                change_pct: d.change_pct,
                volume: d.volume,
                avg_volume: d.avg_volume,
                turnover,
                market_cap: d.market_cap,
                pe_ratio: d.pe_ratio,
                sector,
            })
        })
        .collect();

    stocks.sort_by(|a, b| b.turnover.partial_cmp(&a.turnover).unwrap_or(std::cmp::Ordering::Equal));
    for (i, s) in stocks.iter_mut().enumerate() { s.rank = (i + 1) as u32; }
    Ok(Json(stocks))
}
