import { useState, useMemo } from 'react';
import {
  ComposedChart, Line, Bar, Cell,
  XAxis, YAxis, Tooltip, ResponsiveContainer, CartesianGrid, ReferenceLine,
} from 'recharts';
import type { HistoryPoint } from '../types';

const RANGES = [
  { label: '1M', days: 21 },
  { label: '3M', days: 63 },
  { label: '6M', days: 126 },
  { label: '1Y', days: 252 },
] as const;
type RangeLabel = typeof RANGES[number]['label'];

function fmtDate(d: string) { return d.slice(5); }

function fmtAmt(v: number) {
  const abs = Math.abs(v);
  const s = v < 0 ? '-' : '';
  if (abs >= 1e9) return `${s}${(abs / 1e9).toFixed(1)}B`;
  if (abs >= 1e6) return `${s}${(abs / 1e6).toFixed(0)}M`;
  if (abs >= 1e3) return `${s}${(abs / 1e3).toFixed(0)}K`;
  return `${s}${abs.toFixed(0)}`;
}

function rollingSma(data: HistoryPoint[], period: number): (number | null)[] {
  return data.map((_, i) =>
    i >= period - 1
      ? data.slice(i - period + 1, i + 1).reduce((a, b) => a + b.close, 0) / period
      : null
  );
}

// OBV: 累積±成交量，收>開記正，反之記負
function computeObv(data: HistoryPoint[]): number[] {
  let obv = 0;
  return data.map(h => { obv += h.close >= h.open ? h.volume : -h.volume; return obv; });
}

// 量價動能：每日 (收-開)/開 × 量，再做 EMA 平滑
function computeVpmEma(data: HistoryPoint[], period = 5): number[] {
  const alpha = 2 / (period + 1);
  let ema = 0;
  return data.map((h, i) => {
    const vpm = h.open > 0 ? (h.close - h.open) / h.open * h.volume : 0;
    ema = i === 0 ? vpm : alpha * vpm + (1 - alpha) * ema;
    return ema;
  });
}

function ToggleChip({ label, active, color, onClick }: {
  label: string; active: boolean; color: string; onClick: () => void;
}) {
  return (
    <button
      onClick={onClick}
      className={`flex items-center gap-1.5 px-2.5 py-1 rounded-full border text-xs font-medium transition ${
        active
          ? 'border-gray-600 text-gray-200 bg-gray-800'
          : 'border-gray-700 text-gray-600 bg-transparent'
      }`}
    >
      <span className={`w-2 h-2 rounded-full ${active ? color : 'bg-gray-700'}`} />
      {label}
    </button>
  );
}

function PeriodInput({ label, value, onChange, color }: {
  label: string; value: number; onChange: (v: number) => void; color: string;
}) {
  return (
    <div className="flex items-center gap-1.5">
      <span className={`inline-block w-4 h-0.5 ${color}`} />
      <span className="text-xs text-gray-400">{label}</span>
      <input
        type="number" min={2} max={252} value={value}
        onChange={(e) => { const v = parseInt(e.target.value); if (v >= 2 && v <= 252) onChange(v); }}
        className="w-14 bg-gray-800 border border-gray-700 rounded px-1.5 py-0.5 text-xs text-white focus:outline-none focus:border-indigo-500 text-center"
      />
      <span className="text-xs text-gray-500">日均線</span>
    </div>
  );
}

