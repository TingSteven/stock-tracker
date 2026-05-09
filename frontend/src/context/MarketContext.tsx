import { createContext, useContext, useState } from 'react';

export type Market = 'us' | 'tw';

interface MarketContextValue {
  market: Market;
  setMarket: (m: Market) => void;
}

const MarketContext = createContext<MarketContextValue>({ market: 'us', setMarket: () => {} });

export function MarketProvider({ children }: { children: React.ReactNode }) {
  const [market, setMarketState] = useState<Market>(() =>
    (localStorage.getItem('stock-tracker-market') as Market) ?? 'us'
  );

  const setMarket = (m: Market) => {
    setMarketState(m);
    localStorage.setItem('stock-tracker-market', m);
  };

  return (
    <MarketContext.Provider value={{ market, setMarket }}>
      {children}
    </MarketContext.Provider>
  );
}

export const useMarket = () => useContext(MarketContext);
