use worker::{Request, Response, RouteContext};

use crate::{
    indicators::{compute_buy_score, macd, rsi, signal_label, sma},
    models::{HistoryPoint, StockAnalysis},
    yahoo::{fetch_chart, pct_change_from_history},
};

pub async fn get_stock(_req: Request, ctx: RouteContext<()>) -> worker::Result<Response> {
    let symbol = ctx
        .param("symbol")
        .map(|s| s.to_uppercase())
        .ok_or_else(|| worker::Error::RustError("Missing symbol".to_string()))?;

    let (history, meta) = fetch_chart(&symbol)
        .await
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    let closes: Vec<f64> = history.iter().map(|h| h.close).collect();

    let price = meta["regularMarketPrice"].as_f64().unwrap_or(0.0);
    let change_pct = {
        let v = meta["regularMarketChangePercent"].as_f64().unwrap_or(0.0);
        if v != 0.0 { v } else { pct_change_from_history(&history, 1) }
    };
    let volume = meta["regularMarketVolume"]
        .as_u64()
        .unwrap_or_else(|| history.last().map(|h| h.volume).unwrap_or(0));

    let avg_volume = {
        let n = history.len().min(63);
        if n > 0 {
            history[history.len() - n..].iter().map(|h| h.volume).sum::<u64>() / n as u64
        } else {
            1
        }
    };
    let volume_ratio = if avg_volume > 0 {
        volume as f64 / avg_volume as f64
    } else {
        1.0
    };

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

    // Fundamentals available from chart meta (no crumb needed)
    let pe_ratio = meta["trailingPE"].as_f64();
    let eps = meta["epsTrailingTwelveMonths"].as_f64();
    let market_cap = meta["marketCap"].as_f64();

    // Technical indicators
    let rsi_val = rsi(&closes, 14);
    let (macd_val, macd_sig) = macd(&closes)
        .map(|(m, s)| (Some(m), Some(s)))
        .unwrap_or((None, None));
    let sma_50 = sma(&closes, 50);
    let sma_200 = sma(&closes, 200);
    let price_vs_sma50 = sma_50.map(|s| (price - s) / s * 100.0);
    let price_vs_sma200 = sma_200.map(|s| (price - s) / s * 100.0);

    let buy_score =
        compute_buy_score(rsi_val, macd_val, macd_sig, price_vs_sma50, pe_ratio, volume_ratio);

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
        if volume_ratio >= 1.5 {
            70.0
        } else if volume_ratio < 0.8 {
            35.0
        } else {
            50.0
        },
        "volume",
    );

    Response::from_json(&StockAnalysis {
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
        technical_signal,
        fundamental_signal,
        volume_signal,
        sector,
        industry,
    })
}

pub async fn get_history(_req: Request, ctx: RouteContext<()>) -> worker::Result<Response> {
    let symbol = ctx
        .param("symbol")
        .map(|s| s.to_uppercase())
        .ok_or_else(|| worker::Error::RustError("Missing symbol".to_string()))?;

    let (history, _) = fetch_chart(&symbol)
        .await
        .map_err(|e| worker::Error::RustError(e.to_string()))?;

    Response::from_json(&history as &Vec<HistoryPoint>)
}
