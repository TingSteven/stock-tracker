import { useNavigate } from 'react-router-dom';
import { TrendingDown, TrendingUp } from 'lucide-react';
import type { StockAnalysis } from '../types';
import BuySignalBadge from './BuySignalBadge';

function fmt(n: number) {
  return n.toFixed(2);
}

interface Props {
  stock: StockAnalysis;
}

export default function StockCard({ stock }: Props) {
  const navigate = useNavigate();
  const up = stock.change_pct >= 0;

  return (
    <div
      onClick={() => navigate(`/stock/${stock.symbol}`)}
      className="bg-gray-900 border border-gray-800 rounded-xl p-4 cursor-pointer hover:border-indigo-700 transition"
    >
      <div className="flex items-start justify-between mb-2">
        <div>
          <p className="font-bold text-lg">{stock.symbol}</p>
          <p className="text-xs text-gray-500 truncate max-w-[140px]">{stock.name}</p>
        </div>
        <BuySignalBadge score={stock.buy_score} />
      </div>
      <div className="flex items-center gap-2 mb-3">
        <span className="text-xl font-semibold">${fmt(stock.price)}</span>
        <span className={`flex items-center gap-0.5 text-sm ${up ? 'text-green-400' : 'text-red-400'}`}>
          {up ? <TrendingUp size={14} /> : <TrendingDown size={14} />}
          {up ? '+' : ''}{fmt(stock.change_pct)}%
        </span>
      </div>
      <div className="grid grid-cols-3 gap-1 text-xs text-gray-400">
        <div>
          <p className="text-gray-600">RSI</p>
          <p className={stock.rsi != null && stock.rsi < 30 ? 'text-green-400' : stock.rsi != null && stock.rsi > 70 ? 'text-red-400' : 'text-white'}>
            {stock.rsi?.toFixed(1) ?? '—'}
          </p>
        </div>
        <div>
          <p className="text-gray-600">Vol/Avg</p>
          <p className={stock.volume_ratio >= 2 ? 'text-yellow-400' : 'text-white'}>
            {stock.volume_ratio.toFixed(1)}x
          </p>
        </div>
        <div>
          <p className="text-gray-600">P/E</p>
          <p className="text-white">{stock.pe_ratio?.toFixed(1) ?? '—'}</p>
        </div>
      </div>
      {stock.sector && (
        <p className="mt-2 text-xs text-indigo-400">{stock.sector}</p>
      )}
    </div>
  );
}
