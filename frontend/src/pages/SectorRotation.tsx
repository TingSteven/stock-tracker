import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchSectors } from '../api/client';
import { useMarket } from '../context/MarketContext';
import SectorHeatmap from '../components/SectorHeatmap';
import type { SectorData } from '../types';

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
  return <div className="w-8 h-8 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto my-16" />;
}

function Pct({ n }: { n: number }) {
  const s = n >= 0 ? '+' : '';
  return <span className={n >= 0 ? 'text-green-400' : 'text-red-400'}>{s}{n.toFixed(2)}%</span>;
}

function VsBenchmark({ v }: { v: number | null }) {
  if (v == null) return <span className="text-gray-600">—</span>;
  const s = v >= 0 ? '+' : '';
  return (
    <span className={`font-semibold ${v >= 3 ? 'text-green-400' : v <= -3 ? 'text-red-400' : 'text-gray-400'}`}>
      {s}{v.toFixed(1)}
    </span>
  );
}

function SignalBadge({ signal }: { signal: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    inflow:  { label: '流入', cls: 'bg-green-700 text-green-100' },
    outflow: { label: '流出', cls: 'bg-red-800 text-red-100' },
    neutral: { label: '中性', cls: 'bg-gray-700 text-gray-300' },
  };
  const { label, cls } = map[signal] ?? map.neutral;
  return <span className={`px-2 py-0.5 rounded text-xs font-semibold ${cls}`}>{label}</span>;
}

function BenchmarkCard({ bench }: { bench: SectorData }) {
  const up = bench.momentum_score >= 0;
  return (
    <div className="bg-gray-900 border border-indigo-900/60 rounded-xl p-4 flex flex-wrap gap-6 items-center">
      <div>
        <p className="text-xs text-gray-500 mb-0.5">基準 — 台灣50 (0050.TW)</p>
        <p className="text-xl font-bold text-indigo-300">NT${bench.price.toFixed(2)}</p>
      </div>
      {[
        { label: '今日', v: bench.change_1d },
        { label: '1週',  v: bench.change_1w },
        { label: '1月',  v: bench.change_1m },
        { label: '3月',  v: bench.change_3m },
      ].map(({ label, v }) => (
        <div key={label} className="text-center">
          <p className="text-[10px] text-gray-500 mb-0.5">{label}</p>
          <Pct n={v} />
        </div>
      ))}
      <div className="text-center ml-auto">
        <p className="text-[10px] text-gray-500 mb-0.5">動能分數</p>
        <p className={`text-lg font-bold ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? '+' : ''}{bench.momentum_score.toFixed(1)}
        </p>
      </div>
    </div>
  );
}

export default function SectorRotation() {
  const { market } = useMarket();
  const navigate = useNavigate();
  const isTw = market === 'tw';

  const { data: allSectors, isLoading, error, refetch } = useQuery({
    queryKey: ['sectors', market],
    queryFn: () => fetchSectors(market),
  });

  if (isLoading) return <Spinner />;
  if (error || !allSectors) return (
    <p className="text-red-400 mt-8">
      載入失敗 — <button onClick={() => refetch()} className="underline">重試</button>
    </p>
  );

  // TW: first entry is the benchmark (大盤(0050)), rest are sectors
  const benchmark = isTw ? allSectors[0] : null;
  const sectors = isTw ? allSectors.slice(1) : allSectors;

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">板塊輪動</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {isTw
            ? '台股各板塊多股平均動能，相對0050超額表現判斷輪動方向'
            : '美股各板塊資金流向'}
          ，動能分數 = 3月(40%) + 1月(30%) + 1週(20%) + 今日(10%)
        </p>
      </div>

      {/* Benchmark card (TW only) */}
      {isTw && benchmark && <BenchmarkCard bench={benchmark} />}

      <section>
        <h2 className="text-lg font-semibold mb-3">板塊熱力圖</h2>
        <SectorHeatmap sectors={sectors} isTw={isTw} />
      </section>

      <section>
        <h2 className="text-lg font-semibold mb-3">各板塊詳情</h2>
        <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
          <table className="w-full text-sm">
            <thead>
              <tr className="text-gray-500 text-xs border-b border-gray-800">
                <th className="text-left px-4 py-2.5">板塊</th>
                <th className="text-right px-4 py-2.5">{isTw ? '代表股' : 'ETF'}</th>
                <th className="text-right px-4 py-2.5">今日</th>
                <th className="text-right px-4 py-2.5">1週</th>
                <th className="text-right px-4 py-2.5">1月</th>
                <th className="text-right px-4 py-2.5">3月</th>
                <th className="text-right px-4 py-2.5">動能</th>
                {isTw && <th className="text-right px-4 py-2.5">相對0050</th>}
                <th className="text-center px-4 py-2.5">訊號</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-gray-800">
              {sectors.map((s) => (
                <tr key={s.etf} className="hover:bg-gray-800/50">
                  <td className="px-4 py-2.5 font-medium">{isTw ? s.name : (SECTOR_ZH[s.name] ?? s.name)}</td>
                  <td className="px-4 py-2.5 text-right">
                    <button
                      onClick={() => navigate(`/stock/${s.etf}`)}
                      className="text-indigo-300 font-mono text-xs hover:text-indigo-100 hover:underline transition"
                    >
                      {s.etf}
                    </button>
                  </td>
                  <td className="px-4 py-2.5 text-right"><Pct n={s.change_1d} /></td>
                  <td className="px-4 py-2.5 text-right"><Pct n={s.change_1w} /></td>
                  <td className="px-4 py-2.5 text-right"><Pct n={s.change_1m} /></td>
                  <td className="px-4 py-2.5 text-right"><Pct n={s.change_3m} /></td>
                  <td className={`px-4 py-2.5 text-right font-bold ${s.momentum_score >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                    {s.momentum_score >= 0 ? '+' : ''}{s.momentum_score.toFixed(1)}
                  </td>
                  {isTw && (
                    <td className="px-4 py-2.5 text-right">
                      <VsBenchmark v={s.vs_benchmark} />
                    </td>
                  )}
                  <td className="px-4 py-2.5 text-center"><SignalBadge signal={s.rotation_signal} /></td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
        {isTw && (
          <p className="text-xs text-gray-600 mt-2 pl-1">
            相對0050：板塊動能 − 台灣50動能，正值表示跑贏大盤
          </p>
        )}
      </section>
    </div>
  );
}
