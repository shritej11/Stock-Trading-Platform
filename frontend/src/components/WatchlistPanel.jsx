// WatchlistPanel.jsx
import React from 'react';
import { addWatchlist, removeWatchlist } from '../services/api';

const WatchlistPanel = ({ watchlist, stocks, onRefresh }) => {

  const handleAdd = async (symbol) => {
    try {
      await addWatchlist(symbol);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const handleRemove = async (symbol) => {
    try {
      await removeWatchlist(symbol);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const watchedSymbols = watchlist?.map(w => w.symbol) || [];

  return (
    <div>
      {/* Add stocks */}
      <div style={{ marginBottom: 14 }}>
        <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>
          ADD TO WATCHLIST
        </p>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          {stocks.map(s => {
            const isWatched = watchedSymbols.includes(s.symbol);
            return (
              <button
                key={s.symbol}
                onClick={() => isWatched
                  ? handleRemove(s.symbol)
                  : handleAdd(s.symbol)}
                style={{
                  padding: '6px 14px', borderRadius: 8, fontSize: 12,
                  fontWeight: 600, cursor: 'pointer', border: 'none',
                  background: isWatched ? '#14532d' : '#1a1d27',
                  color:      isWatched ? '#22c55e' : '#94a3b8',
                  border:     `1px solid ${isWatched ? '#22c55e40' : '#2a2d3e'}`,
                }}
              >
                {isWatched ? '✓ ' : '+ '}
                {s.symbol.replace('.NS', '')}
              </button>
            );
          })}
        </div>
      </div>

      {/* Watchlist items */}
      {!watchlist || watchlist.length === 0 ? (
        <p style={{ color: '#475569', fontSize: 13,
                    textAlign: 'center', padding: 20 }}>
          Your watchlist is empty. Add stocks above.
        </p>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
          {watchlist.map((w, i) => (
            <div key={i} style={{
              display: 'flex', justifyContent: 'space-between',
              alignItems: 'center', padding: '10px 12px',
              background: '#0f1117', borderRadius: 8,
              border: '1px solid #2a2d3e',
            }}>
              <div>
                <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                  {w.symbol.replace('.NS', '')}
                </p>
                <p style={{ fontSize: 12, color: '#94a3b8', marginTop: 2 }}>
                  Rs.{w.price} ·
                  <span style={{
                    color: w.change_pct >= 0 ? '#22c55e' : '#ef4444',
                    marginLeft: 4,
                  }}>
                    {w.change_pct >= 0 ? '+' : ''}{w.change_pct}%
                  </span>
                </p>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '2px 10px',
                  borderRadius: 10,
                  background: w.signal === 'BUY'  ? '#14532d'
                            : w.signal === 'HOLD' ? '#78350f' : '#7f1d1d',
                  color:      w.signal === 'BUY'  ? '#22c55e'
                            : w.signal === 'HOLD' ? '#f59e0b' : '#ef4444',
                }}>
                  {w.signal}
                </span>
                <button
                  onClick={() => handleRemove(w.symbol)}
                  style={{
                    padding: '4px 10px', background: 'transparent',
                    border: '1px solid #2a2d3e', borderRadius: 6,
                    color: '#64748b', fontSize: 11, cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default WatchlistPanel;