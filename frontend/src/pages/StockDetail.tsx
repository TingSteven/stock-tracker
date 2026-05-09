import { useParams, useNavigate } from 'react-router-dom';
import { useQuery } from '@tanstack/react-query';
import { useEffect } from 'react';
import { fetchHistory, fetchStock } from '../api/client';
import BuySignalBadge, { SignalBadge } from '../components/BuySignalBadge';
import TechnicalChart from '../components/TechnicalChart';
import { twDisplayName, twShortName } from '../utils/twNames';

const SECTOR_ZH: Record<string, string> = {
  'Technology': '科技',
  'Healthcare': '醫療',
  'Financials': '金融',
  'Financial Services': '金融服務',
  'Energy': '能源',
  'Industrials': '工業',
  'Consumer Discretionary': '非必需消費',
  'Consumer Staples': '必需消費',
  'Utilities': '公用事業',
  'Real Estate': '房地產',
  'Materials': '原材料',
  'Communication Services': '通訊服務',
  'Basic Materials': '原材料',
};

function Spinner() {
  return <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto my-16" />;
}

function Metric({ label, value, sub }: { label: string; value: string; sub?: string }) {
  return (
    <div>
      <p className="text-xs text-gray-500 mb-0.5">{label}</p>
      <p className="font-semibold text-white">{value}</p>
      {sub && <p className="text-xs text-gray-500 mt-0.5">{sub}</p>}
    </div>
  );
}

function fmtCap(n: number | null, prefix = '$') {
  if (n == null) return '—';
  if (n >= 1e12) return `${prefix}${(n / 1e12).toFixed(2)}兆`;
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(1)}B`;
  return `${prefix}${(n / 1e6).toFixed(0)}M`;
}

function fmtVol(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function fmtTurnover(n: number, prefix = '$') {
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M`;
  return `${prefix}${(n / 1e3).toFixed(0)}K`;
}

function PressureBadge({ changePct, volumeRatio }: { changePct: number; volumeRatio: number }) {
  const heavy = volumeRatio >= 1.5;
  let label: string;
  let sub: string;
  let cls: string;
  let dot: string;

  if (changePct >= 2) {
    label = heavy ? '大量強買壓' : '強買壓';
    sub = '價漲量增，主力積極買入';
    cls = 'text-green-400 bg-green-900/40 border-green-800';
    dot = 'bg-green-400';
  } else if (changePct >= 0.5) {
    label = heavy ? '量增買壓偏多' : '買壓偏多';
    sub = '買方略佔優勢';
    cls = 'text-green-400 bg-green-900/20 border-green-900';
    dot = 'bg-green-600';
  } else if (changePct > -0.5) {
    label = '多空均衡';
    sub = '買賣力道相當';
    cls = 'text-gray-400 bg-gray-800/40 border-gray-700';
    dot = 'bg-gray-500';
  } else if (changePct > -2) {
    label = heavy ? '量增賣壓偏多' : '賣壓偏多';
    sub = '賣方略佔優勢';
    cls = 'text-red-400 bg-red-900/20 border-red-900';
    dot = 'bg-red-600';
  } else {
    label = heavy ? '大量強賣壓' : '強賣壓';
    sub = '價跌量增，賣盤積極湧出';
    cls = 'text-red-400 bg-red-900/40 border-red-800';
    dot = 'bg-red-400';
  }

  return (
    <div className={`flex items-start gap-2 px-3 py-2 rounded-lg border ${cls}`}>
      <span className={`mt-1 w-2 h-2 rounded-full flex-shrink-0 ${dot}`} />
      <div>
        <p className="text-sm font-bold">{label}</p>
        <p className="text-xs opacity-70 mt-0.5">{sub}</p>
      </div>
    </div>
  );
}

