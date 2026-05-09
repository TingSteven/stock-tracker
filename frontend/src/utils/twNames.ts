const TW_NAMES: Record<string, string> = {
  '2330.TW': '台積電', '2303.TW': '聯電',   '2344.TW': '華邦電',
  '2337.TW': '旺宏',   '2408.TW': '南亞科', '3034.TW': '聯詠',
  '2379.TW': '瑞昱',   '2327.TW': '國巨',   '3711.TW': '日月光',
  '2317.TW': '鴻海',   '2454.TW': '聯發科', '2308.TW': '台達電',
  '2357.TW': '華碩',   '2382.TW': '廣達',   '2395.TW': '研華',
  '3008.TW': '大立光', '6669.TW': '緯穎',   '2354.TW': '鴻準',
  '2353.TW': '宏碁',   '2376.TW': '技嘉',   '2301.TW': '光寶科',
  '3231.TW': '緯創',   '2891.TW': '中信金', '2882.TW': '國泰金',
  '2881.TW': '富邦金', '2886.TW': '兆豐金', '2884.TW': '玉山金',
  '2892.TW': '第一金', '2883.TW': '開發金', '2880.TW': '華南金',
  '2885.TW': '元大金', '5876.TW': '上海商銀','2801.TW': '彰銀',
  '2412.TW': '中華電', '4904.TW': '遠傳',   '3045.TW': '台灣大',
  '6505.TW': '台塑化', '1301.TW': '台塑',   '1303.TW': '南亞',
  '1326.TW': '台化',   '2002.TW': '中鋼',   '2207.TW': '和泰車',
  '1216.TW': '統一',   '2912.TW': '統一超', '0050.TW': '台灣50',
  '0056.TW': '高股息',
};

// Returns "台積電(2330)" for "2330.TW", passthrough for non-TW symbols
export function twDisplayName(symbol: string): string {
  if (!symbol.endsWith('.TW')) return symbol;
  const code = symbol.slice(0, -3);
  const name = TW_NAMES[symbol];
  return name ? `${name}(${code})` : code;
}

// Returns "台積電" for "2330.TW", empty string if not in map
export function twShortName(symbol: string): string {
  return TW_NAMES[symbol] ?? '';
}
