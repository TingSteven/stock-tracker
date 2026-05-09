import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchTopTurnover } from '../api/client';
import { useMarket } from '../context/MarketContext';
import { twDisplayName } from '../utils/twNames';

const SECTOR_ZH: Record<string, string> = {
  'Technology': '科技', 'Healthcare': '醫療', 'Financials': '金融',
  'Financial Services': '金融服務', 'Energy': '能源', 'Industrials': '工業',
  'Consumer Discretionary': '非必需消費', 'Consumer Staples': '必需消費',
  'Utilities': '公用事業', 'Real Estate': '房地產', 'Materials': '原材料',
  'Communication Services': '通訊服務', 'Basic Materials': '原材料',
};

function Spinner() {
  return <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto my-16" />;
}

function fmtTurnover(n: number, prefix = '$') {
  if (n >= 1e9) return `${prefix}${(n / 1e9).toFixed(2)}B`;
  if (n >= 1e6) return `${prefix}${(n / 1e6).toFixed(1)}M`;
  return `${prefix}${(n / 1e3).toFixed(0)}K`;
}

function fmtVol(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(1)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function fmtCap(n: number | null) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

function RankBadge({ rank }: { rank: number }) {
  const color =
    rank === 1 ? 'bg-yellow-500 text-yellow-900' :
    rank === 2 ? 'bg-gray-400 text-gray-900' :
    rank === 3 ? 'bg-amber-700 text-amber-100' :
    rank <= 10 ? 'bg-indigo-800 text-indigo-200' :
    'bg-gray-800 text-gray-400';
  return (
    <span className={`inline-flex items-center justify-center w-8 h-6 rounded text-xs font-bold ${color}`}>
      {rank}
    </span>
  );
}

// 判斷買賣壓
function pressureLabel(changePct: number): { label: string; short: string; cls: string; dot: string } {
  if (changePct >= 2)   return { label: '強買壓', short: '強買', cls: 'text-green-400 bg-green-900/40 border-green-800', dot: 'bg-green-400' };
  if (changePct >= 0.5) return { label: '買壓偏多', short: '買多', cls: 'text-green-400 bg-green-900/20 border-green-900', dot: 'bg-green-600' };
  if (changePct > -0.5) return { label: '多空均衡', short: '均衡', cls: 'text-gray-400 bg-gray-800/40 border-gray-700', dot: 'bg-gray-500' };
  if (changePct > -2)   return { label: '賣壓偏多', short: '賣多', cls: 'text-red-400 bg-red-900/20 border-red-900', dot: 'bg-red-600' };
  return                { label: '強賣壓', short: '強賣', cls: 'text-red-400 bg-red-900/40 border-red-800', dot: 'bg-red-400' };
}

type PressureFilter = 'all' | 'buy' | 'sell';

export default function TurnoverRanking() {
  const navigate = useNavigate();
  const { market } = useMarket();
  const prefix = market === 'tw' ? 'NT$' : '$';
  const [sector, setSector] = useState('');
  const [search, setSearch] = useState('');
  const [pressureFilter, setPressureFilter] = useState<PressureFilter>('all');

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['top-turnover', market],
    queryFn: () => fetchTopTurnover(market),
    staleTime: 2 * 60_000,
  });

  const sectors = [...new Set(data?.map((s) => s.sector).filter(Boolean) ?? [])].sort();

  const filtered = data?.filter((s) => {
    if (sector && s.sector !== sector) return false;
    if (search && !s.symbol.includes(search.toUpperCase()) && !s.name.toLowerCase().includes(search.toLowerCase())) return false;
    if (pressureFilter === 'buy' && s.change_pct <= 0) return false;
    if (pressureFilter === 'sell' && s.change_pct >= 0) return false;
    return true;
  }) ?? [];

  const allData = data ?? [];
  const buyCount  = allData.filter(s => s.change_pct > 0).length;
  const sellCount = allData.filter(s => s.change_pct < 0).length;
  const buyTurnover  = allData.filter(s => s.change_pct > 0).reduce((a, s) => a + s.turnover, 0);
  const sellTurnover = allData.filter(s => s.change_pct < 0).reduce((a, s) => a + s.turnover, 0);
  const totalTurnover = allData.reduce((a, s) => a + s.turnover, 0);
  const buyRatio = totalTurnover > 0 ? (buyTurnover / totalTurnover) * 100 : 50;

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div>
        <h1 className="text-2xl font-bold">成交值排行</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {market === 'tw' ? '台股' : '美股'}成交值排行，依成交值（股價 × 成交量）排序
        </p>
      </div>

      {/* 買賣壓概覽 */}
      {data && (
        <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
          <div className="flex items-center justify-between mb-3">
            <h2 className="text-sm font-semibold text-gray-400">今日整體買賣壓分析</h2>
            <span className="text-xs text-gray-600">共 {allData.length} 檔</span>
          </div>

          {/* 買賣壓比例條 */}
          <div className="mb-3">
            <div className="flex justify-between text-xs mb-1">
              <span className="text-green-400 font-semibold">買壓 {buyCount} 檔 · {fmtTurnover(buyTurnover, prefix)}</span>
              <span className="text-red-400 font-semibold">{fmtTurnover(sellTurnover, prefix)} · {sellCount} 檔 賣壓</span>
            </div>
            <div className="h-3 bg-red-900/50 rounded-full overflow-hidden">
              <div
                className="h-full bg-green-600 rounded-full transition-all"
                style={{ width: `${buyRatio}%` }}
              />
            </div>
            <div className="flex justify-between text-xs text-gray-600 mt-1">
              <span>{buyRatio.toFixed(1)}% 買壓</span>
              <span>{(100 - buyRatio).toFixed(1)}% 賣壓</span>
            </div>
          </div>

          {/* 統計卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">合計成交值</p>
              <p className="text-base font-bold text-indigo-400">{fmtTurnover(totalTurnover, prefix)}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">第一名</p>
              <p className="text-base font-bold text-yellow-400">{allData[0] ? fmtTurnover(allData[0].turnover, prefix) : '—'}</p>
              <p className="text-xs text-gray-600">{allData[0]?.symbol}</p>
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">最大漲幅</p>
              {(() => {
                const top = [...allData].sort((a, b) => b.change_pct - a.change_pct)[0];
                return top ? (
                  <><p className="text-base font-bold text-green-400">+{top.change_pct.toFixed(2)}%</p><p className="text-xs text-gray-600">{top.symbol}</p></>
                ) : <p className="text-base font-bold">—</p>;
              })()}
            </div>
            <div className="bg-gray-800 rounded-lg p-3">
              <p className="text-xs text-gray-500 mb-1">最大跌幅</p>
              {(() => {
                const bot = [...allData].sort((a, b) => a.change_pct - b.change_pct)[0];
                return bot ? (
                  <><p className="text-base font-bold text-red-400">{bot.change_pct.toFixed(2)}%</p><p className="text-xs text-gray-600">{bot.symbol}</p></>
                ) : <p className="text-base font-bold">—</p>;
              })()}
            </div>
          </div>
        </div>
      )}

      {/* 篩選列 */}
      <div className="flex flex-wrap gap-3 items-center">
        {/* 買賣壓 Tab */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-sm">
          {([['all', '全部'], ['buy', '▲ 買壓主導'], ['sell', '▼ 賣壓主導']] as const).map(([val, label]) => (
            <button
              key={val}
              onClick={() => setPressureFilter(val)}
              className={`px-3 py-1.5 font-semibold transition ${
                pressureFilter === val
                  ? val === 'buy' ? 'bg-green-700 text-white'
                    : val === 'sell' ? 'bg-red-700 text-white'
                    : 'bg-indigo-700 text-white'
                  : 'bg-gray-800 text-gray-400 hover:text-white'
              }`}
            >
              {label}
            </button>
          ))}
        </div>

        <input
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          placeholder="搜尋代號或名稱…"
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-44 focus:outline-none focus:border-indigo-500"
        />
        <select
          value={sector}
          onChange={(e) => setSector(e.target.value)}
          className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
        >
          <option value="">全部類股</option>
          {sectors.map((s) => <option key={s} value={s}>{SECTOR_ZH[s] ?? s}</option>)}
        </select>
        <button
          onClick={() => refetch()}
          className="bg-indigo-700 hover:bg-indigo-600 text-white px-4 py-1.5 rounded text-sm transition"
        >
          重新整理
        </button>
        <span className="text-xs text-gray-500 ml-auto">{filtered.length} 檔</span>
      </div>

      {/* 表格 */}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p className="text-red-400 text-sm">載入失敗 — <button onClick={() => refetch()} className="underline">重試</button></p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800 bg-gray-900/80">
                <th className="text-center px-3 py-3 w-12">排名</th>
                <th className="text-left px-4 py-3">股票</th>
                <th className="text-center px-3 py-3">買賣壓</th>
                <th className="text-right px-4 py-3">成交值</th>
                <th className="text-right px-4 py-3">價格</th>
                <th className="text-right px-4 py-3">漲跌</th>
                <th className="text-right px-4 py-3">成交量</th>
                <th className="text-right px-4 py-3">市值</th>
                <th className="text-left px-4 py-3">類股</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {filtered.map((s) => {
                const p = pressureLabel(s.change_pct);
                return (
                  <tr
                    key={s.symbol}
                    className="hover:bg-gray-800/50 cursor-pointer transition"
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                  >
                    <td className="px-3 py-2.5 text-center"><RankBadge rank={s.rank} /></td>
                    <td className="px-4 py-2.5">
                      <p className="font-bold text-indigo-300">{twDisplayName(s.symbol)}</p>
                      {!s.symbol.endsWith('.TW') && (
                        <p className="text-xs text-gray-500 truncate max-w-[150px]">{s.name}</p>
                      )}
                    </td>
                    <td className="px-3 py-2.5 text-center">
                      <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded border text-xs font-semibold ${p.cls}`}>
                        <span className={`w-1.5 h-1.5 rounded-full ${p.dot}`} />
                        {p.short}
                      </span>
                    </td>
                    <td className="px-4 py-2.5 text-right">
                      <span className="font-bold text-white">{fmtTurnover(s.turnover, prefix)}</span>
                      <div className="w-16 h-1 bg-gray-800 rounded-full ml-auto mt-1 overflow-hidden">
                        <div
                          className={`h-full rounded-full ${s.change_pct >= 0 ? 'bg-green-600' : 'bg-red-600'}`}
                          style={{ width: `${Math.min(100, (s.turnover / (data?.[0]?.turnover ?? 1)) * 100)}%` }}
                        />
                      </div>
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{prefix}{s.price.toFixed(2)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {s.change_pct >= 0 ? '▲' : '▼'} {Math.abs(s.change_pct).toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-300">{fmtVol(s.volume)}</td>
                    <td className="px-4 py-2.5 text-right text-gray-400">{fmtCap(s.market_cap)}</td>
                    <td className="px-4 py-2.5 text-xs text-gray-400">{SECTOR_ZH[s.sector] ?? s.sector}</td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
