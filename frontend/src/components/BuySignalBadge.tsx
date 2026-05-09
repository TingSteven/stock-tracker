interface Props {
  score: number;
  size?: 'sm' | 'lg';
}

function scoreLabel(score: number) {
  if (score >= 70) return { label: '強烈買入', color: 'bg-green-600 text-green-100' };
  if (score >= 55) return { label: '買入', color: 'bg-lime-600 text-lime-100' };
  if (score >= 40) return { label: '中性', color: 'bg-yellow-600 text-yellow-100' };
  if (score >= 25) return { label: '觀望', color: 'bg-orange-600 text-orange-100' };
  return { label: '避開', color: 'bg-red-700 text-red-100' };
}

export default function BuySignalBadge({ score, size = 'sm' }: Props) {
  const { label, color } = scoreLabel(score);
  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded font-semibold ${color} ${
        size === 'lg' ? 'px-4 py-2 text-base' : 'px-2 py-0.5 text-xs'
      }`}
    >
      {label}
      <span className="opacity-75">{score.toFixed(0)}</span>
    </span>
  );
}

export function SignalBadge({ signal }: { signal: string }) {
  const map: Record<string, { label: string; cls: string }> = {
    bullish: { label: '多頭', cls: 'bg-green-900 text-green-300 border border-green-700' },
    bearish: { label: '空頭', cls: 'bg-red-900 text-red-300 border border-red-700' },
    neutral: { label: '中性', cls: 'bg-gray-800 text-gray-400 border border-gray-700' },
  };
  const { label, cls } = map[signal] ?? map.neutral;
  return <span className={`px-2 py-0.5 rounded text-xs ${cls}`}>{label}</span>;
}
