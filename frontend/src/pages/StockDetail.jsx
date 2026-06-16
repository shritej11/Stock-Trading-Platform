// StockDetail.jsx
import React, { useState, useEffect } from 'react';
import CandlestickChart    from '../components/CandlestickChart';
import PredictionChart     from '../components/PredictionChart';
import TechnicalIndicators from '../components/TechnicalIndicators';
import SentimentPanel      from '../components/SentimentPanel';
import BiasAlert           from '../components/BiasAlert';
import TradingPanel        from '../components/TradingPanel';
import AlertsPanel         from '../components/AlertsPanel';
import ConfidenceMeter     from '../components/ConfidenceMeter';
import { colors, shadow, card } from '../styles/theme';
import {
  fetchPredict, fetchSentiment, fetchHistory,
  fetchCandles, fetchIndicators, fetchNews,
  fetchAlerts, fetchPortfolio,
} from '../services/api';

const TAB = ({ label, active, onClick }) => (
  <button onClick={onClick} style={{
    padding:    '8px 18px',
    borderBottom: active
                  ? `2px solid ${colors.primary}`
                  : '2px solid transparent',
    border:     'none',
    background: 'transparent',
    cursor:     'pointer',
    fontSize:   13,
    fontWeight: active ? 600 : 400,
    color:      active ? colors.primary : colors.textMuted,
    transition: 'all 0.15s',
    whiteSpace: 'nowrap',
  }}>
    {label}
  </button>
);

const InfoRow = ({ label, value, valueColor }) => (
  <div style={{
    display:        'flex',
    justifyContent: 'space-between',
    alignItems:     'center',
    padding:        '8px 0',
    borderBottom:   `1px solid ${colors.border}`,
    fontSize:       13,
  }}>
    <span style={{ color: colors.textMuted }}>{label}</span>
    <span style={{ fontWeight: 600, color: valueColor || colors.text }}>
      {value}
    </span>
  </div>
);