// Custom candlestick shape: Bar dataKey="high", baseline=0 (clamped to domainMin by SVG clip).
// Pixel mapping: toY(p) = y + height*(high-p)/high
function Candle({ x, y, width, height, payload }: any) {
  if (!payload || height <= 0) return null;
  const { open, close, high, low } = payload;
  if (high <= 0) return null;
  const isUp = close >= open;
  const color = isUp ? '#22c55e' : '#ef4444';
  const cx = x + width / 2;
  const toY = (p: number) => y + height * (high - p) / high;
  const bodyTop = toY(Math.max(open, close));
  const bodyBottom = toY(Math.min(open, close));
  const bodyH = Math.max(bodyBottom - bodyTop, 1);
  const bodyW = Math.max(Math.min(width * 0.65, 14), 1.5);
  return (
    <g>
      <line x1={cx} y1={toY(high)} x2={cx} y2={toY(low)} stroke={color} strokeWidth={1} />
      <rect x={cx - bodyW / 2} y={bodyTop} width={bodyW} height={bodyH} fill={color} fillOpacity={0.9} />
    </g>
  );
}

function PanelLabel({ text, sub }: { text: string; sub?: string }) {
  return (
    <div className="flex items-baseline gap-2 mb-0.5 pl-[54px]">
      <span className="text-[10px] font-semibold text-gray-500 uppercase tracking-wider">{text}</span>
      {sub && <span className="text-[10px] text-gray-600">{sub}</span>}
    </div>
  );
}

