// LivePriceBar.jsx — reads from global price context
import React from 'react';
import { usePriceStore } from '../context/PriceContext';
import { colors }        from '../styles/theme';

const LivePriceBar = () => {
  const { prices, connected } = usePriceStore();
  const priceList = Object.values(prices);

  if (priceList.length === 0) return null;

  return (
    <div style={{
      display:     'flex',
      background:  '#fff',
      borderBottom:`1px solid ${colors.border}`,
      overflowX:   'auto',
    }}>
      {priceList.map(p => {
        const isUp = p.change_pct >= 0;
        return (
          <div key={p.symbol} style={{
            padding:     '7px 18px',
            borderRight: `1px solid ${colors.border}`,
            display:     'flex',
            alignItems:  'center',
            gap:         12,
            minWidth:    190,
            flexShrink:  0,
          }}>
            <div>
              <p style={{ fontSize: 12, fontWeight: 700, color: colors.text }}>
                {p.symbol.replace('.NS', '')}
              </p>
              <p style={{ fontSize: 10, color: colors.textMuted }}>
                O:{p.open?.toFixed(0)}
                · H:{p.high?.toFixed(0)}
                · L:{p.low?.toFixed(0)}
              </p>
            </div>
            <div style={{ textAlign: 'right' }}>
              <p style={{
                fontSize: 13, fontWeight: 800, color: colors.text,
              }}>
                ₹{p.price?.toLocaleString()}
              </p>
              <span style={{
                fontSize:   10, fontWeight: 700,
                padding:    '1px 5px', borderRadius: 4,
                background: isUp ? colors.successLight : colors.dangerLight,
                color:      isUp ? colors.success      : colors.danger,
              }}>
                {isUp ? '▲' : '▼'} {Math.abs(p.change_pct).toFixed(2)}%
              </span>
            </div>
          </div>
        );
      })}

      {/* Live dot */}
      <div style={{
        marginLeft:  'auto',
        display:     'flex', alignItems: 'center', gap: 6,
        padding:     '0 16px', flexShrink: 0,
      }}>
        <div style={{
          width: 7, height: 7, borderRadius: '50%',
          background: connected ? colors.success : colors.danger,
        }} />
        <span style={{
          fontSize:  10, fontWeight: 700,
          color:     connected ? colors.success : colors.danger,
        }}>
          {connected ? 'LIVE' : 'RECONNECTING'}
        </span>
      </div>
    </div>
  );
};

export default LivePriceBar;