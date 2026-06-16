// CartPage.jsx
import React from 'react';
import { colors, card } from '../styles/theme';

const CartPage = ({ cart, onRemove, onCheckout, portfolio }) => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text,
                 marginBottom: 4 }}>
      Stock Cart
    </h2>
    <p style={{ color: colors.textMuted, marginBottom: 24, fontSize: 13 }}>
      Stocks you want to trade — review before placing orders
    </p>

    {cart.length === 0 ? (
      <div style={{
        ...card, textAlign: 'center', padding: 60,
      }}>
        <p style={{ fontSize: 40, marginBottom: 12 }}>⊕</p>
        <p style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>
          Your cart is empty
        </p>
        <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
          Click "Add to Cart" on any stock to add it here
        </p>
      </div>
    ) : (
      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 300px', gap: 16,
      }}>
        <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
          {cart.map((item, i) => (
            <div key={i} style={{
              ...card,
              display:        'flex',
              justifyContent: 'space-between',
              alignItems:     'center',
            }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: 14 }}>
                <div style={{
                  width:          44, height: 44, borderRadius: 10,
                  background:     colors.primaryLight,
                  display:        'flex', alignItems: 'center',
                  justifyContent: 'center',
                  fontSize:       16, fontWeight: 800, color: colors.primary,
                }}>
                  {item.symbol.replace('.NS','')[0]}
                </div>
                <div>
                  <p style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                    {item.symbol.replace('.NS','')}
                  </p>
                  <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                    Added to cart · NSE
                  </p>
                </div>
              </div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
                <p style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
                  ₹{item.price?.toLocaleString()}
                </p>
                <span style={{
                  fontSize: 11, fontWeight: 700, padding: '3px 10px',
                  borderRadius: 6,
                  background: item.signal === 'BUY'  ? '#f0fdf4'
                            : item.signal === 'HOLD' ? '#fffbeb' : '#fef2f2',
                  color:      item.signal === 'BUY'  ? colors.success
                            : item.signal === 'HOLD' ? colors.warning
                            : colors.danger,
                }}>
                  {item.signal}
                </span>
                <button
                  onClick={() => onRemove(item.symbol)}
                  style={{
                    padding:    '6px 12px', borderRadius: 6,
                    border:     `1px solid ${colors.border}`,
                    background: '#fff', color: colors.danger,
                    fontSize:   12, cursor: 'pointer',
                  }}
                >
                  Remove
                </button>
              </div>
            </div>
          ))}
        </div>

        {/* Order summary */}
        <div style={{ ...card, alignSelf: 'flex-start' }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: colors.text,
                      marginBottom: 16 }}>
            Order Summary
          </p>
          <div style={{
            padding: '12px', background: '#f9fafb', borderRadius: 8,
            marginBottom: 14,
          }}>
            <p style={{ fontSize: 12, color: colors.textMuted, marginBottom: 4 }}>
              Available Balance
            </p>
            <p style={{ fontSize: 20, fontWeight: 800, color: colors.success }}>
              ₹{portfolio?.balance?.toLocaleString()}
            </p>
          </div>
          <div style={{ marginBottom: 16 }}>
            {cart.map((item, i) => (
              <div key={i} style={{
                display: 'flex', justifyContent: 'space-between',
                padding: '6px 0', fontSize: 12,
                borderBottom: `1px solid ${colors.border}`,
              }}>
                <span style={{ color: colors.textMuted }}>
                  {item.symbol.replace('.NS','')}
                </span>
                <span style={{ fontWeight: 600, color: colors.text }}>
                  ₹{item.price?.toLocaleString()}
                </span>
              </div>
            ))}
          </div>
          <button
            onClick={onCheckout}
            style={{
              width: '100%', padding: '12px 0',
              background: colors.primary, border: 'none',
              borderRadius: 8, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Proceed to Trade
          </button>
          <p style={{ fontSize: 11, color: colors.textMuted,
                      textAlign: 'center', marginTop: 8 }}>
            Each stock will open its trade page
          </p>
        </div>
      </div>
    )}
  </div>
);

export default CartPage;