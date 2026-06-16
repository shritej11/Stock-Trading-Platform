// StockList.jsx — syncs prices from global context
import React, { useEffect, useRef } from 'react';
import { colors, shadow }  from '../styles/theme';
import { usePriceStore }   from '../context/PriceContext';

const StockList = ({ stocks, selected, onSelect,
                     watchlist, onAddWatchlist }) => {
  const { getPrice, getChange, getData } = usePriceStore();
  const flashRef = useRef({});

  const watchedSymbols = watchlist?.map(w => w.symbol) || [];

  return (
    <div style={{
      width:      280,
      background: '#fff',
      borderLeft: `1px solid ${colors.border}`,
      height:     'calc(100vh - 98px)',
      overflowY:  'auto',
      position:   'fixed',
      right:      0,
      top:        98,
    }}>

      {/* Header */}
      <div style={{
        padding:      '12px 16px',
        borderBottom: `1px solid ${colors.border}`,
        position:     'sticky', top: 0,
        background:   '#fff', zIndex: 10,
        display:      'flex',
        justifyContent: 'space-between',
        alignItems:   'center',
      }}>
        <div>
          <p style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
            Market Watch
          </p>
          <p style={{ fontSize: 10, color: colors.textMuted, marginTop: 1 }}>
            {stocks.length} stocks · updates every 5s
          </p>
        </div>
        <div style={{
          display:    'flex', alignItems: 'center', gap: 4,
          padding:    '3px 8px', borderRadius: 10,
          background: colors.successLight,
          border:     `1px solid ${colors.successBorder}`,
        }}>
          <div style={{
            width: 6, height: 6, borderRadius: '50%',
            background: colors.success,
          }} />
          <span style={{ fontSize: 10, color: colors.success, fontWeight: 700 }}>
            LIVE
          </span>
        </div>
      </div>

      {/* Stock rows */}
      {stocks.map(s => {
        const liveData   = getData(s.symbol);
        const livePrice  = liveData?.price      ?? s.price;
        const liveChange = liveData?.change_pct ?? s.change_pct;
        const isSelected = selected === s.symbol;
        const isWatched  = watchedSymbols.includes(s.symbol);
        const isUp       = liveChange >= 0;

        return (
          <div
            key={s.symbol}
            onClick={() => onSelect(s.symbol)}
            style={{
              padding:      '12px 14px',
              borderBottom: `1px solid ${colors.border}`,
              cursor:       'pointer',
              background:   isSelected ? colors.primaryLight : '#fff',
              borderLeft:   `3px solid ${isSelected
                              ? colors.primary : 'transparent'}`,
            }}
            onMouseEnter={e => {
              if (!isSelected)
                e.currentTarget.style.background = colors.bgHover;
            }}
            onMouseLeave={e => {
              if (!isSelected)
                e.currentTarget.style.background = '#fff';
            }}
          >
            <div style={{
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'flex-start',
            }}>
              {/* Left */}
              <div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <p style={{
                    fontSize:  13, fontWeight: 700,
                    color:     isSelected ? colors.primary : colors.text,
                  }}>
                    {s.symbol.replace('.NS', '')}
                  </p>
                  <span style={{
                    fontSize:   9, fontWeight: 700,
                    padding:    '1px 5px', borderRadius: 4,
                    background: s.signal === 'BUY'  ? colors.successLight
                              : s.signal === 'HOLD' ? colors.warningLight
                              : colors.dangerLight,
                    color:      s.signal === 'BUY'  ? colors.success
                              : s.signal === 'HOLD' ? colors.warning
                              : colors.danger,
                  }}>
                    {s.signal}
                  </span>
                </div>
                <p style={{
                  fontSize: 10, color: colors.textMuted, marginTop: 2,
                }}>
                  AI: {s.confidence}%
                </p>
              </div>

              {/* Right: live price */}
              <div style={{ textAlign: 'right' }}>
                <p style={{
                  fontSize:   13, fontWeight: 700, color: colors.text,
                }}>
                  ₹{livePrice?.toLocaleString()}
                </p>
                <span style={{
                  fontSize:   10, fontWeight: 700,
                  padding:    '1px 5px', borderRadius: 4,
                  display:    'inline-block', marginTop: 2,
                  background: isUp ? colors.successLight : colors.dangerLight,
                  color:      isUp ? colors.success      : colors.danger,
                }}>
                  {isUp ? '▲' : '▼'} {Math.abs(liveChange).toFixed(2)}%
                </span>
              </div>
            </div>

            {/* Watchlist star */}
            <div style={{
              display: 'flex', justifyContent: 'flex-end', marginTop: 6,
            }}>
              <span
                onClick={e => { e.stopPropagation(); onAddWatchlist(s.symbol); }}
                style={{
                  fontSize: 14, cursor: 'pointer',
                  color:    isWatched ? '#f59e0b' : colors.textLight,
                }}
              >
                {isWatched ? '★' : '☆'}
              </span>
            </div>
          </div>
        );
      })}
    </div>
  );
};

export default StockList;