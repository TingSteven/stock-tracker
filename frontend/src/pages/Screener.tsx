import { useState } from 'react';
import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchScreener } from '../api/client';
import BuySignalBadge, { SignalBadge } from '../components/BuySignalBadge';
import type { ScreenerParams } from '../api/client';

function Spinner() {
  return <div className="w-6 h-6 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto my-10" />;
}

function fmtCap(n: number | null) {
  if (n == null) return '—';
  if (n >= 1e12) return `$${(n / 1e12).toFixed(2)}T`;
  if (n >= 1e9) return `$${(n / 1e9).toFixed(1)}B`;
  return `$${(n / 1e6).toFixed(0)}M`;
}

export default function Screener() {
  const navigate = useNavigate();
  const [params, setParams] = useState<ScreenerParams>({
    pe_max: 35,
    rsi_min: 30,
    rsi_max: 70,
    volume_ratio_min: 1.0,
  });
  const [submitted, setSubmitted] = useState(params);

  const { data, isLoading, error, refetch } = useQuery({
    queryKey: ['screener', submitted],
    queryFn: () => fetchScreener(submitted),
  });

  const num = (v: number | undefined) => (v !== undefined ? v : '');

  return (
    <div className="space-y-6">
      <h1 className="text-2xl font-bold">Stock Screener</h1>

      {/* Filters */}
      <div className="bg-gray-900 border border-gray-800 rounded-xl p-5">
        <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mb-4">
          <label className="block">
            <span className="text-xs text-gray-400 mb-1 block">PE Ratio Max</span>
            <input
              type="number"
              value={num(params.pe_max)}
              onChange={(e) => setParams((p) => ({ ...p, pe_max: Number(e.target.value) || undefined }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400 mb-1 block">RSI Min</span>
            <input
              type="number"
              min={0} max={100}
              value={num(params.rsi_min)}
              onChange={(e) => setParams((p) => ({ ...p, rsi_min: Number(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400 mb-1 block">RSI Max</span>
            <input
              type="number"
              min={0} max={100}
              value={num(params.rsi_max)}
              onChange={(e) => setParams((p) => ({ ...p, rsi_max: Number(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
            />
          </label>
          <label className="block">
            <span className="text-xs text-gray-400 mb-1 block">Volume Ratio Min</span>
            <input
              type="number"
              step={0.1}
              value={num(params.volume_ratio_min)}
              onChange={(e) => setParams((p) => ({ ...p, volume_ratio_min: Number(e.target.value) }))}
              className="w-full bg-gray-800 border border-gray-700 rounded px-3 py-1.5 text-sm focus:outline-none focus:border-indigo-500"
            />
          </label>
        </div>
        <button
          onClick={() => setSubmitted(params)}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 py-2 rounded-lg text-sm transition"
        >
          Screen Stocks
        </button>
      </div>

      {/* Results */}
      {isLoading ? (
        <Spinner />
      ) : error ? (
        <p className="text-red-400 text-sm">Failed to load — <button onClick={() => refetch()} className="underline">retry</button></p>
      ) : (
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-2.5">Symbol</th>
                <th className="text-left px-4 py-2.5">Name</th>
                <th className="text-right px-4 py-2.5">Price</th>
                <th className="text-right px-4 py-2.5">Change</th>
                <th className="text-right px-4 py-2.5">Score</th>
                <th className="text-right px-4 py-2.5">RSI</th>
                <th className="text-right px-4 py-2.5">P/E</th>
                <th className="text-right px-4 py-2.5">Vol Ratio</th>
                <th className="text-right px-4 py-2.5">Mkt Cap</th>
                <th className="text-left px-4 py-2.5">Signal</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {data?.map((s) => (
                <tr
                  key={s.symbol}
                  className="hover:bg-gray-800/50 cursor-pointer"
                  onClick={() => navigate(`/stock/${s.symbol}`)}
                >
                  <td className="px-4 py-2.5 font-bold text-indigo-300">{s.symbol}</td>
                  <td className="px-4 py-2.5 text-gray-300 max-w-[140px] truncate">{s.name}</td>
                  <td className="px-4 py-2.5 text-right">${s.price.toFixed(2)}</td>
                  <td className={`px-4 py-2.5 text-right ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                  </td>
                  <td className="px-4 py-2.5 text-right">
                    <BuySignalBadge score={s.buy_score} />
                  </td>
                  <td className={`px-4 py-2.5 text-right ${s.rsi != null && s.rsi < 30 ? 'text-green-400' : s.rsi != null && s.rsi > 70 ? 'text-red-400' : ''}`}>
                    {s.rsi?.toFixed(1) ?? '—'}
                  </td>
                  <td className="px-4 py-2.5 text-right">{s.pe_ratio?.toFixed(1) ?? '—'}</td>
                  <td className={`px-4 py-2.5 text-right ${s.volume_ratio >= 2 ? 'text-yellow-400' : ''}`}>
                    {s.volume_ratio.toFixed(2)}x
                  </td>
                  <td className="px-4 py-2.5 text-right text-gray-400">{fmtCap(s.market_cap)}</td>
                  <td className="px-4 py-2.5"><SignalBadge signal={s.technical_signal} /></td>
                </tr>
              ))}
              {data?.length === 0 && (
                <tr><td colSpan={10} className="text-center py-8 text-gray-500">No stocks match your filters</td></tr>
              )}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
