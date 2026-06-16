// TradingPanel.jsx — syncs with live price every 5 seconds
import React, { useState, useEffect } from 'react';
import { placeOrder }    from '../services/api';
import { useLivePrice }  from '../context/PriceContext';
import { colors, inputStyle } from '../styles/theme';

const TradingPanel = ({ symbol, balance, onOrderPlaced }) => {
  const [action,   setAction]   = useState('BUY');
  const [quantity, setQuantity] = useState(1);
  const [loading,  setLoading]  = useState(false);
  const [message,  setMessage]  = useState(null);
  const [priceFlash, setPriceFlash] = useState(null);
  const prevPrice = React.useRef(null);

  // Get live price from global context
  const liveData     = useLivePrice(symbol);
  const currentPrice = liveData?.price || 0;
  const changePct    = liveData?.change_pct || 0;
  const isUp         = changePct >= 0;

  // Flash when price changes
  useEffect(() => {
    if (prevPrice.current !== null && prevPrice.current !== currentPrice) {
      setPriceFlash(currentPrice > prevPrice.current ? 'up' : 'down');
      setTimeout(() => setPriceFlash(null), 600);
    }
    prevPrice.current = currentPrice;
  }, [currentPrice]);

  const total = ((currentPrice || 0) * (quantity || 0)).toFixed(2);

  const handleOrder = async () => {
    if (!quantity || quantity <= 0) {
      setMessage({ type: 'error', text: 'Quantity must be at least 1' });
      return;
    }
    setLoading(true);
    setMessage(null);
    try {
      await placeOrder({
        symbol,
        action,
        quantity: parseInt(quantity),
      });
      setMessage({
        type: 'success',
        text: `${action} order placed! ${quantity} × ${symbol.replace('.NS','')} @ ₹${currentPrice}`,
      });
      if (onOrderPlaced) onOrderPlaced();
    } catch (e) {
      setMessage({
        type: 'error',
        text: e.response?.data?.detail || 'Order failed.',
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <div>

      {/* Live price display */}
      <div style={{
        padding:      '14px 16px',
        borderRadius: 10,
        background:   priceFlash === 'up'   ? colors.successLight
                    : priceFlash === 'down' ? colors.dangerLight
                    : colors.bgSection,
        border:       `1px solid ${colors.border}`,
        marginBottom: 16,
        transition:   'background 0.4s',
      }}>
        <div style={{
          display:        'flex',
          justifyContent: 'space-between',
          alignItems:     'center',
        }}>
          <div>
            <p style={{ fontSize: 11, color: colors.textMuted, marginBottom: 3 }}>
              {symbol.replace('.NS','')} · LIVE PRICE
            </p>
            <p style={{
              fontSize:   22, fontWeight: 800,
              color:      priceFlash === 'up'   ? colors.success
                        : priceFlash === 'down' ? colors.danger
                        : colors.text,
              transition: 'color 0.4s',
            }}>
              ₹{currentPrice?.toLocaleString()}
            </p>
          </div>
          <div style={{ textAlign: 'right' }}>
            <div style={{
              display:    'flex', alignItems: 'center',
              gap:        4, justifyContent: 'flex-end',
            }}>
              <div style={{
                width: 6, height: 6, borderRadius: '50%',
                background: colors.success,
                animation: 'pulse 1.5s infinite',
              }} />
              <style>{`
                @keyframes pulse {
                  0%,100%{opacity:1;transform:scale(1)}
                  50%{opacity:.5;transform:scale(1.4)}
                }
              `}</style>
              <span style={{
                fontSize: 10, color: colors.success, fontWeight: 700,
              }}>
                LIVE
              </span>
            </div>
            <p style={{
              fontSize:   13, fontWeight: 700, marginTop: 4,
              color:      isUp ? colors.success : colors.danger,
            }}>
              {isUp ? '▲' : '▼'} {Math.abs(changePct).toFixed(2)}%
            </p>
            <p style={{ fontSize: 10, color: colors.textMuted, marginTop: 2 }}>
              H: ₹{liveData?.high?.toFixed(0)}
              · L: ₹{liveData?.low?.toFixed(0)}
            </p>
          </div>
        </div>
      </div>

      {/* BUY / SELL toggle */}
      <div style={{
        display:      'flex',
        background:   colors.bgSection,
        borderRadius: 8,
        padding:      3,
        marginBottom: 16,
        border:       `1px solid ${colors.border}`,
      }}>
        {['BUY', 'SELL'].map(a => (
          <button key={a} onClick={() => setAction(a)} style={{
            flex:         1,
            padding:      '9px 0',
            borderRadius: 6,
            border:       'none',
            cursor:       'pointer',
            fontWeight:   700,
            fontSize:     13,
            transition:   'all 0.2s',
            background:   action === a
              ? (a === 'BUY' ? colors.success : colors.danger)
              : 'transparent',
            color: action === a ? '#fff'
              : (a === 'BUY' ? colors.success : colors.danger),
          }}>
            {a}
          </button>
        ))}
      </div>

      {/* Quantity */}
      <div style={{ marginBottom: 12 }}>
        <label style={{
          fontSize: 11, fontWeight: 600, color: colors.textMuted,
          display: 'block', marginBottom: 5,
        }}>
          QUANTITY
        </label>
        <div style={{ display: 'flex', gap: 8, alignItems: 'center' }}>
          <button
            onClick={() => setQuantity(q => Math.max(1, parseInt(q||1) - 1))}
            style={{
              width: 34, height: 36,
              background: colors.bgSection,
              border: `1px solid ${colors.border}`,
              borderRadius: 8, color: colors.text,
              fontSize: 18, cursor: 'pointer', fontWeight: 600,
            }}
          >−</button>
          <input
            type="number" min="1" value={quantity}
            onChange={e => setQuantity(e.target.value)}
            style={{
              ...inputStyle, flex: 1, textAlign: 'center',
              fontSize: 16, fontWeight: 700,
            }}
          />
          <button
            onClick={() => setQuantity(q => parseInt(q||0) + 1)}
            style={{
              width: 34, height: 36,
              background: colors.bgSection,
              border: `1px solid ${colors.border}`,
              borderRadius: 8, color: colors.text,
              fontSize: 18, cursor: 'pointer', fontWeight: 600,
            }}
          >+</button>
        </div>
      </div>

      {/* Order summary */}
      <div style={{
        background:   colors.bgSection,
        borderRadius: 8,
        border:       `1px solid ${colors.border}`,
        padding:      '12px 14px',
        marginBottom: 14,
      }}>
        {[
          { label: 'Price per share', value: `₹${currentPrice}` },
          { label: 'Quantity',        value: quantity },
          { label: 'Total value',
            value: `₹${Number(total).toLocaleString()}`,
            bold: true },
        ].map((row, i) => (
          <div key={i} style={{
            display:        'flex',
            justifyContent: 'space-between',
            padding:        '5px 0',
            borderBottom:   i < 2 ? `1px solid ${colors.border}` : 'none',
            fontSize:       13,
          }}>
            <span style={{ color: colors.textMuted }}>{row.label}</span>
            <span style={{
              color:      colors.text,
              fontWeight: row.bold ? 800 : 500,
            }}>
              {row.value}
            </span>
          </div>
        ))}
      </div>

      {/* Balance */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        fontSize:       12, marginBottom: 14,
      }}>
        <span style={{ color: colors.textMuted }}>Available balance</span>
        <span style={{ color: colors.success, fontWeight: 700 }}>
          ₹{balance?.toLocaleString()}
        </span>
      </div>

      {/* Place order button */}
      <button
        onClick={handleOrder}
        disabled={loading || !currentPrice}
        style={{
          width:        '100%',
          padding:      '13px 0',
          borderRadius: 8,
          border:       'none',
          cursor:       loading ? 'not-allowed' : 'pointer',
          fontWeight:   700,
          fontSize:     14,
          background:   action === 'BUY' ? colors.success : colors.danger,
          color:        '#fff',
          opacity:      loading || !currentPrice ? 0.6 : 1,
          boxShadow:    `0 2px 8px ${action === 'BUY'
                          ? 'rgba(5,122,85,0.3)'
                          : 'rgba(224,36,36,0.3)'}`,
        }}
      >
        {loading
          ? 'Placing order...'
          : `${action} ${symbol.replace('.NS','')} @ ₹${currentPrice}`}
      </button>

      {/* Message */}
      {message && (
        <div style={{
          marginTop:    12,
          padding:      '10px 14px',
          borderRadius: 8,
          fontSize:     12,
          lineHeight:   1.5,
          background:   message.type === 'success'
                        ? colors.successLight : colors.dangerLight,
          color:        message.type === 'success'
                        ? colors.success      : colors.danger,
          border:       `1px solid ${message.type === 'success'
                          ? colors.successBorder : colors.dangerBorder}`,
        }}>
          {message.text}
        </div>
      )}
    </div>
  );
};

export default TradingPanel;