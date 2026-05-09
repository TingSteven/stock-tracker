use anyhow::{anyhow, Result};
use chrono::{DateTime, Utc};
use reqwest::{Client, cookie::Jar};
use serde_json::Value;
use std::sync::{Arc, OnceLock};
use tokio::sync::Mutex;

use crate::models::HistoryPoint;

// Cached crumb: (crumb_string, client_with_cookies)
static CRUMB_CACHE: OnceLock<Mutex<Option<(String, Client)>>> = OnceLock::new();

fn crumb_cache() -> &'static Mutex<Option<(String, Client)>> {
    CRUMB_CACHE.get_or_init(|| Mutex::new(None))
}

fn plain_client() -> Client {
    Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .timeout(std::time::Duration::from_secs(15))
        .build()
        .unwrap()
}

async fn get_crumb_client() -> Result<(String, Client)> {
    // Return cached crumb if available
    {
        let cache = crumb_cache().lock().await;
        if let Some((crumb, client)) = cache.as_ref() {
            return Ok((crumb.clone(), client.clone()));
        }
    }

    // Build a client with cookie store
    let jar = Arc::new(Jar::default());
    let client = Client::builder()
        .user_agent("Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36")
        .cookie_provider(jar)
        .cookie_store(true)
        .timeout(std::time::Duration::from_secs(15))
        .build()?;

    // Step 1: visit fc.yahoo.com to set cookies
    let _ = client.get("https://fc.yahoo.com").send().await;

    // Step 2: get crumb
    let crumb_resp = client
        .get("https://query1.finance.yahoo.com/v1/test/getcrumb")
        .header("Accept", "*/*")
        .header("Origin", "https://finance.yahoo.com")
        .header("Referer", "https://finance.yahoo.com/")
        .send()
        .await?
        .text()
        .await?;

    let crumb = crumb_resp.trim().to_string();
    if crumb.is_empty() || crumb.contains("Unauthorized") || crumb.contains("{") {
        return Err(anyhow!("Failed to get crumb: {}", crumb));
    }

    // Cache it
    {
        let mut cache = crumb_cache().lock().await;
        *cache = Some((crumb.clone(), client.clone()));
    }

    Ok((crumb, client))
}

/// Fetch fundamental data (PE, EPS, market cap, etc.) via Yahoo Finance quoteSummary.
/// Returns None if unavailable.
pub async fn fetch_fundamentals(symbol: &str) -> Option<Value> {
    let (crumb, client) = get_crumb_client().await.ok()?;

    let url = format!(
        "https://query1.finance.yahoo.com/v10/finance/quoteSummary/{}?modules=summaryDetail,defaultKeyStatistics,financialData&crumb={}",
        symbol, crumb
    );

    let resp: Value = client
        .get(&url)
        .header("Accept", "application/json")
        .header("Origin", "https://finance.yahoo.com")
        .header("Referer", "https://finance.yahoo.com/")
        .send()
        .await
        .ok()?
        .json()
        .await
        .ok()?;

    // If crumb expired, clear cache and let next call retry
    if resp["quoteSummary"]["error"]["code"].as_str() == Some("Invalid Crumb") {
        let mut cache = crumb_cache().lock().await;
        *cache = None;
        return None;
    }

    resp["quoteSummary"]["result"]
        .as_array()
        .and_then(|a| a.first())
        .cloned()
}

fn parse_history(result: &Value) -> Result<(Vec<HistoryPoint>, Value)> {
    let meta = result["meta"].clone();
    let timestamps = result["timestamp"]
        .as_array()
        .ok_or_else(|| anyhow!("No timestamps"))?;

    let quote = &result["indicators"]["quote"][0];
    let opens = quote["open"].as_array().unwrap_or(&vec![]).clone();
    let highs = quote["high"].as_array().unwrap_or(&vec![]).clone();
    let lows = quote["low"].as_array().unwrap_or(&vec![]).clone();
    let closes = quote["close"].as_array().unwrap_or(&vec![]).clone();
    let volumes = quote["volume"].as_array().unwrap_or(&vec![]).clone();

    let mut history = Vec::new();
    for i in 0..timestamps.len() {
        let ts = match timestamps[i].as_i64() { Some(t) => t, None => continue };
        let open = match opens.get(i).and_then(|v| v.as_f64()) { Some(v) => v, None => continue };
        let high = match highs.get(i).and_then(|v| v.as_f64()) { Some(v) => v, None => continue };
        let low = match lows.get(i).and_then(|v| v.as_f64()) { Some(v) => v, None => continue };
        let close = match closes.get(i).and_then(|v| v.as_f64()) { Some(v) => v, None => continue };
        let volume = volumes.get(i).and_then(|v| v.as_u64()).unwrap_or(0);
        let dt: DateTime<Utc> = DateTime::from_timestamp(ts, 0).unwrap_or_default();
        history.push(HistoryPoint {
            date: dt.format("%Y-%m-%d").to_string(),
            open, high, low, close, volume,
        });
    }

    Ok((history, meta))
}

pub async fn fetch_chart(symbol: &str) -> Result<(Vec<HistoryPoint>, Value)> {
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1y",
        symbol
    );

    let mut last_err = anyhow!("no attempts");
    for attempt in 0u64..3 {
        if attempt > 0 {
            tokio::time::sleep(std::time::Duration::from_millis(600 * attempt)).await;
        }
        let resp: Value = match plain_client().get(&url).send().await {
            Ok(r) => match r.json().await {
                Ok(v) => v,
                Err(e) => { last_err = e.into(); continue; }
            },
            Err(e) => { last_err = e.into(); continue; }
        };
        if let Some(result) = resp["chart"]["result"].as_array().and_then(|a| a.first()) {
            return parse_history(result);
        }
        last_err = anyhow!("No chart result for {}", symbol);
    }
    Err(last_err)
}


pub fn pct_change_from_history(history: &[HistoryPoint], days_ago: usize) -> f64 {
    if history.len() < days_ago + 1 {
        return 0.0;
    }
    let past_close = history[history.len() - days_ago - 1].close;
    let current_close = history.last().map(|h| h.close).unwrap_or(0.0);
    if past_close == 0.0 {
        return 0.0;
    }
    (current_close - past_close) / past_close * 100.0
}