function RsiGauge({ rsi }: { rsi: number | null }) {
  if (rsi == null) return <p className="text-gray-500 text-sm">無資料</p>;
  const pct = Math.min(100, Math.max(0, rsi));
  const color = rsi < 30 ? 'bg-green-500' : rsi > 70 ? 'bg-red-500' : 'bg-indigo-500';
  const label = rsi < 30 ? '超賣區間' : rsi > 70 ? '超買區間' : '中性區間';
  const labelColor = rsi < 30 ? 'text-green-400' : rsi > 70 ? 'text-red-400' : 'text-indigo-400';
  return (
    <div>
      <div className="flex justify-between text-xs text-gray-500 mb-1">
        <span>超賣 0</span><span>超買 100</span>
      </div>
      <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full transition-all`} style={{ width: `${pct}%` }} />
      </div>
      <p className={`text-sm font-bold mt-1 ${labelColor}`}>
        RSI {rsi.toFixed(1)} — {label}
      </p>
    </div>
  );
}

export default function StockDetail() {
  const { symbol = '' } = useParams<{ symbol: string }>();
  const navigate = useNavigate();
  const sym = symbol.toUpperCase();
  const isTw = sym.endsWith('.TW') || sym.endsWith('.TWO');
  const prefix = isTw ? 'NT$' : '$';

  const { data: stock, isLoading: loadStock, error } = useQuery({
    queryKey: ['stock', sym],
    queryFn: () => fetchStock(sym),
    enabled: !!sym,
  });

  // If .TW fails, auto-retry with .TWO (上市 → 上櫃 fallback)
  useEffect(() => {
    if (error && sym.endsWith('.TW')) {
      navigate(`/stock/${sym.slice(0, -3)}.TWO`, { replace: true });
    }
  }, [error, sym, navigate]);

  const { data: history, isLoading: loadHistory } = useQuery({
    queryKey: ['history', sym],
    queryFn: () => fetchHistory(sym),
    enabled: !!sym,
  });

  if (loadStock) return <Spinner />;
  if (error || !stock) return (
    <div className="mt-12 text-center space-y-3">
      <p className="text-red-400 text-lg">載入 <span className="font-bold">{sym}</span> 失敗</p>
      <p className="text-gray-500 text-sm">可能是代碼錯誤，或 Yahoo Finance 暫時限流，稍後再試即可。</p>
      <button
        onClick={() => window.location.reload()}
        className="mt-2 px-4 py-2 bg-indigo-600 hover:bg-indigo-500 rounded text-sm font-semibold transition"
      >
        重新載入
      </button>
    </div>
  );

  const up = stock.change_pct >= 0;
  const macdBull = stock.macd != null && stock.macd_signal != null && stock.macd > stock.macd_signal;

  return (
    <div className="space-y-6">
      {/* 標題列 */}
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <div className="flex items-center gap-3 flex-wrap">
            <h1 className="text-3xl font-black">{twDisplayName(stock.symbol)}</h1>
            <span className={`text-xl font-semibold ${up ? 'text-green-400' : 'text-red-400'}`}>
              {up ? '+' : ''}{stock.change_pct.toFixed(2)}%
            </span>
            <BuySignalBadge score={stock.buy_score} size="lg" />
          </div>
          <p className="text-gray-400 mt-1">
            {isTw ? (twShortName(sym) ? `${twShortName(sym)} — ${stock.name}` : stock.name) : stock.name}
          </p>
          <div className="flex gap-2 mt-2 flex-wrap">
            {stock.sector && (
              <span className="bg-indigo-900 text-indigo-300 px-2 py-0.5 rounded text-xs">
                {SECTOR_ZH[stock.sector] ?? stock.sector}
              </span>
            )}
            {stock.industry && (
              <span className="bg-gray-800 text-gray-400 px-2 py-0.5 rounded text-xs">{stock.industry}</span>
            )}
          </div>
        </div>
        <div className="text-right">
          <p className="text-4xl font-black">{prefix}{stock.price.toFixed(2)}</p>
          <p className="text-xs text-gray-500 mt-1">最新收盤價</p>
        </div>
      </div>

      {/* 買入信號分數 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
        <div className="flex items-center justify-between mb-2">
          <div>
            <p className="text-sm text-gray-400">買入信號分數</p>
            <p className="text-xs text-gray-600 mt-0.5">技術面 40% + 基本面 30% + 成交量 30%</p>
          </div>
          <p className="text-sm font-bold text-white">{stock.buy_score.toFixed(0)} / 100</p>
        </div>
        <div className="h-4 bg-gray-800 rounded-full overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-red-600 via-yellow-500 to-green-500 transition-all"
            style={{ width: `${stock.buy_score}%` }}
          />
        </div>
        <div className="flex justify-between text-xs text-gray-600 mt-1">
          <span>0 — 避開</span><span>50 — 中性</span><span>100 — 強烈買入</span>
        </div>
      </div>

      {/* 三欄指標 */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
        {/* 技術分析 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">技術分析</h3>
            <SignalBadge signal={stock.technical_signal} />
          </div>
          <RsiGauge rsi={stock.rsi} />
          <Metric
            label="MACD / 訊號線"
            value={stock.macd != null ? `${stock.macd.toFixed(3)} / ${stock.macd_signal?.toFixed(3) ?? '—'}` : '—'}
            sub={stock.macd != null && stock.macd_signal != null ? (macdBull ? '多頭交叉（看漲）' : '空頭交叉（看跌）') : undefined}
          />
          <Metric
            label="相對50日均線"
            value={stock.price_vs_sma50 != null ? `${stock.price_vs_sma50 >= 0 ? '+' : ''}${stock.price_vs_sma50.toFixed(2)}%` : '—'}
          />
          <Metric
            label="相對200日均線"
            value={stock.price_vs_sma200 != null ? `${stock.price_vs_sma200 >= 0 ? '+' : ''}${stock.price_vs_sma200.toFixed(2)}%` : '—'}
          />
        </div>

        {/* 基本面 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">基本面</h3>
            <SignalBadge signal={stock.fundamental_signal} />
          </div>
          <Metric label="市盈率 (P/E)" value={stock.pe_ratio?.toFixed(2) ?? '暫無資料'} />
          <Metric label="每股盈餘 (EPS)" value={stock.eps != null ? `${prefix}${stock.eps.toFixed(2)}` : '暫無資料'} />
          <Metric label="市值" value={stock.market_cap != null ? fmtCap(stock.market_cap, prefix) : '暫無資料'} />
          <Metric label="利潤率" value={stock.profit_margin != null ? `${(stock.profit_margin * 100).toFixed(1)}%` : '暫無資料'} />
          <Metric label="負債比" value={stock.debt_to_equity?.toFixed(2) ?? '暫無資料'} />
          <p className="text-xs text-gray-600">* Yahoo Finance 免費 API 限制，部分資料暫不可用</p>
        </div>

        {/* 成交量 & 買賣壓 */}
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-5 space-y-4">
          <div className="flex items-center justify-between">
            <h3 className="font-semibold text-sm text-gray-400 uppercase tracking-wide">成交量</h3>
            <SignalBadge signal={stock.volume_signal} />
          </div>

          {/* 買賣壓判斷 */}
          <PressureBadge changePct={stock.change_pct} volumeRatio={stock.volume_ratio} />

          <Metric label="今日成交值" value={fmtTurnover(stock.price * stock.volume, prefix)} />
          <Metric label="今日成交量" value={fmtVol(stock.volume)} />
          <Metric label="3月均量" value={fmtVol(stock.avg_volume)} />
          <div>
            <p className="text-xs text-gray-500 mb-1">量比（今日 / 3月均）</p>
            <div className="h-3 bg-gray-800 rounded-full overflow-hidden">
              <div
                className={`h-full rounded-full ${stock.volume_ratio >= 2 ? 'bg-yellow-500' : stock.volume_ratio >= 1.5 ? 'bg-indigo-500' : 'bg-gray-600'}`}
                style={{ width: `${Math.min(100, stock.volume_ratio * 33)}%` }}
              />
            </div>
            <p className={`text-sm font-bold mt-1 ${stock.volume_ratio >= 2 ? 'text-yellow-400' : 'text-gray-300'}`}>
              {stock.volume_ratio.toFixed(2)}x 均量
            </p>
          </div>
        </div>
      </div>

      {/* 走勢圖 */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <h3 className="font-semibold mb-4">近一年走勢圖</h3>
        {loadHistory ? (
          <div className="h-48 flex items-center justify-center">
            <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
          </div>
        ) : history && history.length > 0 ? (
          <TechnicalChart history={history} />
        ) : (
          <p className="text-gray-500 text-sm">無圖表資料</p>
        )}
      </div>
    </div>
  );
}
