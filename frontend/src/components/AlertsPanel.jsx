// AlertsPanel.jsx — redesigned with better UI
import React, { useState } from 'react';
import { createAlert, deleteAlert } from '../services/api';
import { colors, shadow }  from '../styles/theme';

const AlertsPanel = ({ alerts, symbol, onRefresh }) => {
  const [targetPrice, setTargetPrice] = useState('');
  const [condition,   setCondition]   = useState('above');
  const [note,        setNote]        = useState('');
  const [loading,     setLoading]     = useState(false);
  const [message,     setMessage]     = useState(null);

  // Get live price from context
  const [livePrice, setLivePrice] = useState(null);

  React.useEffect(() => {
    import('../context/PriceContext').then(({ usePriceStore }) => {});
  }, []);

  const handleCreate = async () => {
    if (!targetPrice || isNaN(parseFloat(targetPrice))) {
      setMessage({ type: 'error', text: 'Please enter a valid price.' });
      return;
    }
    setLoading(true);
    try {
      await createAlert({
        symbol,
        target_price: parseFloat(targetPrice),
        condition,
        note,
      });
      setMessage({ type: 'success', text: `Alert set! You will be notified when ${symbol.replace('.NS','')} goes ${condition} ₹${targetPrice}` });
      setTargetPrice('');
      setNote('');
      onRefresh();
    } catch (e) {
      setMessage({ type: 'error', text: e.response?.data?.detail || 'Failed to create alert.' });
    } finally {
      setLoading(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  const handleDelete = async (id) => {
    try {
      await deleteAlert(id);
      onRefresh();
    } catch (e) { console.error(e); }
  };

  const activeAlerts    = alerts?.filter(a => !a.is_triggered) || [];
  const triggeredAlerts = alerts?.filter(a =>  a.is_triggered) || [];

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 20 }}>

      {/* Create alert form */}
      <div style={{
        background:   '#fff',
        borderRadius: 12,
        border:       `1px solid ${colors.border}`,
        padding:      '18px 20px',
        boxShadow:    shadow.sm,
      }}>
        <p style={{
          fontSize: 13, fontWeight: 700, color: colors.text,
          marginBottom: 16,
        }}>
          Set Price Alert — {symbol.replace('.NS', '')}
        </p>

        {/* Condition toggle */}
        <div style={{
          display:      'flex',
          background:   colors.bgSection,
          borderRadius: 8, padding: 3,
          marginBottom: 14,
          border:       `1px solid ${colors.border}`,
        }}>
          {['above', 'below'].map(c => (
            <button
              key={c}
              onClick={() => setCondition(c)}
              style={{
                flex:         1,
                padding:      '9px 0',
                borderRadius: 6,
                border:       'none',
                cursor:       'pointer',
                fontWeight:   700,
                fontSize:     13,
                transition:   'all 0.2s',
                background:   condition === c
                              ? (c === 'above' ? colors.success : colors.danger)
                              : 'transparent',
                color:        condition === c ? '#fff'
                              : (c === 'above' ? colors.success : colors.danger),
              }}
            >
              {c === 'above' ? '▲ Price Goes Above' : '▼ Price Goes Below'}
            </button>
          ))}
        </div>

        {/* Target price input */}
        <div style={{ marginBottom: 12 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 5,
          }}>
            TARGET PRICE (₹)
          </label>
          <div style={{ position: 'relative' }}>
            <span style={{
              position:   'absolute', left: 12, top: '50%',
              transform:  'translateY(-50%)',
              fontSize:   14, fontWeight: 700, color: colors.textMuted,
            }}>
              ₹
            </span>
            <input
              type="number"
              placeholder="Enter target price"
              value={targetPrice}
              onChange={e => setTargetPrice(e.target.value)}
              style={{
                width:        '100%',
                padding:      '10px 12px 10px 28px',
                border:       `1px solid ${colors.border}`,
                borderRadius: 8,
                fontSize:     16,
                fontWeight:   700,
                color:        colors.text,
                background:   colors.bgSection,
              }}
            />
          </div>
        </div>

        {/* Note input */}
        <div style={{ marginBottom: 14 }}>
          <label style={{
            fontSize: 11, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 5,
          }}>
            NOTE (OPTIONAL)
          </label>
          <input
            type="text"
            placeholder="e.g. Take profit target"
            value={note}
            onChange={e => setNote(e.target.value)}
            style={{
              width:        '100%',
              padding:      '9px 12px',
              border:       `1px solid ${colors.border}`,
              borderRadius: 8,
              fontSize:     13,
              color:        colors.text,
              background:   colors.bgSection,
            }}
          />
        </div>

        {/* Submit button */}
        <button
          onClick={handleCreate}
          disabled={loading || !targetPrice}
          style={{
            width:        '100%',
            padding:      '12px 0',
            background:   condition === 'above' ? colors.success : colors.danger,
            border:       'none',
            borderRadius: 8,
            color:        '#fff',
            fontSize:     14,
            fontWeight:   700,
            cursor:       loading || !targetPrice ? 'not-allowed' : 'pointer',
            opacity:      loading || !targetPrice ? 0.6 : 1,
            boxShadow:    `0 2px 8px ${condition === 'above'
                            ? 'rgba(5,122,85,0.25)'
                            : 'rgba(224,36,36,0.25)'}`,
          }}
        >
          {loading ? 'Setting alert...' : `Set ${condition === 'above' ? '▲' : '▼'} Alert at ₹${targetPrice || '---'}`}
        </button>

        {/* Message */}
        {message && (
          <div style={{
            marginTop:    10,
            padding:      '10px 14px',
            borderRadius: 8,
            fontSize:     12,
            lineHeight:   1.5,
            background:   message.type === 'success'
                          ? colors.successLight : colors.dangerLight,
            color:        message.type === 'success'
                          ? colors.success : colors.danger,
            border:       `1px solid ${message.type === 'success'
                            ? colors.successBorder : colors.dangerBorder}`,
          }}>
            {message.text}
          </div>
        )}
      </div>

      {/* Triggered alerts */}
      {triggeredAlerts.length > 0 && (
        <div>
          <div style={{
            display:      'flex',
            alignItems:   'center',
            gap:          8,
            marginBottom: 10,
          }}>
            <div style={{
              width: 8, height: 8, borderRadius: '50%',
              background: colors.danger,
            }} />
            <p style={{ fontSize: 12, fontWeight: 700, color: colors.danger }}>
              TRIGGERED ALERTS ({triggeredAlerts.length})
            </p>
          </div>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {triggeredAlerts.map((a, i) => (
              <div key={i} style={{
                padding:      '14px 16px',
                borderRadius: 10,
                background:   '#fef9c3',
                border:       '1px solid #fde68a',
                borderLeft:   '4px solid #f59e0b',
                display:      'flex',
                justifyContent: 'space-between',
                alignItems:   'center',
              }}>
                <div>
                  <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 4 }}>
                    <span style={{ fontSize: 16 }}>🔔</span>
                    <p style={{ fontSize: 14, fontWeight: 700, color: '#92400e' }}>
                      {a.symbol.replace('.NS','')} {a.condition === 'above' ? '▲' : '▼'} ₹{a.target_price}
                    </p>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: '1px 7px', borderRadius: 10,
                      background: '#f59e0b', color: '#fff',
                    }}>
                      TRIGGERED
                    </span>
                  </div>
                  <p style={{ fontSize: 12, color: '#92400e' }}>
                    Current: ₹{a.current_price}
                    {a.note && ` · ${a.note}`}
                    {a.triggered_at && ` · ${new Date(a.triggered_at).toLocaleString()}`}
                  </p>
                </div>
                <button
                  onClick={() => handleDelete(a.id)}
                  style={{
                    padding:    '5px 12px',
                    background: 'transparent',
                    border:     '1px solid #f59e0b',
                    borderRadius: 6,
                    color:      '#92400e',
                    fontSize:   11,
                    cursor:     'pointer',
                    fontWeight: 500,
                  }}
                >
                  Dismiss
                </button>
              </div>
            ))}
          </div>
        </div>
      )}

      {/* Active alerts */}
      <div>
        <p style={{
          fontSize: 12, fontWeight: 700, color: colors.textMuted,
          marginBottom: 10,
        }}>
          ACTIVE ALERTS ({activeAlerts.length})
        </p>

        {activeAlerts.length === 0 ? (
          <div style={{
            textAlign:    'center',
            padding:      '30px 0',
            color:        colors.textMuted,
            fontSize:     13,
            background:   colors.bgSection,
            borderRadius: 10,
            border:       `1px dashed ${colors.border}`,
          }}>
            No active alerts. Set one above.
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
            {activeAlerts.map((a, i) => {
              const isAbove   = a.condition === 'above';
              const distance  = a.distance_pct;
              const isClose   = Math.abs(distance) < 2;

              return (
                <div key={i} style={{
                  padding:      '14px 16px',
                  borderRadius: 10,
                  background:   '#fff',
                  border:       `1px solid ${isClose
                                  ? (isAbove ? colors.successBorder : colors.dangerBorder)
                                  : colors.border}`,
                  borderLeft:   `4px solid ${isAbove ? colors.success : colors.danger}`,
                  boxShadow:    isClose ? shadow.sm : 'none',
                  display:      'flex',
                  justifyContent: 'space-between',
                  alignItems:   'center',
                }}>
                  <div style={{ flex: 1 }}>
                    <div style={{
                      display:      'flex',
                      alignItems:   'center',
                      gap:          8,
                      marginBottom: 6,
                    }}>
                      <span style={{
                        fontSize:     13,
                        fontWeight:   700,
                        color:        isAbove ? colors.success : colors.danger,
                      }}>
                        {isAbove ? '▲' : '▼'}
                      </span>
                      <p style={{ fontSize: 14, fontWeight: 700, color: colors.text }}>
                        {a.symbol.replace('.NS','')}
                      </p>
                      <span style={{
                        fontSize:   11,
                        fontWeight: 600,
                        padding:    '2px 8px',
                        borderRadius: 10,
                        background: isAbove ? colors.successLight : colors.dangerLight,
                        color:      isAbove ? colors.success : colors.danger,
                        border:     `1px solid ${isAbove
                                      ? colors.successBorder : colors.dangerBorder}`,
                      }}>
                        {isAbove ? 'Above' : 'Below'} ₹{a.target_price}
                      </span>
                      {isClose && (
                        <span style={{
                          fontSize:   10,
                          fontWeight: 700,
                          padding:    '2px 8px',
                          borderRadius: 10,
                          background: '#fef9c3',
                          color:      '#92400e',
                          border:     '1px solid #fde68a',
                        }}>
                          Almost there!
                        </span>
                      )}
                    </div>

                    {/* Progress bar showing distance */}
                    <div style={{ marginBottom: 6 }}>
                      <div style={{
                        height:       4,
                        background:   colors.bgSection,
                        borderRadius: 2,
                        overflow:     'hidden',
                      }}>
                        <div style={{
                          height:       '100%',
                          width:        `${Math.min(100, Math.max(0, 100 - Math.abs(distance) * 5))}%`,
                          background:   isAbove ? colors.success : colors.danger,
                          borderRadius: 2,
                          transition:   'width 0.5s',
                        }} />
                      </div>
                    </div>

                    <p style={{ fontSize: 11, color: colors.textMuted }}>
                      Current: ₹{a.current_price}
                      · Distance: {distance > 0 ? '+' : ''}{distance}%
                      {a.note && ` · ${a.note}`}
                    </p>
                  </div>

                  <button
                    onClick={() => handleDelete(a.id)}
                    style={{
                      marginLeft:   12,
                      padding:      '5px 12px',
                      background:   'transparent',
                      border:       `1px solid ${colors.border}`,
                      borderRadius: 6,
                      color:        colors.danger,
                      fontSize:     11,
                      cursor:       'pointer',
                    }}
                  >
                    Delete
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
};

export default AlertsPanel;