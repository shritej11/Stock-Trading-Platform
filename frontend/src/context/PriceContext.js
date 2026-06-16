// PriceContext.js
// Global live price store — all components sync from here every 5 seconds

import React, { createContext, useContext, useState, useEffect } from 'react';
import { fetchLivePrices } from '../services/api';

const PriceContext = createContext({});

export const PriceProvider = ({ children }) => {
  const [prices,     setPrices]     = useState({});
  const [lastUpdate, setLastUpdate] = useState(null);
  const [connected,  setConnected]  = useState(false);

  useEffect(() => {
    const load = () => {
      fetchLivePrices()
        .then(r => {
          const map = {};
          r.data.prices.forEach(p => { map[p.symbol] = p; });
          setPrices(map);
          setLastUpdate(new Date());
          setConnected(true);
        })
        .catch(() => setConnected(false));
    };

    load();
    const interval = setInterval(load, 5000);
    return () => clearInterval(interval);
  }, []);

  const getPrice  = (symbol) => prices[symbol]?.price      || 0;
  const getChange = (symbol) => prices[symbol]?.change_pct || 0;
  const getData   = (symbol) => prices[symbol]             || null;

  return (
    <PriceContext.Provider value={{
      prices, getPrice, getChange, getData,
      lastUpdate, connected,
    }}>
      {children}
    </PriceContext.Provider>
  );
};

export const useLivePrice  = (symbol) => {
  const ctx = useContext(PriceContext);
  return ctx.getData(symbol);
};

export const useAllPrices  = () => useContext(PriceContext).prices;
export const usePriceStore = () => useContext(PriceContext);