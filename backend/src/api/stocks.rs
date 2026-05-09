use axum::{
    extract::Path,
    http::StatusCode,
    Json,
};

use crate::{
    models::{HistoryPoint, StockAnalysis},
    services::{
        indicators::{compute_buy_score, macd, rsi, signal_label, sma},
        yahoo::{fetch_chart, fetch_fundamentals, pct_change_from_history},
    },
};

pub async fn get_stock(
    Path(symbol): Path<String>,
) -> Result<Json<StockAnalysis>, (StatusCode, String)> {
    let symbol = symbol.to_uppercase();

    // Fetch chart and fundamentals in parallel
    let (chart_res, fund) = tokio::join!(
        fetch_chart(&symbol),
        fetch_fundamentals(&symbol)
    );

    let (history, meta) = chart_res.map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    let closes: Vec<f64> = history.iter().map(|h| h.close).collect();

    // Price from chart meta
    let price = meta["regularMarketPrice"].as_f64().unwrap_or(0.0);
    let change_pct = {
        let from_meta = meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
        if from_meta != 0.0 { from_meta } else { pct_change_from_history(&history, 1) }
    };
    let volume = meta["regularMarketVolume"].as_u64()
        .unwrap_or_else(|| history.last().map(|h| h.volume).unwrap_or(0));

    // Compute 3-month avg volume from history (last 63 trading days)
    let avg_volume = {
        let n = history.len().min(63);
        if n > 0 {
            history[history.len() - n..].iter().map(|h| h.volume).sum::<u64>() / n as u64
        } else { 0 }
    };
    let volume_ratio = if avg_volume > 0 { volume as f64 / avg_volume as f64 } else { 1.0 };

    let name = meta["shortName"]
        .as_str()
        .or_else(|| meta["longName"].as_str())
        .unwrap_or(&symbol)
        .to_string();
    let sector = meta["sector"].as_str().map(str::to_string);
    let industry = meta["industryDisp"]
        .as_str()
        .or_else(|| meta["industry"].as_str())
        .map(str::to_string);

    // Fundamental data from quoteSummary (crumb-authenticated)
    let summary = fund.as_ref().and_then(|f| f["summaryDetail"].as_object().map(|_| &f["summaryDetail"]));
    let key_stats = fund.as_ref().and_then(|f| f["defaultKeyStatistics"].as_object().map(|_| &f["defaultKeyStatistics"]));
    let fin_data = fund.as_ref().and_then(|f| f["financialData"].as_object().map(|_| &f["financialData"]));

    let pe_ratio = summary.and_then(|s| s["trailingPE"]["raw"].as_f64())
        .or_else(|| key_stats.and_then(|k| k["trailingPE"]["raw"].as_f64()))
        .or_else(|| meta["trailingPE"].as_f64());
    let eps = key_stats.and_then(|k| k["trailingEps"]["raw"].as_f64())
        .or_else(|| meta["epsTrailingTwelveMonths"].as_f64());
    let market_cap = summary.and_then(|s| s["marketCap"]["raw"].as_f64())
        .or_else(|| meta["marketCap"].as_f64());
    let profit_margin = fin_data.and_then(|f| f["profitMargins"]["raw"].as_f64());
    let debt_to_equity = fin_data.and_then(|f| f["debtToEquity"]["raw"].as_f64());
    let revenue_growth = fin_data.and_then(|f| f["revenueGrowth"]["raw"].as_f64());

    // Technical indicators
    let rsi_val = rsi(&closes, 14);
    let (macd_val, macd_sig) = macd(&closes).map(|(m, s)| (Some(m), Some(s))).unwrap_or((None, None));
    let sma_50 = sma(&closes, 50);
    let sma_200 = sma(&closes, 200);
    let price_vs_sma50 = sma_50.map(|s| (price - s) / s * 100.0);
    let price_vs_sma200 = sma_200.map(|s| (price - s) / s * 100.0);

    let buy_score = compute_buy_score(rsi_val, macd_val, macd_sig, price_vs_sma50, pe_ratio, volume_ratio);

    let technical_signal = {
        let mut score = 50.0f64;
        if let Some(r) = rsi_val {
            score = if r < 30.0 { 75.0 } else if r > 70.0 { 25.0 } else { 55.0 };
        }
        if let (Some(m), Some(s)) = (macd_val, macd_sig) {
            score = (score + if m > s { 70.0 } else { 30.0 }) / 2.0;
        }
        signal_label(score, "technical")
    };
    let fundamental_signal = {
        let score = match pe_ratio {
            Some(pe) if pe > 0.0 && pe <= 25.0 => 70.0,
            Some(pe) if pe > 25.0 && pe <= 40.0 => 50.0,
            Some(_) => 30.0,
            None => 50.0,
        };
        signal_label(score, "fundamental")
    };
    let volume_signal = signal_label(
        if volume_ratio >= 1.5 { 70.0 } else if volume_ratio < 0.8 { 35.0 } else { 50.0 },
        "volume",
    );

    Ok(Json(StockAnalysis {
        symbol,
        name,
        price,
        change_pct,
        volume,
        avg_volume,
        volume_ratio,
        pe_ratio,
        eps,
        market_cap,
        revenue_growth,
        profit_margin,
        debt_to_equity,
        rsi: rsi_val,
        macd: macd_val,
        macd_signal: macd_sig,
        sma_50,
        sma_200,
        price_vs_sma50,
        price_vs_sma200,
        buy_score,
        technical_signal,
        fundamental_signal,
        volume_signal,
        sector,
        industry,
    }))
}

pub async fn get_history(
    Path(symbol): Path<String>,
) -> Result<Json<Vec<HistoryPoint>>, (StatusCode, String)> {
    let symbol = symbol.to_uppercase();
    let (history, _) = fetch_chart(&symbol)
        .await
        .map_err(|e| (StatusCode::BAD_GATEWAY, e.to_string()))?;
    Ok(Json(history))
}
