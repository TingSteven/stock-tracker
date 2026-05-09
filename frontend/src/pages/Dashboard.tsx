import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchStock, fetchTopTurnover, fetchSectors, fetchUnusualVolume } from '../api/client';
import { useMarket } from '../context/MarketContext';
import { twDisplayName } from '../utils/twNames';

const SECTOR_ZH: Record<string, string> = {
  'Technology': '科技',
  'Healthcare': '醫療',
  'Financials': '金融',
  'Energy': '能源',
  'Industrials': '工業',
  'Consumer Discretionary': '非必需消費',
  'Consumer Staples': '必需消費',
  'Utilities': '公用事業',
  'Real Estate': '房地產',
  'Materials': '原材料',
  'Communication Services': '通訊服務',
};

function Spinner() {
  return <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />;
}

function fmtTurnover(n: number) {
  if (n >= 1e9) return `${(n / 1e9).toFixed(1)}B`;
  if (n >= 1e6) return `${(n / 1e6).toFixed(0)}M`;
  return `${(n / 1e3).toFixed(0)}K`;
}

function PctChange({ v }: { v: number }) {
  const pos = v >= 0;
  return (
    <span className={`font-semibold ${pos ? 'text-green-400' : 'text-red-400'}`}>
      {pos ? '+' : ''}{v.toFixed(2)}%
    </span>
  );
}

function IndexCard({ symbol, label, prefix = '$' }: { symbol: string; label: string; prefix?: string }) {
  const { data, isLoading } = useQuery({
    queryKey: ['stock', symbol],
    queryFn: () => fetchStock(symbol),
    staleTime: 60_000,
  });

  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="text-xs text-gray-500 mb-1">{label}</div>
      {isLoading ? (
        <div className="flex items-center gap-2 h-9 mt-1"><Spinner /></div>
      ) : data ? (
        <>
          <p className="text-base sm:text-xl font-bold truncate">{prefix}{data.price.toFixed(2)}</p>
          <p className="mt-0.5"><PctChange v={data.change_pct} /></p>
        </>
      ) : (
        <p className="text-gray-500 text-sm mt-2">無資料</p>
      )}
      <p className="text-xs text-gray-600 mt-1">{symbol}</p>
    </div>
  );
}

const US_INDICES = [
  { symbol: 'SPY', label: '標普500 ETF' },
  { symbol: 'QQQ', label: '那斯達克100 ETF' },
  { symbol: 'DIA', label: '道瓊工業 ETF' },
];
const TW_INDICES = [
  { symbol: '0050.TW', label: '元大台灣50' },
  { symbol: '0056.TW', label: '元大高股息' },
  { symbol: '2330.TW', label: '台積電' },
];

