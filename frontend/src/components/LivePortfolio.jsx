// LivePortfolio.jsx
import React, { useState, useEffect, useRef } from 'react';
import { fetchLivePnl } from '../services/api';
import { colors, shadow } from '../styles/theme';

const PnlBadge = ({ value, pct }) => {
  const isPos = value >= 0;
  return (
    <div style={{
      display:    'inline-flex',
      alignItems: 'center',
      gap:        6,
      padding:    '4px 10px',
      borderRadius: 6,
      background: isPos ? '#f0fdf4' : '#fef2f2',
      border:     `1px solid ${isPos ? '#bbf7d0' : '#fecaca'}`,
    }}>
      <span style={{
        fontSize:   13, fontWeight: 800,
        color:      isPos ? colors.success : colors.danger,
      }}>
        {isPos ? '▲' : '▼'} ₹{Math.abs(value).toLocaleString()}
      </span>
      <span style={{
        fontSize: 11, fontWeight: 600,
        color:    isPos ? colors.success : colors.danger,
      }}>
        ({isPos ? '+' : ''}{pct}%)
      </span>
    </div>
  );
};

const LivePortfolio = () => {
  const [data,     setData]     = useState(null);
  const [loading,  setLoading]  = useState(true);
  const [flashing, setFlashing] = useState({});
  const prevData = useRef({});

  useEffect(() => {
    const load = () => {
      fetchLivePnl()
        .then(r => {
          const newData = r.data;

          // Flash positions that changed P&L
          const flashes = {};
          newData.positions?.forEach(p => {
            const prev = prevData.current[p.symbol];
            if (prev !== undefined && prev !== p.pnl) {
              flashes[p.symbol] = p.pnl > prev ? 'up' : 'down';
            }
            prevData.current[p.symbol] = p.pnl;
          });

          setFlashing(flashes);
          setData(newData);
          setLoading(false);
          setTimeout(() => setFlashing({}), 800);
        })
        .catch(console.error);
    };

    load();
    const interval = setInterval(load, 3000);
    return () => clearInterval(interval);
  }, []);

  if (loading) return (
    <div style={{ padding: 40, textAlign: 'center', color: colors.textMuted }}>
      Loading live portfolio...
    </div>
  );

  if (!data) return null;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Portfolio summary */}
      <div style={{
        background:   '#fff',
        borderRadius: 12,
        border:       `1px solid ${colors.border}`,
        padding:      20,
        boxShadow:    shadow.sm,
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'flex-start',
          marginBottom:   16,
        }}>
          <div>
            <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
              TOTAL PORTFOLIO VALUE
            </p>
            <p style={{ fontSize: 28, fontWeight: 800, color: colors.text }}>
              ₹{data.portfolio_value?.toLocaleString()}
            </p>
            <div style={{ marginTop: 6 }}>
              <PnlBadge
                value={data.overall_pnl}
                pct={data.overall_pnl_pct}
              />
              <span style={{
                fontSize: 11, color: colors.textMuted, marginLeft: 8,
              }}>
                vs starting ₹1,00,000
              </span>
            </div>
          </div>

          {/* Live indicator */}
          <div style={{
            display:    'flex', alignItems: 'center', gap: 6,
            padding:    '6px 12px', borderRadius: 20,
            background: '#f0fdf4',
            border:     '1px solid #bbf7d0',
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: colors.success,
            }} />
            <span style={{ fontSize: 11, color: colors.success, fontWeight: 700 }}>
              LIVE P&L
            </span>
          </div>
        </div>

        {/* Summary grid */}
        <div style={{
          display: 'grid', gridTemplateColumns: 'repeat(4,1fr)', gap: 12,
        }}>
          {[
            { label: 'Cash Balance',
              value: `₹${data.balance?.toLocaleString()}`,
              color: colors.primary },
            { label: 'Invested',
              value: `₹${data.total_invested?.toLocaleString()}`,
              color: colors.text },
            { label: 'Current Value',
              value: `₹${data.total_current?.toLocaleString()}`,
              color: colors.text },
            { label: 'Unrealised P&L',
              value: `${data.total_pnl >= 0 ? '+' : ''}₹${data.total_pnl}`,
              color: data.total_pnl >= 0 ? colors.success : colors.danger },
          ].map((item, i) => (
            <div key={i} style={{
              padding:    '10px 12px', borderRadius: 8,
              background: '#f9fafb',
              border:     `1px solid ${colors.border}`,
            }}>
              <p style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 14, fontWeight: 700, color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </div>

      {/* Positions */}
      <div style={{
        background:   '#fff',
        borderRadius: 12,
        border:       `1px solid ${colors.border}`,
        padding:      20,
        boxShadow:    shadow.sm,
      }}>
        <p style={{
          fontSize: 12, fontWeight: 700, color: colors.textMuted,
          textTransform: 'uppercase', letterSpacing: '0.06em', marginBottom: 14,
        }}>
          Open Positions
        </p>

        {data.positions.length === 0 ? (
          <div style={{
            textAlign: 'center', padding: '30px 0',
            color: colors.textMuted, fontSize: 13,
          }}>
            No open positions. Buy a stock to get started.
          </div>
        ) : (
          <div>
            {/* Table header */}
            <div style={{
              display:             'grid',
              gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
              padding:             '8px 12px',
              background:          '#f9fafb',
              borderRadius:        8,
              marginBottom:        8,
            }}>
              {['Stock', 'Qty', 'Avg Buy', 'Live Price', 'Current Value', 'P&L'].map((h, i) => (
                <p key={i} style={{
                  fontSize: 11, fontWeight: 700,
                  color: colors.textMuted, textTransform: 'uppercase',
                }}>
                  {h}
                </p>
              ))}
            </div>

            {/* Position rows */}
            {data.positions.map((p, i) => {
              const flash = flashing[p.symbol];
              return (
                <div key={i} style={{
                  display:             'grid',
                  gridTemplateColumns: '1fr 1fr 1fr 1fr 1fr 1fr',
                  padding:             '12px',
                  borderBottom:        `1px solid ${colors.border}`,
                  borderRadius:        8,
                  transition:          'background 0.4s',
                  background:          flash === 'up'   ? '#f0fdf4'
                                     : flash === 'down' ? '#fef2f2' : '#fff',
                  alignItems:          'center',
                }}>
                  {/* Stock name */}
                  <div>
                    <p style={{ fontSize: 13, fontWeight: 700, color: colors.text }}>
                      {p.name}
                    </p>
                    <p style={{ fontSize: 10, color: colors.textMuted }}>
                      Day: {p.day_change_pct >= 0 ? '+' : ''}{p.day_change_pct}%
                    </p>
                  </div>

                  {/* Quantity */}
                  <p style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>
                    {p.quantity}
                  </p>

                  {/* Avg buy */}
                  <p style={{ fontSize: 13, color: colors.textMuted }}>
                    ₹{p.avg_buy_price}
                  </p>

                  {/* Live price — flashes on change */}
                  <p style={{
                    fontSize:   13, fontWeight: 700,
                    color:      flash === 'up'   ? colors.success
                              : flash === 'down' ? colors.danger : colors.text,
                    transition: 'color 0.4s',
                  }}>
                    ₹{p.current_price?.toLocaleString()}
                  </p>

                  {/* Current value */}
                  <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                    ₹{p.current_value?.toLocaleString()}
                  </p>

                  {/* P&L */}
                  <div>
                    <p style={{
                      fontSize:   13, fontWeight: 800,
                      color:      p.is_profit ? colors.success : colors.danger,
                    }}>
                      {p.is_profit ? '+' : ''}₹{p.pnl}
                    </p>
                    <p style={{
                      fontSize: 11,
                      color:    p.is_profit ? colors.success : colors.danger,
                    }}>
                      ({p.is_profit ? '+' : ''}{p.pnl_pct}%)
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default LivePortfolio;