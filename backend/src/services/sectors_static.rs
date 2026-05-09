use std::collections::HashMap;

pub fn sector_map() -> HashMap<&'static str, &'static str> {
    let mut m = HashMap::new();

    // Technology
    for s in &[
        "AAPL","MSFT","NVDA","AMD","INTC","QCOM","AVGO","TXN","MU","SNDK",
        "ADBE","CRM","ORCL","INTU","AMAT","KLAC","LRCX","MRVL","MCHP","ON",
        "NXPI","STX","WDC","HPQ","HPE","DELL","PANW","CRWD","FTNT","ZS",
        "NET","SNOW","PLTR","DDOG","MDB","U","TEAM","SHOP","WDAY","NOW",
        "VEEV","HUBS","ZI","BILL","GTLB","CFLT","IOT","APP","RBLX","PINS",
        "SNAP","TTD","ROKU","TWLO","SMAR","BOX","DOCN","FROG","ALTR","PSTG",
    ] {
        m.insert(*s, "Technology");
    }

    // Consumer Discretionary
    for s in &[
        "AMZN","TSLA","HD","LOW","MCD","NKE","SBUX","TJX","BKNG","EBAY",
        "GM","F","FORD","DG","DLTR","ROST","YUM","CMG","DKNG","ABNB",
        "LVS","MGM","WYNN","CCL","RCL","NCLH","HLT","MAR","H","EXPE",
        "LYFT","UBER","DASH","RIVN","LCID","NIO","LI","XPEV","PDD","JD",
    ] {
        m.insert(*s, "Consumer Discretionary");
    }

    // Consumer Staples
    for s in &[
        "WMT","COST","PG","KO","PEP","PM","MO","CL","EL","KHC",
        "GIS","K","CPB","MKC","CAG","SJM","HRL","TSN","KR","ACI",
    ] {
        m.insert(*s, "Consumer Staples");
    }

    // Financials
    for s in &[
        "JPM","BAC","WFC","GS","MS","C","BLK","SPGI","MCO","AXP",
        "V","MA","COF","USB","PNC","TFC","SCHW","ICE","CME","CBOE",
        "MSCI","FDS","BR","BX","KKR","APO","CG","ARES","TPG","BAM",
        "MET","PRU","AFL","ALL","PGR","TRV","CB","HIG","BRK.B","HOOD",
        "COIN","SQ","AFRM","SOFI","NU","MELI","SE",
    ] {
        m.insert(*s, "Financials");
    }

    // Healthcare
    for s in &[
        "UNH","JNJ","PFE","MRK","ABBV","BMY","AMGN","GILD","CVS","ELV",
        "HUM","CI","LLY","TMO","ABT","MDT","SYK","BSX","EW","ISRG",
        "REGN","VRTX","BIIB","MRNA","BNTX","ARWR","BEAM","EDIT","CRSP","NTLA",
        "ZBH","BAX","BDX","DHR","WAT","IQV","CRL","DGX","LH","HOLX",
    ] {
        m.insert(*s, "Healthcare");
    }

    // Communication Services
    for s in &[
        "GOOGL","GOOG","META","NFLX","DIS","CMCSA","VZ","T","TMUS","WBD",
        "CHTR","EA","TTWO","ATVI","MTCH","IAC","ZM","TWTR","SPOT",
    ] {
        m.insert(*s, "Communication Services");
    }

    // Energy
    for s in &[
        "XOM","CVX","COP","EOG","SLB","MPC","PSX","VLO","HES","DVN",
        "PXD","OXY","HAL","BKR","FANG","APA","MRO","NOV","FTI","TTE",
    ] {
        m.insert(*s, "Energy");
    }

    // Industrials
    for s in &[
        "CAT","HON","GE","MMM","BA","RTX","LMT","DE","EMR","ETN",
        "UPS","FDX","NSC","CSX","WM","RSG","IR","PH","ROP","CTAS",
        "VRSK","GWW","FAST","SWK","TDG","HWM","GD","NOC","LDOS","SAIC",
    ] {
        m.insert(*s, "Industrials");
    }

    // Utilities
    for s in &[
        "NEE","DUK","SO","AEP","XEL","SRE","D","EXC","ES","WEC",
        "AWK","CMS","NI","OGE","LNT","EVRG","PNW","HE","PCG","EIX",
    ] {
        m.insert(*s, "Utilities");
    }

    // Real Estate
    for s in &[
        "PLD","AMT","EQIX","CCI","PSA","O","WELL","VTR","DLR","EXR",
        "AVB","EQR","MAA","UDR","CPT","NNN","WPC","STAG","IIPR","COLD",
    ] {
        m.insert(*s, "Real Estate");
    }

    // Materials
    for s in &[
        "LIN","APD","ECL","NEM","FCX","NUE","CF","MOS","ALB","SQM",
        "AA","CENX","X","CLF","PKG","IP","WRK","SON","SEE","BALL",
    ] {
        m.insert(*s, "Materials");
    }

    m
}

pub fn tw_sector_map() -> HashMap<&'static str, &'static str> {
    let mut m = HashMap::new();

    // Technology — semiconductors, IC design, electronics
    for s in &[
        "2330.TW","2303.TW","2344.TW","2337.TW","2408.TW",
        "3034.TW","2379.TW","2327.TW","3711.TW",
        "2317.TW","2454.TW","2308.TW","2357.TW","2382.TW",
        "2395.TW","3008.TW","6669.TW","2354.TW","2353.TW",
        "2376.TW","2301.TW","3231.TW",
    ] {
        m.insert(*s, "Technology");
    }

    // Financial Services
    for s in &[
        "2891.TW","2882.TW","2881.TW","2886.TW","2884.TW",
        "2892.TW","2883.TW","2880.TW","2885.TW","5876.TW","2801.TW",
    ] {
        m.insert(*s, "Financial Services");
    }

    // Communication Services
    for s in &["2412.TW","4904.TW","3045.TW"] {
        m.insert(*s, "Communication Services");
    }

    // Basic Materials — petrochemical, steel
    for s in &["6505.TW","1301.TW","1303.TW","1326.TW","2002.TW"] {
        m.insert(*s, "Basic Materials");
    }

    // Consumer Discretionary — auto dealer
    for s in &["2207.TW"] {
        m.insert(*s, "Consumer Discretionary");
    }

    // Consumer Staples — food, convenience stores
    for s in &["1216.TW","2912.TW"] {
        m.insert(*s, "Consumer Staples");
    }

    m
}
