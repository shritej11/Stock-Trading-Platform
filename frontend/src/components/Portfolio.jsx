// Portfolio.jsx
// Shows holdings, P&L and trade history

import React from 'react';

const Portfolio = ({ data }) => {
  if (!data) return (
    <div style={{ color: '#64748b', padding: 20 }}>Loading portfolio...</div>
  );

  const { balance, portfolio, total_pnl, total_invested, total_current, trades } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Wallet summary */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: '1fr 1fr 1fr',
        gap: 10,
      }}>
        {[
          { label: 'Cash Balance',    value: `Rs.${balance?.toLocaleString()}`,                          color: '#22c55e' },
          { label: 'Invested',        value: `Rs.${total_invested?.toLocaleString()}`,                   color: '#60a5fa' },
          { label: 'Total P&L',       value: `${total_pnl >= 0 ? '+' : ''}Rs.${total_pnl?.toFixed(2)}`, color: total_pnl >= 0 ? '#22c55e' : '#ef4444' },
        ].map((item, i) => (
          <div key={i} style={{
            background: '#0f1117',
            borderRadius: 8,
            padding: '10px 12px',
            textAlign: 'center',
          }}>
            <p style={{ fontSize: 10, color: '#64748b', marginBottom: 4 }}>{item.label}</p>
            <p style={{ fontSize: 13, fontWeight: 700, color: item.color }}>{item.value}</p>
          </div>
        ))}
      </div>

      {/* Holdings */}
      {portfolio.length === 0 ? (
        <div style={{
          textAlign: 'center',
          padding: '20px',
          color: '#475569',
          fontSize: 13,
          background: '#0f1117',
          borderRadius: 8,
        }}>
          No holdings yet. Place a BUY order to get started.
        </div>
      ) : (
        <div>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>HOLDINGS</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 6 }}>
            {portfolio.map((h, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '10px 12px',
                background: '#0f1117',
                borderRadius: 8,
                borderLeft: `3px solid ${h.pnl >= 0 ? '#22c55e' : '#ef4444'}`,
              }}>
                <div>
                  <p style={{ fontSize: 13, fontWeight: 600, color: '#e2e8f0' }}>
                    {h.symbol.replace('.NS', '')}
                  </p>
                  <p style={{ fontSize: 11, color: '#64748b', marginTop: 2 }}>
                    {h.quantity} shares · Avg Rs.{h.avg_buy_price}
                  </p>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <p style={{ fontSize: 13, color: '#e2e8f0', fontWeight: 600 }}>
                    Rs.{h.current_value.toLocaleString()}
                  </p>
                  <p style={{
                    fontSize: 11,
                    color: h.pnl >= 0 ? '#22c55e' : '#ef4444',
                    marginTop: 2,
                  }}>
                    {h.pnl >= 0 ? '+' : ''}Rs.{h.pnl.toFixed(2)} ({h.pnl_pct.toFixed(2)}%)
                  </p>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Recent trades */}
      {trades.length > 0 && (
        <div>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 8 }}>RECENT TRADES</p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 5 }}>
            {trades.slice(0, 5).map((t, i) => (
              <div key={i} style={{
                display: 'flex',
                justifyContent: 'space-between',
                alignItems: 'center',
                padding: '8px 12px',
                background: '#0f1117',
                borderRadius: 6,
                fontSize: 12,
              }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
                  <span style={{
                    background: t.action === 'BUY' ? '#14532d' : '#7f1d1d',
                    color:      t.action === 'BUY' ? '#22c55e' : '#ef4444',
                    padding: '2px 8px',
                    borderRadius: 10,
                    fontSize: 10,
                    fontWeight: 700,
                  }}>
                    {t.action}
                  </span>
                  <span style={{ color: '#e2e8f0' }}>
                    {t.symbol.replace('.NS', '')} × {t.quantity}
                  </span>
                </div>
                <div style={{ textAlign: 'right' }}>
                  <span style={{ color: '#94a3b8' }}>Rs.{t.total.toLocaleString()}</span>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
};

export default Portfolio;