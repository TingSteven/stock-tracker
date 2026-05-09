import { useQuery } from '@tanstack/react-query';
import { useNavigate } from 'react-router-dom';
import { fetchUnusualVolume } from '../api/client';
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

function fmtVol(n: number) {
  if (n >= 1e6) return `${(n / 1e6).toFixed(2)}M`;
  if (n >= 1e3) return `${(n / 1e3).toFixed(0)}K`;
  return String(n);
}

function VolumeBar({ ratio }: { ratio: number }) {
  const pct = Math.min(100, (ratio / 5) * 100);
  const color = ratio >= 3 ? 'bg-green-500' : ratio >= 2 ? 'bg-yellow-500' : 'bg-indigo-500';
  return (
    <div className="flex items-center gap-2">
      <div className="w-20 h-2 bg-gray-800 rounded-full overflow-hidden">
        <div className={`h-full ${color} rounded-full`} style={{ width: `${pct}%` }} />
      </div>
      <span className={`text-xs font-bold ${ratio >= 3 ? 'text-green-400' : ratio >= 2 ? 'text-yellow-400' : 'text-indigo-400'}`}>
        {ratio.toFixed(1)}x
      </span>
    </div>
  );
}

export default function CapitalFlow() {
  const navigate = useNavigate();
  const { market } = useMarket();
  const prefix = market === 'tw' ? 'NT$' : '$';

  const { data: unusual, isLoading, error, refetch } = useQuery({
    queryKey: ['unusual-volume', market],
    queryFn: () => fetchUnusualVolume(market),
  });

  const sectorCounts: Record<string, number> = {};
  unusual?.forEach((s) => {
    const name = SECTOR_ZH[s.sector] ?? s.sector;
    sectorCounts[name] = (sectorCounts[name] ?? 0) + 1;
  });
  const sectorRanked = Object.entries(sectorCounts).sort((a, b) => b[1] - a[1]);

  return (
    <div className="space-y-8">
      <div>
        <h1 className="text-2xl font-bold">資金流向</h1>
        <p className="text-gray-400 mt-1 text-sm">
          {market === 'tw' ? '台股' : '美股'}成交量顯著高於3個月均量的個股 — 機構資金進出的重要訊號。量比 &gt; 3x 為強烈訊號。
        </p>
      </div>

      <div className="bg-indigo-950 border border-indigo-800 rounded-xl p-4 text-sm text-indigo-300">
        成交量急增通常代表機構買賣力道介入。結合價格方向可判斷主力是在吸籌還是出貨。
      </div>

      <section>
        <h2 className="text-lg font-semibold mb-3">量比異常個股（前20）</h2>
        {isLoading ? (
          <Spinner />
        ) : error ? (
          <p className="text-red-400 text-sm">載入失敗 — <button onClick={() => refetch()} className="underline">重試</button></p>
        ) : (
          <div className="bg-gray-900 border border-gray-800 rounded-xl overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-gray-500 text-xs border-b border-gray-800">
                  <th className="text-left px-4 py-2.5">代號</th>
                  <th className="text-left px-4 py-2.5">名稱</th>
                  <th className="text-right px-4 py-2.5">價格</th>
                  <th className="text-right px-4 py-2.5">漲跌幅</th>
                  <th className="text-right px-4 py-2.5">成交量</th>
                  <th className="text-right px-4 py-2.5">均量</th>
                  <th className="text-left px-4 py-2.5">量比</th>
                  <th className="text-left px-4 py-2.5">類股</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-gray-800">
                {unusual?.map((s) => (
                  <tr
                    key={s.symbol}
                    className="hover:bg-gray-800/50 cursor-pointer"
                    onClick={() => navigate(`/stock/${s.symbol}`)}
                  >
                    <td className="px-4 py-2.5 font-bold text-indigo-300">{twDisplayName(s.symbol)}</td>
                    <td className="px-4 py-2.5 text-gray-300 max-w-[150px] truncate">
                      {s.symbol.endsWith('.TW') ? '' : s.name}
                    </td>
                    <td className="px-4 py-2.5 text-right">{prefix}{s.price.toFixed(2)}</td>
                    <td className={`px-4 py-2.5 text-right font-semibold ${s.change_pct >= 0 ? 'text-green-400' : 'text-red-400'}`}>
                      {s.change_pct >= 0 ? '+' : ''}{s.change_pct.toFixed(2)}%
                    </td>
                    <td className="px-4 py-2.5 text-right font-mono">{fmtVol(s.volume)}</td>
                    <td className="px-4 py-2.5 text-right font-mono text-gray-400">{fmtVol(s.avg_volume)}</td>
                    <td className="px-4 py-2.5"><VolumeBar ratio={s.volume_ratio} /></td>
                    <td className="px-4 py-2.5 text-gray-400 text-xs">{SECTOR_ZH[s.sector] ?? s.sector}</td>
                  </tr>
                ))}
                {unusual?.length === 0 && (
                  <tr>
                    <td colSpan={8} className="text-center py-8 text-gray-500">今日無異常成交量個股</td>
                  </tr>
                )}
              </tbody>
            </table>
          </div>
        )}
      </section>

      {sectorRanked.length > 0 && (
        <section>
          <h2 className="text-lg font-semibold mb-3">板塊資金集中度</h2>
          <div className="flex flex-wrap gap-3">
            {sectorRanked.map(([sector, count]) => (
              <div key={sector} className="bg-gray-900 border border-gray-800 rounded-lg px-4 py-2 flex items-center gap-2">
                <span className="font-semibold text-sm">{sector}</span>
                <span className="bg-yellow-700 text-yellow-100 text-xs px-1.5 py-0.5 rounded-full font-bold">{count}</span>
              </div>
            ))}
          </div>
        </section>
      )}
    </div>
  );
}