const StockDetail = ({ symbol, onBack, cart, onAddCart, portfolio,
                       onOrderPlaced, alerts, onRefreshAlerts }) => {
  const [tab,       setTab]       = useState('overview');
  const [predict,   setPredict]   = useState(null);
  const [sentiment, setSentiment] = useState(null);
  const [history,   setHistory]   = useState([]);
  const [candles,   setCandles]   = useState([]);
  const [indicators,setIndicators]= useState(null);
  const [news,      setNews]      = useState(null);
  const [loading,   setLoading]   = useState(true);

  const name = symbol.replace('.NS', '');
  const inCart = cart?.some(c => c.symbol === symbol);

  useEffect(() => {
    setLoading(true);
    Promise.all([
      fetchPredict(symbol),
      fetchSentiment(symbol),
      fetchHistory(symbol),
      fetchCandles(symbol),
      fetchIndicators(symbol),
      fetchNews(symbol),
    ])
      .then(([predR, sentR, histR, candR, indR, newsR]) => {
        setPredict(predR.data);
        setSentiment(sentR.data);
        setHistory(histR.data.history);
        setCandles(candR.data.candles);
        setIndicators(indR.data);
        setNews(newsR.data);
      })
      .catch(console.error)
      .finally(() => setLoading(false));
  }, [symbol]);

  const TABS = [
    'overview', 'chart', 'indicators',
    'ai insights', 'news', 'trade', 'alerts'
  ];

  return (
    <div style={{ minHeight: '100vh', background: colors.bg }}>

      {/* Stock header bar */}
      <div style={{
        background:    '#fff',
        borderBottom:  `1px solid ${colors.border}`,
        padding:       '0 24px',
        boxShadow:     shadow.sm,
      }}>

        {/* Top row */}
        <div style={{
          display:        'flex',
          alignItems:     'center',
          justifyContent: 'space-between',
          padding:        '16px 0 12px',
        }}>
          {/* Back + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <button onClick={onBack} style={{
              display:     'flex', alignItems: 'center', gap: 6,
              padding:     '6px 12px', borderRadius: 8,
              border:      `1px solid ${colors.border}`,
              background:  '#fff', cursor: 'pointer',
              fontSize:    13, color: colors.textMuted,
            }}>
              ← Back
            </button>
            <div>
              <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                <div style={{
                  width:          38, height: 38, borderRadius: 10,
                  background:     colors.primaryLight,
                  display:        'flex', alignItems: 'center',
                  justifyContent: 'center',
                  fontSize:       14, fontWeight: 800, color: colors.primary,
                }}>
                  {name[0]}
                </div>
                <div>
                  <h2 style={{ fontSize: 18, fontWeight: 700, color: colors.text }}>
                    {name}
                  </h2>
                  <p style={{ fontSize: 11, color: colors.textMuted }}>
                    NSE · {symbol}
                  </p>
                </div>
              </div>
            </div>

            {/* Price block */}
            {predict && (
              <div style={{ marginLeft: 16 }}>
                <p style={{ fontSize: 24, fontWeight: 800, color: colors.text }}>
                  ₹{predict.current_price?.toLocaleString()}
                </p>
                <p style={{
                  fontSize: 13, fontWeight: 600,
                  color: predict.change_pct >= 0
                         ? colors.success : colors.danger,
                }}>
                  {predict.change_pct >= 0 ? '▲' : '▼'} {Math.abs(predict.change_pct)}%
                  today
                </p>
              </div>
            )}
          </div>

          {/* Right: signal + cart */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            {predict && (
              <div style={{
                padding:    '8px 16px', borderRadius: 8,
                background: predict.signal === 'BUY'  ? '#f0fdf4'
                          : predict.signal === 'HOLD' ? '#fffbeb' : '#fef2f2',
                border:     `1px solid ${
                              predict.signal === 'BUY'  ? '#bbf7d0'
                            : predict.signal === 'HOLD' ? '#fde68a' : '#fecaca'
                            }`,
              }}>
                <p style={{ fontSize: 11, color: colors.textMuted }}>
                  AI Signal
                </p>
                <p style={{
                  fontSize:  16, fontWeight: 800,
                  color:     predict.signal === 'BUY'  ? colors.success
                           : predict.signal === 'HOLD' ? colors.warning
                           : colors.danger,
                }}>
                  {predict.signal}
                </p>
              </div>
            )}

            <button
              onClick={() => onAddCart(symbol)}
              style={{
                padding:    '8px 16px', borderRadius: 8,
                border:     `1px solid ${inCart ? colors.primary : colors.border}`,
                background: inCart ? colors.primaryLight : '#fff',
                color:      inCart ? colors.primary : colors.textMuted,
                cursor:     'pointer', fontSize: 13, fontWeight: 600,
              }}
            >
              {inCart ? '✓ In Cart' : '+ Add to Cart'}
            </button>

            <button
              onClick={() => setTab('trade')}
              style={{
                padding:    '8px 20px', borderRadius: 8,
                border:     'none', background: colors.primary,
                color:      '#fff', cursor: 'pointer',
                fontSize:   13, fontWeight: 700,
              }}
            >
              Trade Now
            </button>
          </div>
        </div>

        {/* Tabs */}
        <div style={{
          display:    'flex', gap: 0, overflowX: 'auto',
          borderTop:  `1px solid ${colors.border}`,
        }}>
          {TABS.map(t => (
            <TAB key={t} label={t.charAt(0).toUpperCase() + t.slice(1)}
                 active={tab === t} onClick={() => setTab(t)} />
          ))}
        </div>
      </div>

      {/* Content */}
      <div style={{ padding: '24px', maxWidth: 1100, margin: '0 auto' }}>
        {loading ? (
          <div style={{ textAlign: 'center', padding: 80, color: colors.textMuted }}>
            Loading {name} data...
          </div>
        ) : (
          <>
            {/* OVERVIEW TAB */}
            {tab === 'overview' && (
              <div style={{
                display: 'grid',
                gridTemplateColumns: '1fr 300px', gap: 16,
              }}>
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Mini chart */}
                  <div style={{ ...card }}>
                    <p style={{ fontSize: 13, fontWeight: 600,
                                color: colors.textMuted, marginBottom: 12,
                                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      Price Chart (60 days)
                    </p>
                    <CandlestickChart candles={candles} />
                  </div>

                  {/* Indicators summary */}
                  {indicators && (
                    <div style={{ ...card }}>
                      <p style={{ fontSize: 13, fontWeight: 600,
                                  color: colors.textMuted, marginBottom: 12,
                                  textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                        Technical Summary
                      </p>
                      <div style={{
                        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 10,
                      }}>
                        {[
                          { label: 'RSI (14)',
                            value: indicators.summary.rsi,
                            signal: indicators.summary.rsi_signal,
                            color:  indicators.summary.rsi_color },
                          { label: 'MACD',
                            value: indicators.summary.macd.toFixed(2),
                            signal: indicators.summary.macd_signal,
                            color:  indicators.summary.macd_color },
                          { label: 'MA Signal',
                            value: `MA50: ₹${indicators.summary.ma50}`,
                            signal: indicators.summary.ma_signal,
                            color:  indicators.summary.ma_color },
                        ].map((item, i) => (
                          <div key={i} style={{
                            padding: '12px', borderRadius: 8,
                            background: '#f9fafb',
                            border: `1px solid ${colors.border}`,
                          }}>
                            <p style={{ fontSize: 11, color: colors.textMuted,
                                        marginBottom: 4 }}>
                              {item.label}
                            </p>
                            <p style={{ fontSize: 16, fontWeight: 700,
                                        color: colors.text, marginBottom: 6 }}>
                              {item.value}
                            </p>
                            <span style={{
                              fontSize: 11, fontWeight: 600,
                              padding: '2px 8px', borderRadius: 6,
                              background: item.color === 'green' ? '#f0fdf4'
                                        : item.color === 'red'   ? '#fef2f2'
                                        : '#fffbeb',
                              color:      item.color === 'green' ? colors.success
                                        : item.color === 'red'   ? colors.danger
                                        : colors.warning,
                            }}>
                              {item.signal}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  )}
                </div>

                {/* Right column */}
                <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

                  {/* Confidence */}
                  <div style={{ ...card, textAlign: 'center' }}>
                    <p style={{ fontSize: 13, fontWeight: 600,
                                color: colors.textMuted, marginBottom: 12,
                                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      AI Confidence
                    </p>
                    <ConfidenceMeter
                      score={predict?.confidence}
                      signal={predict?.signal}
                    />
                    <div style={{ marginTop: 12 }}>
                      {[
                        { label: 'Current Price',
                          value: `₹${predict?.current_price}`,
                          color: colors.text },
                        { label: 'Predicted',
                          value: `₹${predict?.predicted_price}`,
                          color: colors.warning },
                        { label: 'Expected Move',
                          value: `${predict?.change_pct >= 0 ? '+' : ''}${predict?.change_pct}%`,
                          color: predict?.change_pct >= 0
                                 ? colors.success : colors.danger },
                      ].map((r, i) => (
                        <InfoRow key={i} label={r.label}
                                 value={r.value} valueColor={r.color} />
                      ))}
                    </div>
                  </div>

                  {/* Sentiment */}
                  <div style={{ ...card }}>
                    <p style={{ fontSize: 13, fontWeight: 600,
                                color: colors.textMuted, marginBottom: 12,
                                textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                      News Sentiment
                    </p>
                    <SentimentPanel data={sentiment} />
                  </div>
                </div>
              </div>
            )}

            {/* CHART TAB */}
            {tab === 'chart' && (
              <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>
                <div style={{ ...card }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textMuted, marginBottom: 14,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Candlestick Chart
                  </p>
                  <CandlestickChart candles={candles} />
                </div>
                <div style={{ ...card }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textMuted, marginBottom: 14,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Price Prediction Overlay
                  </p>
                  <PredictionChart history={history}
                    predictedPrice={predict?.predicted_price} />
                </div>
              </div>
            )}

            {/* INDICATORS TAB */}
            {tab === 'indicators' && (
              <div style={{ ...card }}>
                <TechnicalIndicators data={indicators} />
              </div>
            )}

            {/* AI INSIGHTS TAB */}
            {tab === 'ai insights' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16,
              }}>
                <div style={{ ...card }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textMuted, marginBottom: 14,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    FinBERT Sentiment
                  </p>
                  <SentimentPanel data={sentiment} />
                </div>
                <div style={{ ...card }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textMuted, marginBottom: 14,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Behavioral Bias Alerts
                  </p>
                  <BiasAlert />
                </div>
              </div>
            )}

            {/* NEWS TAB */}
{tab === 'news' && (
  <div style={{ ...card }}>
    <div style={{
      display:        'flex',
      justifyContent: 'space-between',
      alignItems:     'center',
      marginBottom:   16,
    }}>
      <p style={{
        fontSize: 13, fontWeight: 700,
        color: colors.textMuted,
        textTransform: 'uppercase',
        letterSpacing: '0.06em',
        margin: 0,
      }}>
        Latest News — {name}
      </p>
      {news?.source === 'live' && (
        <span style={{
          fontSize:   11, fontWeight: 700,
          padding:    '3px 10px', borderRadius: 10,
          background: colors.successLight,
          color:      colors.success,
          border:     `1px solid ${colors.successBorder}`,
        }}>
          Live News
        </span>
      )}
    </div>

    {!news || news.articles?.length === 0 ? (
      <p style={{
        color: colors.textMuted, textAlign: 'center',
        padding: 40, fontSize: 13,
      }}>
        No news found.
      </p>
    ) : (
      <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
        {news.articles.map((a, i) => {
          const isPos = a.sentiment === 'positive';
          const isNeg = a.sentiment === 'negative';
          return (
            <div key={i} style={{
              padding:      '14px 16px',
              borderRadius: 10,
              border:       `1px solid ${colors.border}`,
              background:   '#fafafa',
              borderLeft:   `4px solid ${
                              isPos ? colors.success
                            : isNeg ? colors.danger
                            : colors.border}`,
            }}>
              {/* Sentiment badge + source */}
              <div style={{
                display:      'flex',
                alignItems:   'center',
                gap:          8,
                marginBottom: 8,
              }}>
                <span style={{
                  fontSize:   10, fontWeight: 700,
                  padding:    '2px 8px', borderRadius: 10,
                  background: isPos ? colors.successLight
                            : isNeg ? colors.dangerLight
                            : colors.primaryLight,
                  color:      isPos ? colors.success
                            : isNeg ? colors.danger
                            : colors.primary,
                  border:     `1px solid ${
                                isPos ? colors.successBorder
                              : isNeg ? colors.dangerBorder
                              : '#bfdbfe'}`,
                }}>
                  {a.sentiment?.toUpperCase()}
                </span>
                {a.source && (
                  <span style={{
                    fontSize: 10, color: colors.textLight,
                    fontWeight: 500,
                  }}>
                    {a.source}
                  </span>
                )}
                {a.published_at && (
                  <span style={{ fontSize: 10, color: colors.textLight }}>
                    · {new Date(a.published_at).toLocaleDateString('en-IN')}
                  </span>
                )}
              </div>

              {/* Headline */}
              <p style={{
                fontSize:     14, fontWeight: 600,
                color:        colors.text,
                marginBottom: 6, lineHeight: 1.4,
              }}>
                {a.headline}
              </p>

              {/* Description */}
              {a.description && (
                <p style={{
                  fontSize:     12,
                  color:        colors.textMuted,
                  marginBottom: 8,
                  lineHeight:   1.5,
                }}>
                  {a.description}
                </p>
              )}

              {/* Read more link */}
              {a.url && (
                <a
                  href={a.url}
                  target="_blank"
                  rel="noreferrer"
                  style={{
                    fontSize:   12,
                    color:      colors.primary,
                    fontWeight: 600,
                    textDecoration: 'none',
                  }}
                >
                  Read full article →
                </a>
              )}
            </div>
          );
        })}
      </div>
    )}
  </div>
)}

            {/* TRADE TAB */}
            {tab === 'trade' && (
              <div style={{
                display: 'grid', gridTemplateColumns: '360px 1fr', gap: 16,
              }}>
                <div style={{ ...card }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textMuted, marginBottom: 14,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Place Order
                  </p>
                  <TradingPanel
                    symbol={symbol}
                    currentPrice={predict?.current_price}
                    balance={portfolio?.balance}
                    onOrderPlaced={onOrderPlaced}
                  />
                </div>
                <div style={{ ...card }}>
                  <p style={{ fontSize: 13, fontWeight: 600,
                              color: colors.textMuted, marginBottom: 14,
                              textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                    Live Chart
                  </p>
                  <CandlestickChart candles={candles} />
                </div>
              </div>
            )}

            {/* ALERTS TAB */}
            {tab === 'alerts' && (
              <div style={{ ...card }}>
                <p style={{ fontSize: 13, fontWeight: 600,
                            color: colors.textMuted, marginBottom: 14,
                            textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Price Alerts — {name}
                </p>
                <AlertsPanel
                  alerts={alerts?.filter(a => a.symbol === symbol)}
                  symbol={symbol}
                  currentPrice={predict?.current_price}
                  onRefresh={onRefreshAlerts}
                />
              </div>
            )}
          </>
        )}
      </div>
    </div>
  );
};

export default StockDetail;