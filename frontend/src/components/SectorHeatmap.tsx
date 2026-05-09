import { useNavigate } from 'react-router-dom';
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

function momentumColor(score: number): string {
  if (score > 15) return 'bg-green-700';
  if (score > 8)  return 'bg-green-800';
  if (score > 3)  return 'bg-green-900';
  if (score > -3) return 'bg-gray-800';
  if (score > -8) return 'bg-red-900';
  if (score > -15)return 'bg-red-800';
  return 'bg-red-700';
}

function vsBenchmarkColor(v: number | null): string {
  if (v == null) return '';
  if (v >= 3)  return 'text-green-400';
  if (v <= -3) return 'text-red-400';
  return 'text-gray-400';
}

function rotationBadge(signal: string) {
  if (signal === 'inflow')  return 'bg-green-600 text-green-100';
  if (signal === 'outflow') return 'bg-red-700 text-red-100';
  return 'bg-gray-700 text-gray-300';
}

interface Props {
  sectors: SectorData[];
  isTw?: boolean;
}

export default function SectorHeatmap({ sectors, isTw = false }: Props) {
  const navigate = useNavigate();

  return (
    <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-2">
      {sectors.map((s) => (
        <div
          key={s.etf}
          onClick={() => navigate(`/stock/${s.etf}`)}
          className={`${momentumColor(s.momentum_score)} rounded-xl p-3 cursor-pointer hover:opacity-80 transition`}
        >
          <div className="flex items-start justify-between mb-1">
            <div className="min-w-0">
              <p className="text-sm font-bold text-white truncate">
                {isTw ? s.name : (SECTOR_ZH[s.name] ?? s.name)}
              </p>
              <p className="text-xs text-white/50 leading-tight">{s.etf}</p>
            </div>
            <span className={`text-xs px-1.5 py-0.5 rounded-full font-semibold shrink-0 ml-1 ${rotationBadge(s.rotation_signal)}`}>
              {s.rotation_signal === 'inflow' ? '▲' : s.rotation_signal === 'outflow' ? '▼' : '–'}
            </span>
          </div>
          <p className="text-lg font-bold text-white">
            {s.momentum_score > 0 ? '+' : ''}{s.momentum_score.toFixed(1)}
          </p>
          <p className="text-xs text-white/70">
            今日: {s.change_1d >= 0 ? '+' : ''}{s.change_1d.toFixed(2)}%
          </p>
          {isTw && s.vs_benchmark != null && (
            <p className={`text-xs mt-0.5 font-semibold ${vsBenchmarkColor(s.vs_benchmark)}`}>
              vs 0050: {s.vs_benchmark >= 0 ? '+' : ''}{s.vs_benchmark.toFixed(1)}
            </p>
          )}
        </div>
      ))}
    </div>
  );
}