export default function Dashboard() {
  const navigate = useNavigate();
  const { market } = useMarket();
  const prefix = market === 'tw' ? 'NT$' : '$';

  const { data: turnover, isLoading: loadTurnover } = useQuery({
    queryKey: ['top-turnover', market],
    queryFn: () => fetchTopTurnover(market),
    staleTime: 60_000,
  });

  const { data: sectors, isLoading: loadSectors } = useQuery({
    queryKey: ['sectors', market],
    queryFn: () => fetchSectors(market),
    staleTime: 120_000,
  });

  const { data: unusual, isLoading: loadUnusual } = useQuery({
    queryKey: ['unusual-volume', market],
    queryFn: () => fetchUnusualVolume(market),
    staleTime: 60_000,
  });

  const indices = market === 'tw' ? TW_INDICES : US_INDICES;

  return (
    <div className="space-y-6">
      {/* 市場指數 */}
      <section>
        <h2 className="text-xs font-semibold text-gray-500 mb-3 uppercase tracking-wider">
          {market === 'tw' ? '台股指標' : '美股指數'}
        </h2>
        <div className="grid grid-cols-3 gap-2 sm:gap-4">
          {indices.map(idx => (
            <IndexCard key={idx.symbol} symbol={idx.symbol} label={idx.label} prefix={prefix} />
          ))}
        </div>
      </section>

      {/* 成交值 + 板塊 */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* 今日成交值 Top 10 */}
        <div className="lg:col-span-2">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">今日成交值 Top 10</h2>
            <button onClick={() => navigate('/turnover')} className="text-xs text-indigo-400 hover:text-indigo-300">
              查看百強排行 →
            </button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            {loadTurnover ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : (
              <table className="w-full text-sm min-w-[420px]">
                <thead>
                  <tr className="text-gray-500 text-xs border-b border-gray-800">
                    <th className="text-left px-4 py-2">#</th>
                    <th className="text-left px-4 py-2">代號</th>
                    <th className="text-right px-4 py-2">成交值</th>
                    <th className="text-right px-4 py-2">價格</th>
                    <th className="text-right px-4 py-2">漲跌</th>
                    <th className="text-left px-4 py-2 hidden sm:table-cell">類股</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-gray-800">
                  {turnover?.slice(0, 10).map((s) => (
                    <tr
                      key={s.symbol}
                      className="hover:bg-gray-800/50 cursor-pointer"
                      onClick={() => navigate(`/stock/${s.symbol}`)}
                    >
                      <td className="px-4 py-2 text-gray-500 text-xs">{s.rank}</td>
                      <td className="px-4 py-2">
                        <p className="font-bold text-indigo-300">{twDisplayName(s.symbol)}</p>
                        {!s.symbol.endsWith('.TW') && (
                          <p className="text-xs text-gray-500 truncate max-w-[100px]">{s.name}</p>
                        )}
                      </td>
                      <td className="px-4 py-2 text-right font-mono text-yellow-300 font-semibold">
                        {fmtTurnover(s.turnover)}
                      </td>
                      <td className="px-4 py-2 text-right">{prefix}{s.price.toFixed(2)}</td>
                      <td className="px-4 py-2 text-right"><PctChange v={s.change_pct} /></td>
                      <td className="px-4 py-2 text-gray-400 text-xs hidden sm:table-cell">{SECTOR_ZH[s.sector] ?? s.sector}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            )}
          </div>
        </div>

        {/* 板塊漲跌 */}
        <div>
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">板塊漲跌</h2>
            <button onClick={() => navigate('/sectors')} className="text-xs text-indigo-400 hover:text-indigo-300">
              板塊輪動 →
            </button>
          </div>
          <div className="bg-gray-900 border border-gray-800 rounded-xl p-4 space-y-1.5">
            {loadSectors ? (
              <div className="flex justify-center py-10"><Spinner /></div>
            ) : sectors?.map((s) => {
              const pos = s.change_1d >= 0;
              const barW = Math.min(100, Math.abs(s.change_1d) * 20);
              return (
                <div
                  key={s.etf}
                  className="flex items-center gap-2 rounded px-1 py-0.5 hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => navigate('/sectors')}
                >
                  <span className="text-xs text-gray-400 w-16 shrink-0 truncate">{SECTOR_ZH[s.name] ?? s.name}</span>
                  <div className="flex-1 h-3 bg-gray-800 rounded-sm overflow-hidden">
                    <div
                      className={`h-full rounded-sm ${pos ? 'bg-green-600' : 'bg-red-600'}`}
                      style={{ width: `${barW}%` }}
                    />
                  </div>
                  <span className={`text-xs font-semibold w-14 text-right ${pos ? 'text-green-400' : 'text-red-400'}`}>
                    {pos ? '+' : ''}{s.change_1d.toFixed(2)}%
                  </span>
                </div>
              );
            })}
          </div>
        </div>
      </div>

      {/* 資金異動 */}
      <section>
        <div className="flex items-center justify-between mb-3">
          <h2 className="text-xs font-semibold text-gray-500 uppercase tracking-wider">資金異動（量比前5）</h2>
          <button onClick={() => navigate('/flow')} className="text-xs text-indigo-400 hover:text-indigo-300">
            查看全部 →
          </button>
        </div>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-hidden">
          {loadUnusual ? (
            <div className="flex justify-center py-8"><Spinner /></div>
          ) : (
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-2">代號</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">名稱</th>
                  <th className="text-right px-4 py-2">價格</th>
                  <th className="text-right px-4 py-2">漲跌幅</th>
                  <th className="text-right px-4 py-2">量比</th>
                  <th className="text-left px-4 py-2 hidden sm:table-cell">類股</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {unusual?.slice(0, 5).map((s) => (
                  <tr
                    key={s.symbol}
                    className="hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                  >
                    <td className="px-4 py-2 font-bold text-indigo-300">{twDisplayName(s.symbol)}</td>
                    <td className="px-4 py-2 text-gray-400 text-xs truncate max-w-[120px] hidden sm:table-cell">
                      {s.symbol.endsWith('.TW') ? '' : s.name}
                    </td>
                    <td className="px-4 py-2 text-right">{prefix}{s.price.toFixed(2)}</td>
                    <td className="px-4 py-2 text-right"><PctChange v={s.change_pct} /></td>
                    <td className="px-4 py-2 text-right text-yellow-400 font-bold">
                      {s.volume_ratio.toFixed(1)}x
                    </td>
                    <td className="px-4 py-2 text-gray-400 text-xs hidden sm:table-cell">{SECTOR_ZH[s.sector] ?? s.sector}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>
      </section>
    </div>
  );
}
