import { useState } from 'react';
import { NavLink, useNavigate } from 'react-router-dom';
import { BarChart2, Search, Menu, X } from 'lucide-react';
import { useMarket } from '../context/MarketContext';

// Reverse map: Chinese short name → symbol
const TW_NAME_TO_SYM: Record<string, string> = {
  '台積電':'2330.TW','聯電':'2303.TW','華邦電':'2344.TW','旺宏':'2337.TW',
  '南亞科':'2408.TW','聯詠':'3034.TW','瑞昱':'2379.TW','國巨':'2327.TW',
  '日月光':'3711.TW','鴻海':'2317.TW','聯發科':'2454.TW','台達電':'2308.TW',
  '華碩':'2357.TW','廣達':'2382.TW','研華':'2395.TW','大立光':'3008.TW',
  '緯穎':'6669.TW','鴻準':'2354.TW','宏碁':'2353.TW','技嘉':'2376.TW',
  '光寶科':'2301.TW','緯創':'3231.TW','中信金':'2891.TW','國泰金':'2882.TW',
  '富邦金':'2881.TW','兆豐金':'2886.TW','玉山金':'2884.TW','第一金':'2892.TW',
  '開發金':'2883.TW','華南金':'2880.TW','元大金':'2885.TW','上海商銀':'5876.TW',
  '彰銀':'2801.TW','中華電':'2412.TW','遠傳':'4904.TW','台灣大':'3045.TW',
  '台塑化':'6505.TW','台塑':'1301.TW','南亞':'1303.TW','台化':'1326.TW',
  '中鋼':'2002.TW','和泰車':'2207.TW','統一':'1216.TW','統一超':'2912.TW',
  '台灣50':'0050.TW','高股息':'0056.TW',
};

const links = [
  { to: '/', label: '總覽' },
  { to: '/turnover', label: '成交值' },
  { to: '/flow', label: '資金流向' },
  { to: '/sectors', label: '板塊輪動' },
  { to: '/portfolio', label: '自選股' },
];

export default function Navbar() {
  const [query, setQuery] = useState('');
  const [searchHint, setSearchHint] = useState('');
  const [menuOpen, setMenuOpen] = useState(false);
  const navigate = useNavigate();
  const { market, setMarket } = useMarket();

  const showHint = (msg: string) => {
    setSearchHint(msg);
    setTimeout(() => setSearchHint(''), 2500);
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    let q = query.trim();
    if (!q) return;

    if (market === 'tw' && TW_NAME_TO_SYM[q]) {
      navigate(`/stock/${TW_NAME_TO_SYM[q]}`);
      setQuery('');
      setMenuOpen(false);
      return;
    }

    q = q.toUpperCase();

    if (market === 'tw') {
      if (/^\d{4,5}$/.test(q)) q += '.TW';
      if (!q.endsWith('.TW') && !q.endsWith('.TWO')) {
        showHint('請輸入台股代號');
        return;
      }
    } else {
      if (q.endsWith('.TW') || q.endsWith('.TWO') || /^\d{4,5}$/.test(q)) {
        showHint('請切換至台股模式');
        return;
      }
    }

    navigate(`/stock/${q}`);
    setQuery('');
    setMenuOpen(false);
  };

  const handleNavClick = () => setMenuOpen(false);

  return (
    <nav className="bg-gray-900 border-b border-gray-800 sticky top-0 z-50">
      {/* Main bar */}
      <div className="max-w-7xl mx-auto px-4 flex items-center h-14 gap-3">
        {/* Logo */}
        <NavLink to="/" onClick={handleNavClick} className="flex items-center gap-2 font-bold text-indigo-400 shrink-0">
          <BarChart2 size={20} />
          <span className="hidden sm:inline">股票追蹤器</span>
        </NavLink>

        {/* Market switcher */}
        <div className="flex rounded-lg overflow-hidden border border-gray-700 text-xs shrink-0">
          <button
            onClick={() => setMarket('us')}
            className={`px-2.5 py-1.5 font-semibold transition ${
              market === 'us' ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            🇺🇸 <span className="hidden xs:inline">美股</span>
          </button>
          <button
            onClick={() => setMarket('tw')}
            className={`px-2.5 py-1.5 font-semibold transition ${
              market === 'tw' ? 'bg-indigo-700 text-white' : 'bg-gray-800 text-gray-400 hover:text-white'
            }`}
          >
            🇹🇼 <span className="hidden xs:inline">台股</span>
          </button>
        </div>

        {/* Desktop nav links */}
        <div className="hidden md:flex items-center gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              className={({ isActive }) =>
                `px-3 py-1.5 rounded text-sm transition whitespace-nowrap ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>

        {/* Search */}
        <form onSubmit={handleSearch} className="ml-auto flex items-center shrink-0">
          <div className="relative">
            <Search size={14} className="absolute left-2.5 top-2 text-gray-500" />
            <input
              value={query}
              onChange={(e) => setQuery(e.target.value)}
              placeholder={market === 'tw' ? '代號或名稱…' : '代號…'}
              className="bg-gray-800 border border-gray-700 text-sm rounded pl-8 pr-3 py-1.5 w-28 sm:w-36 focus:outline-none focus:border-indigo-500"
            />
            {searchHint && (
              <div className="absolute top-full mt-1 right-0 bg-gray-800 border border-gray-700 text-xs text-yellow-400 px-2 py-1 rounded whitespace-nowrap z-50">
                {searchHint}
              </div>
            )}
          </div>
        </form>

        {/* Hamburger (mobile only) */}
        <button
          onClick={() => setMenuOpen(v => !v)}
          className="md:hidden p-1.5 rounded text-gray-400 hover:text-white hover:bg-gray-800 transition shrink-0"
        >
          {menuOpen ? <X size={20} /> : <Menu size={20} />}
        </button>
      </div>

      {/* Mobile dropdown menu */}
      {menuOpen && (
        <div className="md:hidden border-t border-gray-800 bg-gray-900 px-4 py-3 flex flex-col gap-1">
          {links.map((l) => (
            <NavLink
              key={l.to}
              to={l.to}
              end={l.to === '/'}
              onClick={handleNavClick}
              className={({ isActive }) =>
                `px-4 py-2.5 rounded text-sm transition ${
                  isActive ? 'bg-indigo-600 text-white' : 'text-gray-400 hover:text-white hover:bg-gray-800'
                }`
              }
            >
              {l.label}
            </NavLink>
          ))}
        </div>
      )}
    </nav>
  );
}
