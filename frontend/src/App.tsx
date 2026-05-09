import { Routes, Route } from 'react-router-dom';
import { MarketProvider } from './context/MarketContext';
import Navbar from './components/Navbar';
import Dashboard from './pages/Dashboard';
import Screener from './pages/Screener';
import StockDetail from './pages/StockDetail';
import SectorRotation from './pages/SectorRotation';
import CapitalFlow from './pages/CapitalFlow';
import Portfolio from './pages/Portfolio';
import TurnoverRanking from './pages/TurnoverRanking';

export default function App() {
  return (
    <MarketProvider>
      <div className="min-h-screen bg-gray-950 text-white">
        <Navbar />
        <main className="max-w-7xl mx-auto px-3 sm:px-4 py-4 sm:py-6" style={{ paddingBottom: 'max(1.5rem, env(safe-area-inset-bottom))' }}>
          <Routes>
            <Route path="/" element={<Dashboard />} />
            <Route path="/screener" element={<Screener />} />
            <Route path="/stock/:symbol" element={<StockDetail />} />
            <Route path="/sectors" element={<SectorRotation />} />
            <Route path="/flow" element={<CapitalFlow />} />
            <Route path="/turnover" element={<TurnoverRanking />} />
            <Route path="/portfolio" element={<Portfolio />} />
          </Routes>
        </main>
      </div>
    </MarketProvider>
  );
}
