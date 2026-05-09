use std::collections::HashMap;

pub fn sector_map() -> HashMap<&'static str, &'static str> {
    let mut m = HashMap::new();

    for s in &[
        "AAPL","MSFT","NVDA","AMD","INTC","QCOM","AVGO","TXN","MU",
        "ADBE","CRM","ORCL","INTU","AMAT","KLAC","LRCX","MRVL","MCHP",
        "PANW","CRWD","FTNT","ZS","NET","SNOW","PLTR","DDOG","NOW",
    ] {
        m.insert(*s, "Technology");
    }
    for s in &[
        "AMZN","TSLA","HD","LOW","MCD","NKE","SBUX","TJX","BKNG","EBAY",
        "GM","F","DG","DLTR","ROST","YUM","CMG","ABNB","UBER","DASH",
    ] {
        m.insert(*s, "Consumer Discretionary");
    }
    for s in &[
        "WMT","COST","PG","KO","PEP","PM","MO","CL","GIS","K","TSN","KR",
    ] {
        m.insert(*s, "Consumer Staples");
    }
    for s in &[
        "JPM","BAC","WFC","GS","MS","C","BLK","SPGI","MCO","AXP",
        "V","MA","COF","USB","PNC","TFC","SCHW","ICE","CME","CBOE",
        "BX","KKR","APO","MET","PRU","AFL","ALL","PGR","TRV","CB",
    ] {
        m.insert(*s, "Financials");
    }
    for s in &[
        "UNH","JNJ","PFE","MRK","ABBV","BMY","AMGN","GILD","CVS","ELV",
        "HUM","CI","LLY","TMO","ABT","MDT","SYK","BSX","REGN","VRTX",
    ] {
        m.insert(*s, "Healthcare");
    }
    for s in &[
        "GOOGL","GOOG","META","NFLX","DIS","CMCSA","VZ","T","TMUS","WBD",
        "CHTR","EA","SPOT","ZM",
    ] {
        m.insert(*s, "Communication Services");
    }
    for s in &[
        "XOM","CVX","COP","EOG","SLB","MPC","PSX","VLO","HES","DVN","OXY",
    ] {
        m.insert(*s, "Energy");
    }
    for s in &[
        "CAT","HON","GE","MMM","BA","RTX","LMT","DE","EMR","ETN",
        "UPS","FDX","NSC","CSX","WM","RSG","IR","PH","ROP","CTAS",
    ] {
        m.insert(*s, "Industrials");
    }
    for s in &[
        "NEE","DUK","SO","AEP","XEL","SRE","D","EXC","WEC","AWK",
    ] {
        m.insert(*s, "Utilities");
    }
    for s in &[
        "PLD","AMT","EQIX","CCI","PSA","O","WELL","DLR","EXR","AVB",
    ] {
        m.insert(*s, "Real Estate");
    }
    for s in &[
        "LIN","APD","ECL","NEM","FCX","NUE","CF","MOS","ALB","SQM",
    ] {
        m.insert(*s, "Materials");
    }

    m
}

pub fn tw_sector_map() -> HashMap<&'static str, &'static str> {
    let mut m = HashMap::new();

    for s in &[
        "2330.TW","2303.TW","2344.TW","2337.TW","2408.TW",
        "3034.TW","2379.TW","2327.TW","3711.TW",
        "2317.TW","2454.TW","2308.TW","2357.TW","2382.TW",
        "2395.TW","3008.TW","6669.TW","2354.TW","2353.TW",
        "2376.TW","2301.TW","3231.TW",
    ] {
        m.insert(*s, "Technology");
    }
    for s in &[
        "2891.TW","2882.TW","2881.TW","2886.TW","2884.TW",
        "2892.TW","2883.TW","2880.TW","2885.TW","5876.TW","2801.TW",
    ] {
        m.insert(*s, "Financial Services");
    }
    for s in &["2412.TW","4904.TW","3045.TW"] {
        m.insert(*s, "Communication Services");
    }
    for s in &["6505.TW","1301.TW","1303.TW","1326.TW","2002.TW"] {
        m.insert(*s, "Basic Materials");
    }
    for s in &["2207.TW"] {
        m.insert(*s, "Consumer Discretionary");
    }
    for s in &["1216.TW","2912.TW"] {
        m.insert(*s, "Consumer Staples");
    }

    m
}