export default function TechnicalChart({ history }: { history: HistoryPoint[] }) {
  const [range, setRange] = useState<RangeLabel>('3M');
  const [period1, setPeriod1] = useState(20);
  const [period2, setPeriod2] = useState(60);
  const [showVolume, setShowVolume] = useState(true);
  const [showObv,    setShowObv]    = useState(true);
  const [showVpm,    setShowVpm]    = useState(true);

  const days = RANGES.find(r => r.label === range)!.days;
  const sliced = useMemo(() => history.slice(-days), [history, days]);

  const sma1    = useMemo(() => rollingSma(sliced, period1), [sliced, period1]);
  const sma2    = useMemo(() => rollingSma(sliced, period2), [sliced, period2]);
  const obv     = useMemo(() => computeObv(sliced), [sliced]);
  const vpmEma  = useMemo(() => computeVpmEma(sliced), [sliced]);

  const chartData = useMemo(() =>
    sliced.map((h, i) => ({ ...h, sma1: sma1[i], sma2: sma2[i], obv: obv[i], vpm: vpmEma[i] })),
    [sliced, sma1, sma2, obv, vpmEma]
  );

  const domainMin = useMemo(() => Math.min(...sliced.map(h => h.low))  * 0.99, [sliced]);
  const domainMax = useMemo(() => Math.max(...sliced.map(h => h.high)) * 1.01, [sliced]);

  // OBV domain always includes 0
  const obvMin = useMemo(() => Math.min(0, ...obv) * 1.1, [obv]);
  const obvMax = useMemo(() => Math.max(0, ...obv) * 1.1, [obv]);

  // VPM domain always includes 0
  const vpmMin = useMemo(() => Math.min(0, ...vpmEma) * 1.1, [vpmEma]);
  const vpmMax = useMemo(() => Math.max(0, ...vpmEma) * 1.1, [vpmEma]);

  const startPrice = sliced[0]?.close ?? 0;
  const endPrice   = sliced[sliced.length - 1]?.close ?? 0;
  const periodUp   = endPrice >= startPrice;
  const periodChangePct = startPrice > 0 ? (endPrice - startPrice) / startPrice * 100 : 0;

  // OBV end vs start: positive trend = accumulation
  const obvEnd   = obv[obv.length - 1] ?? 0;
  const obvTrend = obvEnd >= 0;

  const step = Math.max(1, Math.floor(sliced.length / 7));
  const sharedMargin = { left: 0, right: 8, top: 4, bottom: 0 };
  const noTooltip = { content: () => null, cursor: { stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '3 3' } };

  return (
    <div>
      {/* Controls — row 1: range + MA */}
      <div className="flex flex-wrap gap-4 mb-2 items-center">
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs">
          {RANGES.map(r => (
            <button key={r.label} onClick={() => setRange(r.label)}
              className={`px-3 py-1 font-semibold transition ${range === r.label ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'}`}>
              {r.label}
            </button>
          ))}
        </div>
        <PeriodInput label="均線 1" value={period1} onChange={setPeriod1} color="bg-yellow-400" />
        <PeriodInput label="均線 2" value={period2} onChange={setPeriod2} color="bg-orange-400" />
        <span className={`ml-auto text-sm font-semibold ${periodUp ? 'text-green-400' : 'text-red-400'}`}>
          {periodUp ? '▲' : '▼'} {Math.abs(periodChangePct).toFixed(2)}%
          <span className="text-xs text-gray-500 ml-1 font-normal">期間漲跌</span>
        </span>
      </div>
      {/* Controls — row 2: panel toggles */}
      <div className="flex gap-2 mb-3">
        <span className="text-[10px] text-gray-600 self-center mr-1">指標</span>
        <ToggleChip label="成交量" active={showVolume} color="bg-indigo-500"   onClick={() => setShowVolume(v => !v)} />
        <ToggleChip label="OBV"    active={showObv}    color="bg-indigo-400"   onClick={() => setShowObv(v => !v)} />
        <ToggleChip label="量價動能" active={showVpm}  color="bg-green-500"    onClick={() => setShowVpm(v => !v)} />
      </div>

      {/* ① 陰陽燭 + 均線 */}
      <ResponsiveContainer width="100%" height={250}>
        <ComposedChart data={chartData} syncId="sc" margin={sharedMargin}>
          <CartesianGrid strokeDasharray="3 3" stroke="#1f2937" />
          <XAxis dataKey="date" tickFormatter={fmtDate} interval={step - 1}
            tick={{ fill: '#6b7280', fontSize: 10 }}
            hide={showVolume || showObv || showVpm} />
          <YAxis domain={[domainMin, domainMax]} tickFormatter={(v) => `$${v.toFixed(0)}`}
            tick={{ fill: '#6b7280', fontSize: 11 }} width={54} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            if (!d) return null;
            const isUp = d.close >= d.open;
            return (
              <div className="bg-gray-900 border border-gray-700 rounded-lg p-3 text-xs shadow-lg">
                <p className="text-gray-400 mb-2 font-medium">{d.date}</p>
                <div className="grid grid-cols-2 gap-x-4 gap-y-0.5">
                  <span className="text-gray-500">開盤</span><span className="text-white font-mono">${d.open?.toFixed(2)}</span>
                  <span className="text-gray-500">最高</span><span className="text-green-400 font-mono">${d.high?.toFixed(2)}</span>
                  <span className="text-gray-500">最低</span><span className="text-red-400 font-mono">${d.low?.toFixed(2)}</span>
                  <span className="text-gray-500">收盤</span>
                  <span className={`font-mono font-bold ${isUp ? 'text-green-400' : 'text-red-400'}`}>${d.close?.toFixed(2)}</span>
                </div>
                {d.sma1 != null && <p className="text-yellow-400 mt-1.5">MA{period1}: ${d.sma1.toFixed(2)}</p>}
                {d.sma2 != null && <p className="text-orange-400">MA{period2}: ${d.sma2.toFixed(2)}</p>}
              </div>
            );
          }} />
          <Bar dataKey="high" shape={(props: any) => <Candle {...props} />} isAnimationActive={false} maxBarSize={20} />
          <Line type="monotone" dataKey="sma1" stroke="#facc15" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
          <Line type="monotone" dataKey="sma2" stroke="#f97316" strokeWidth={1.5} dot={false} strokeDasharray="4 2" connectNulls />
        </ComposedChart>
      </ResponsiveContainer>

      {/* ② 成交量 */}
      {showVolume && <>
        <PanelLabel text="成交量" />
        <ResponsiveContainer width="100%" height={60}>
          <ComposedChart data={chartData} syncId="sc" margin={sharedMargin}>
            <XAxis dataKey="date" tickFormatter={fmtDate} interval={step - 1}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              hide={showObv || showVpm} />
            <YAxis tickFormatter={(v) => `${(v / 1e6).toFixed(0)}M`} tick={{ fill: '#6b7280', fontSize: 9 }} width={54} />
            <Tooltip {...noTooltip} />
            <Bar dataKey="volume" maxBarSize={6} isAnimationActive={false}>
              {chartData.map((e, i) => (
                <Cell key={i} fill={e.close >= e.open ? '#22c55e' : '#ef4444'} fillOpacity={0.55} />
              ))}
            </Bar>
          </ComposedChart>
        </ResponsiveContainer>
      </>}

      {/* ③ OBV 能量潮 */}
      {showObv && <>
        <PanelLabel text="OBV 能量潮" sub="累積量方向：↑積累  ↓派發" />
        <ResponsiveContainer width="100%" height={65}>
          <ComposedChart data={chartData} syncId="sc" margin={sharedMargin}>
            <XAxis dataKey="date" tickFormatter={fmtDate} interval={step - 1}
              tick={{ fill: '#6b7280', fontSize: 10 }}
              hide={showVpm} />
            <YAxis domain={[obvMin, obvMax]} tickFormatter={fmtAmt} tick={{ fill: '#6b7280', fontSize: 9 }} width={54} />
            <Tooltip content={({ active, payload }) => {
              if (!active || !payload?.length) return null;
              const d = payload[0]?.payload;
              if (!d) return null;
              const pos = d.obv >= 0;
              return (
                <div className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                  <p className="text-gray-400 text-[10px] mb-0.5">{d.date}</p>
                  <p className={pos ? 'text-indigo-400' : 'text-rose-400'}>OBV {fmtAmt(d.obv)}</p>
                </div>
              );
            }} cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '3 3' }} />
            <ReferenceLine y={0} stroke="#374151" />
            <Line type="monotone" dataKey="obv" stroke={obvTrend ? '#818cf8' : '#f43f5e'}
              strokeWidth={1.5} dot={false} isAnimationActive={false} />
          </ComposedChart>
        </ResponsiveContainer>
      </>}

      {/* ④ 量價動能 VPM EMA5 */}
      {showVpm && <>
        <PanelLabel text="量價動能 EMA5" sub="正值=量配價漲  負值=量配價跌" />
        <ResponsiveContainer width="100%" height={70}>
        <ComposedChart data={chartData} syncId="sc" margin={sharedMargin}>
          <XAxis dataKey="date" tickFormatter={fmtDate} interval={step - 1} tick={{ fill: '#6b7280', fontSize: 10 }} />
          <YAxis domain={[vpmMin, vpmMax]} tickFormatter={fmtAmt} tick={{ fill: '#6b7280', fontSize: 9 }} width={54} />
          <Tooltip content={({ active, payload }) => {
            if (!active || !payload?.length) return null;
            const d = payload[0]?.payload;
            if (!d) return null;
            const pos = d.vpm >= 0;
            return (
              <div className="bg-gray-900 border border-gray-700 rounded-lg px-2.5 py-1.5 text-xs shadow-lg">
                <p className="text-gray-400 text-[10px] mb-0.5">{d.date}</p>
                <p className={pos ? 'text-green-400' : 'text-red-400'}>動能 {pos ? '+' : ''}{fmtAmt(d.vpm)}</p>
                <p className="text-gray-600 text-[10px] mt-0.5">{pos ? '量配價漲' : '量配價跌'}</p>
              </div>
            );
          }} cursor={{ stroke: '#4b5563', strokeWidth: 1, strokeDasharray: '3 3' }} />
          <ReferenceLine y={0} stroke="#374151" />
          <Bar dataKey="vpm" maxBarSize={6} isAnimationActive={false}>
            {chartData.map((e, i) => (
              <Cell key={i} fill={(e.vpm ?? 0) >= 0 ? '#22c55e' : '#ef4444'} fillOpacity={0.7} />
            ))}
          </Bar>
        </ComposedChart>
        </ResponsiveContainer>
      </>}
    </div>
  );
}
