use anyhow::Result;
use reqwest::Client;
use serde_json::Value;

pub async fn fetch_institutional_filings(symbol: &str) -> Result<Vec<Value>> {
    let today = chrono::Utc::now().format("%Y-%m-%d").to_string();
    let one_year_ago = (chrono::Utc::now() - chrono::Duration::days(365))
        .format("%Y-%m-%d")
        .to_string();

    let url = format!(
        "https://efts.sec.gov/LATEST/search-index?q=%22{}%22&dateRange=custom&startdt={}&enddt={}&forms=13F-HR",
        symbol, one_year_ago, today
    );

    let client = Client::builder()
        .user_agent("StockTracker/1.0 research@example.com")
        .timeout(std::time::Duration::from_secs(10))
        .build()?;

    let resp: Value = client.get(&url).send().await?.json().await?;

    let hits = resp["hits"]["hits"]
        .as_array()
        .cloned()
        .unwrap_or_default();

    Ok(hits.into_iter().take(5).collect())
}
