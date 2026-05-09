pub fn sma(prices: &[f64], period: usize) -> Option<f64> {
    if prices.len() < period {
        return None;
    }
    let slice = &prices[prices.len() - period..];
    Some(slice.iter().sum::<f64>() / period as f64)
}

pub fn ema(prices: &[f64], period: usize) -> Vec<f64> {
    if prices.len() < period {
        return vec![];
    }
    let k = 2.0 / (period as f64 + 1.0);
    let initial: f64 = prices[..period].iter().sum::<f64>() / period as f64;
    let mut result = vec![initial];
    for price in &prices[period..] {
        let prev = *result.last().unwrap();
        result.push(price * k + prev * (1.0 - k));
    }
    result
}

pub fn rsi(prices: &[f64], period: usize) -> Option<f64> {
    if prices.len() < period + 1 {
        return None;
    }
    let slice = &prices[prices.len() - (period + 1)..];
    let (mut gains, mut losses) = (0.0f64, 0.0f64);
    for i in 1..slice.len() {
        let change = slice[i] - slice[i - 1];
        if change > 0.0 {
            gains += change;
        } else {
            losses += change.abs();
        }
    }
    let avg_gain = gains / period as f64;
    let avg_loss = losses / period as f64;
    if avg_loss == 0.0 {
        return Some(100.0);
    }
    Some(100.0 - (100.0 / (1.0 + avg_gain / avg_loss)))
}

pub fn macd(prices: &[f64]) -> Option<(f64, f64)> {
    let ema12 = ema(prices, 12);
    let ema26 = ema(prices, 26);
    if ema12.len() < ema26.len() || ema26.is_empty() {
        return None;
    }
    let offset = ema12.len() - ema26.len();
    let macd_line: Vec<f64> = ema26
        .iter()
        .enumerate()
        .map(|(i, &e26)| ema12[i + offset] - e26)
        .collect();
    if macd_line.len() < 9 {
        return None;
    }
    let signal_ema = ema(&macd_line, 9);
    Some((*macd_line.last()?, *signal_ema.last()?))
}

pub fn compute_buy_score(
    rsi_val: Option<f64>,
    macd_val: Option<f64>,
    macd_signal: Option<f64>,
    price_vs_sma50: Option<f64>,
    pe_ratio: Option<f64>,
    volume_ratio: f64,
) -> f64 {
    let technical = {
        let mut score = 50.0f64;
        let mut weight = 1.0f64;

        if let Some(r) = rsi_val {
            let rsi_score = if r < 30.0 {
                75.0
            } else if r <= 50.0 {
                60.0
            } else if r <= 70.0 {
                55.0 - (r - 50.0) * 0.5
            } else {
                25.0
            };
            score = (score * weight + rsi_score) / (weight + 1.0);
            weight += 1.0;
        }
        if let (Some(m), Some(s)) = (macd_val, macd_signal) {
            let macd_score = if m > s { 70.0 } else { 35.0 };
            score = (score * weight + macd_score) / (weight + 1.0);
            weight += 1.0;
        }
        if let Some(vs50) = price_vs_sma50 {
            let sma_score = if vs50 > 0.0 && vs50 < 10.0 {
                70.0
            } else if vs50 >= 10.0 {
                50.0
            } else {
                35.0
            };
            score = (score * weight + sma_score) / (weight + 1.0);
        }
        score
    };

    let fundamental = match pe_ratio {
        Some(pe) if pe > 0.0 && pe <= 15.0 => 80.0,
        Some(pe) if pe > 15.0 && pe <= 25.0 => 65.0,
        Some(pe) if pe > 25.0 && pe <= 40.0 => 50.0,
        Some(pe) if pe > 40.0 => 30.0,
        _ => 50.0,
    };

    let volume = if volume_ratio >= 3.0 {
        80.0
    } else if volume_ratio >= 2.0 {
        70.0
    } else if volume_ratio >= 1.5 {
        60.0
    } else if volume_ratio >= 1.0 {
        50.0
    } else {
        35.0
    };

    (technical * 0.4 + fundamental * 0.3 + volume * 0.3).clamp(0.0, 100.0)
}

pub fn signal_label(score: f64, kind: &str) -> String {
    match kind {
        "technical" | "fundamental" | "volume" => {
            if score >= 65.0 {
                "bullish".to_string()
            } else if score <= 40.0 {
                "bearish".to_string()
            } else {
                "neutral".to_string()
            }
        }
        _ => "neutral".to_string(),
    }
}
