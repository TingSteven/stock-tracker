use serde_json::Value;
use worker::{Fetch, Headers, Method, Request, RequestInit};

use crate::models::HistoryPoint;

pub async fn fetch_chart(symbol: &str) -> worker::Result<(Vec<HistoryPoint>, Value)> {
    let url = format!(
        "https://query1.finance.yahoo.com/v8/finance/chart/{}?interval=1d&range=1y",
        symbol
    );

    let mut headers = Headers::new();
    headers.set(
        "User-Agent",
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36",
    )?;
    headers.set("Accept", "application/json")?;

    let mut init = RequestInit::new();
    init.with_method(Method::Get);
    init.with_headers(headers);

    let req = Request::new_with_init(&url, &init)?;
    let mut resp = Fetch::Request(req).send().await?;

    if resp.status_code() != 200 {
        return Err(worker::Error::RustError(format!(
            "HTTP {} for {}",
            resp.status_code(),
            symbol
        )));
    }

    let json: Value = resp.json().await?;

    let result = json["chart"]["result"]
        .as_array()
        .and_then(|a| a.first())
        .ok_or_else(|| {
            worker::Error::RustError(format!("No chart result for {}", symbol))
        })?
        .clone();

    parse_history(&result).map_err(worker::Error::RustError)
}

fn parse_history(result: &Value) -> Result<(Vec<HistoryPoint>, Value), String> {
    let meta = result["meta"].clone();
    let timestamps = result["timestamp"]
        .as_array()
        .ok_or_else(|| "No timestamps".to_string())?;

    let quote = &result["indicators"]["quote"][0];
    let opens = quote["open"].as_array().cloned().unwrap_or_default();
    let highs = quote["high"].as_array().cloned().unwrap_or_default();
    let lows = quote["low"].as_array().cloned().unwrap_or_default();
    let closes = quote["close"].as_array().cloned().unwrap_or_default();
    let volumes = quote["volume"].as_array().cloned().unwrap_or_default();

    let mut history = Vec::new();
    for i in 0..timestamps.len() {
        let ts = match timestamps[i].as_i64() {
            Some(t) => t,
            None => continue,
        };
        let open = match opens.get(i).and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => continue,
        };
        let high = match highs.get(i).and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => continue,
        };
        let low = match lows.get(i).and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => continue,
        };
        let close = match closes.get(i).and_then(|v| v.as_f64()) {
            Some(v) => v,
            None => continue,
        };
        let volume = volumes.get(i).and_then(|v| v.as_u64()).unwrap_or(0);

        history.push(HistoryPoint {
            date: ts_to_date(ts),
            open,
            high,
            low,
            close,
            volume,
        });
    }

    Ok((history, meta))
}

fn ts_to_date(ts: i64) -> String {
    let days = ts / 86400;
    let (y, m, d) = days_to_ymd(days);
    format!("{:04}-{:02}-{:02}", y, m, d)
}

fn days_to_ymd(mut days: i64) -> (i32, u32, u32) {
    let mut y = 1970i32;
    loop {
        let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
        let dy = if leap { 366i64 } else { 365i64 };
        if days < dy {
            break;
        }
        days -= dy;
        y += 1;
    }

    let leap = y % 4 == 0 && (y % 100 != 0 || y % 400 == 0);
    let mdays: [i64; 12] = if leap {
        [31, 29, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    } else {
        [31, 28, 31, 30, 31, 30, 31, 31, 30, 31, 30, 31]
    };

    let mut m = 0usize;
    while m < 11 && days >= mdays[m] {
        days -= mdays[m];
        m += 1;
    }

    (y, (m + 1) as u32, (days + 1) as u32)
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
