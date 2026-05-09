import { useState, useEffect } from 'react';
import { useQueries } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchStock } from '../api/client';
import { useMarket } from '../context/MarketContext';
import type { PortfolioItem } from '../types';
import { Trash2, Plus, TrendingUp, TrendingDown, DollarSign, BarChart2 } from 'lucide-react';

function stockPrefix(symbol: string) {
  return symbol.endsWith('.TW') ? 'NT$' : '$';
}

const STORAGE_KEY = 'stock-tracker-portfolio';

function loadPortfolio(): PortfolioItem[] {
  try {
    return JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]');
  } catch {
    return [];
  }
}

function savePortfolio(items: PortfolioItem[]) {
  localStorage.setItem(STORAGE_KEY, JSON.stringify(items));
}

function fmtMoney(n: number) {
  return n >= 0 ? `+$${n.toFixed(2)}` : `-$${Math.abs(n).toFixed(2)}`;
}

function fmtBig(n: number) {
  if (Math.abs(n) >= 1e6) return `$${(n / 1e6).toFixed(2)}M`;
  if (Math.abs(n) >= 1e3) return `$${(n / 1e3).toFixed(1)}K`;
  return `$${n.toFixed(2)}`;
}

export default function Portfolio() {
  const navigate = useNavigate();
  const { market } = useMarket();
  const [holdings, setHoldings] = useState<PortfolioItem[]>(loadPortfolio);
  const [sym, setSym] = useState('');
  const [shares, setShares] = useState('');
  const [cost, setCost] = useState('');
  const [addError, setAddError] = useState('');
  const [showForm, setShowForm] = useState(false);

  useEffect(() => {
    savePortfolio(holdings);
  }, [holdings]);

  const queries = useQueries({
    queries: holdings.map((h) => ({
      queryKey: ['stock', h.symbol],
      queryFn: () => fetchStock(h.symbol),
      staleTime: 60_000,
    })),
  });

  const addHolding = () => {
    let symbol = sym.trim().toUpperCase();
    // Auto-append .TW for pure numeric Taiwan codes
    if (market === 'tw' && /^\d{4,5}$/.test(symbol)) symbol += '.TW';
    if (!symbol) { setAddError('請輸入代號'); return; }
    const numShares = parseFloat(shares);
    const avgCost = parseFloat(cost);
    if (isNaN(numShares) || numShares <= 0) { setAddError('請輸入有效股數'); return; }
    if (isNaN(avgCost) || avgCost <= 0) { setAddError('請輸入有效成本價'); return; }
    if (holdings.find((h) => h.symbol === symbol)) { setAddError('此股票已在自選股中'); return; }
    setHoldings((prev) => [...prev, { symbol, shares: numShares, avg_cost: avgCost }]);
    setSym(''); setShares(''); setCost(''); setAddError('');
    setShowForm(false);
  };

  const remove = (symbol: string) => setHoldings((prev) => prev.filter((h) => h.symbol !== symbol));

  let totalInvested = 0;
  let totalCurrent = 0;

  const rows = holdings.map((h, i) => {
    const q = queries[i];
    const price = q.data?.price ?? null;
    const changePct = q.data?.change_pct ?? null;
    const invested = h.shares * h.avg_cost;
    const current = price != null ? h.shares * price : null;
    const pl = current != null ? current - invested : null;
    const plPct = pl != null && invested > 0 ? (pl / invested) * 100 : null;
    totalInvested += invested;
    if (current != null) totalCurrent += current;
    return { h, price, changePct, invested, current, pl, plPct, loading: q.isLoading };
  });

  const totalPl = totalCurrent - totalInvested;
  const totalPlPct = totalInvested > 0 ? (totalPl / totalInvested) * 100 : 0;

  return (
    <div className="space-y-6">
      {/* 標題 */}
      <div className="flex items-center justify-between">
        <h1 className="text-2xl font-bold">自選股</h1>
        <button
          onClick={() => setShowForm((v) => !v)}
          className="flex items-center gap-1.5 bg-indigo-600 hover:bg-indigo-500 text-white px-4 py-2 rounded-lg text-sm font-semibold transition"
        >
          <Plus size={15} />
          新增持股
        </button>
      </div>

      {/* 新增表單 */}
      {showForm && (
        <div className="bg-gray-900 border border-indigo-800 rounded-xl p-5">
          <h2 className="font-semibold mb-4 text-sm text-gray-400 uppercase tracking-wider">新增持股</h2>
          <div className="flex flex-wrap gap-3 items-end">
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">
                股票代號{market === 'tw' && <span className="text-gray-600 ml-1">(如 2330)</span>}
              </span>
              <input
                value={sym}
                onChange={(e) => setSym(e.target.value.toUpperCase())}
                onKeyDown={(e) => e.key === 'Enter' && addHolding()}
                placeholder={market === 'tw' ? '2330' : 'AAPL'}
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">股數</span>
              <input
                type="number"
                value={shares}
                onChange={(e) => setShares(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHolding()}
                placeholder="10"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-24 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <label className="block">
              <span className="text-xs text-gray-400 block mb-1">平均成本 ($)</span>
              <input
                type="number"
                step="0.01"
                value={cost}
                onChange={(e) => setCost(e.target.value)}
                onKeyDown={(e) => e.key === 'Enter' && addHolding()}
                placeholder="150.00"
                className="bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm w-28 focus:outline-none focus:border-indigo-500"
              />
            </label>
            <button
              onClick={addHolding}
              className="bg-indigo-600 hover:bg-indigo-500 text-white px-5 py-1.5 rounded-lg text-sm font-semibold transition"
            >
              確認新增
            </button>
            <button
              onClick={() => { setShowForm(false); setAddError(''); }}
              className="text-gray-500 hover:text-gray-300 px-3 py-1.5 text-sm transition"
            >
              取消
            </button>
          </div>
          {addError && <p className="text-red-400 text-xs mt-2">{addError}</p>}
        </div>
      )}

      {holdings.length === 0 ? (
        <div className="text-center py-20 text-gray-600 space-y-2">
          <BarChart2 size={40} className="mx-auto opacity-30" />
          <p className="text-lg">尚無持股</p>
          <p className="text-sm">點擊右上角「新增持股」開始追蹤</p>
        </div>
      ) : (
        <>
          {/* 總覽卡片 */}
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
            <SummaryCard icon={<DollarSign size={16} className="text-gray-400" />} label="投入成本" value={fmtBig(totalInvested)} color="text-white" />
            <SummaryCard icon={<BarChart2 size={16} className="text-indigo-400" />} label="目前市值" value={fmtBig(totalCurrent)} color="text-white" />
            <SummaryCard
              icon={totalPl >= 0 ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
              label="總損益"
              value={fmtMoney(totalPl)}
              color={totalPl >= 0 ? 'text-green-400' : 'text-red-400'}
            />
            <SummaryCard
              icon={totalPlPct >= 0 ? <TrendingUp size={16} className="text-green-400" /> : <TrendingDown size={16} className="text-red-400" />}
              label="報酬率"
              value={`${totalPlPct >= 0 ? '+' : ''}${totalPlPct.toFixed(2)}%`}
              color={totalPlPct >= 0 ? 'text-green-400' : 'text-red-400'}
            />
          </div>

          {/* 持股表格 */}
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-2.5">代號</th>
                  <th className="text-right px-4 py-2.5">股數</th>
                  <th className="text-right px-4 py-2.5">平均成本</th>
                  <th className="text-right px-4 py-2.5">現價</th>
                  <th className="text-right px-4 py-2.5">今日漲跌</th>
                  <th className="text-right px-4 py-2.5">市值</th>
                  <th className="text-right px-4 py-2.5">損益</th>
                  <th className="text-right px-4 py-2.5">報酬率</th>
                  <th className="px-4 py-2.5"></th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {rows.map(({ h, price, changePct, current, pl, plPct, loading }) => (
                  <tr
                    key={h.symbol}
                    className="hover:bg-gray-800/60 cursor-pointer"
                    onClick={() => navigate(`/stock/${h.symbol}`)}
                  >
                    <td className="px-4 py-3">
                      <p className="font-bold text-indigo-300">{h.symbol}</p>
                      <p className="text-xs text-gray-500">{h.shares} 股</p>
                    </td>
                    <td className="px-4 py-3 text-right text-gray-400">{stockPrefix(h.symbol)}{h.avg_cost.toFixed(2)}</td>
                    <td className="px-4 py-3 text-right font-semibold">
                      {loading ? <span className="text-gray-600">載入中…</span> : price != null ? `${stockPrefix(h.symbol)}${price.toFixed(2)}` : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right text-xs font-semibold ${changePct != null && changePct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {changePct != null ? `${changePct >= 0 ? '+' : ''}${changePct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-right">{current != null ? fmtBig(current) : '—'}</td>
                    <td className={`px-4 py-3 text-right font-semibold ${pl != null && pl >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {pl != null ? fmtMoney(pl) : '—'}
                    </td>
                    <td className={`px-4 py-3 text-right font-bold ${plPct != null && plPct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {plPct != null ? `${plPct >= 0 ? '+' : ''}${plPct.toFixed(2)}%` : '—'}
                    </td>
                    <td className="px-4 py-3 text-center" onClick={(e) => e.stopPropagation()}>
                      <button
                        onClick={() => remove(h.symbol)}
                        className="text-gray-600 hover:text-red-400 transition p-1"
                      >
                        <Trash2 size={14} />
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </>
      )}
    </div>
  );
}

function SummaryCard({ icon, label, value, color }: {
  icon: React.ReactNode; label: string; value: string; color: string;
}) {
  return (
    <div className="bg-gray-900 border border-gray-800 rounded-xl p-4">
      <div className="flex items-center gap-1.5 text-xs text-gray-500 mb-2">{icon}{label}</div>
      <p className={`text-xl font-bold ${color}`}>{value}</p>
    </div>
  );
}
