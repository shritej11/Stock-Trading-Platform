// TechnicalIndicators.jsx
import React, { useState } from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip,
  ReferenceLine, BarChart, Bar, Cell
} from 'recharts';

const SignalBadge = ({ text, color }) => (
  <span style={{
    padding: '2px 10px', borderRadius: 10, fontSize: 11, fontWeight: 700,
    background: color === 'green' ? '#14532d'
              : color === 'red'   ? '#7f1d1d' : '#78350f',
    color:      color === 'green' ? '#22c55e'
              : color === 'red'   ? '#ef4444' : '#f59e0b',
  }}>
    {text}
  </span>
);

const TechnicalIndicators = ({ data }) => {
  const [activeTab, setActiveTab] = useState('rsi');

  if (!data) return (
    <div style={{ color: '#64748b', padding: 20 }}>Loading indicators...</div>
  );

  const { dates, rsi, macd, macd_signal, macd_hist,
          bb_upper, bb_mid, bb_lower, close, ma20, ma50, summary } = data;

  const chartData = dates.map((d, i) => ({
    date:        d.slice(5),
    rsi:         rsi[i],
    macd:        macd[i],
    macd_signal: macd_signal[i],
    macd_hist:   macd_hist[i],
    bb_upper:    bb_upper[i],
    bb_mid:      bb_mid[i],
    bb_lower:    bb_lower[i],
    close:       close[i],
    ma20:        ma20[i],
    ma50:        ma50[i],
  }));

  const tabs = ['rsi', 'macd', 'bollinger'];

  return (
    <div>
      {/* Summary cards */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10, marginBottom: 16,
      }}>
        {[
          { label: 'RSI (14)',  value: summary.rsi,
            signal: summary.rsi_signal, color: summary.rsi_color },
          { label: 'MACD',     value: summary.macd.toFixed(2),
            signal: summary.macd_signal, color: summary.macd_color },
          { label: 'MA Cross', value: `MA20: ${summary.ma20}`,
            signal: summary.ma_signal, color: summary.ma_color },
        ].map((item, i) => (
          <div key={i} style={{
            background: '#0f1117', borderRadius: 8,
            padding: '10px 12px', border: '1px solid #2a2d3e',
          }}>
            <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>
              {item.label}
            </p>
            <p style={{ fontSize: 16, fontWeight: 700, color: '#e2e8f0',
                        marginBottom: 4 }}>
              {item.value}
            </p>
            <SignalBadge text={item.signal} color={item.color} />
          </div>
        ))}
      </div>

      {/* Tab switcher */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 14,
        background: '#0f1117', borderRadius: 8,
        padding: 3, width: 'fit-content',
      }}>
        {tabs.map(t => (
          <button key={t} onClick={() => setActiveTab(t)} style={{
            padding: '6px 14px', borderRadius: 6, border: 'none',
            cursor: 'pointer', fontSize: 12, fontWeight: 600,
            background: activeTab === t ? '#1e3a5f' : 'transparent',
            color:      activeTab === t ? '#60a5fa' : '#64748b',
          }}>
            {t.toUpperCase()}
          </button>
        ))}
      </div>

      {/* RSI Chart */}
      {activeTab === 'rsi' && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                   tickLine={false} interval={9} />
            <YAxis domain={[0, 100]} tick={{ fill: '#64748b', fontSize: 10 }}
                   tickLine={false} axisLine={false} width={30} />
            <Tooltip
              contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3e',
                              borderRadius: 8, fontSize: 12 }}
              labelStyle={{ color: '#94a3b8' }}
            />
            <ReferenceLine y={70} stroke="#ef4444" strokeDasharray="4 4"
                           label={{ value: 'OB', fill: '#ef4444', fontSize: 10 }} />
            <ReferenceLine y={30} stroke="#22c55e" strokeDasharray="4 4"
                           label={{ value: 'OS', fill: '#22c55e', fontSize: 10 }} />
            <Line type="monotone" dataKey="rsi" stroke="#a78bfa"
                  strokeWidth={2} dot={false} name="RSI" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* MACD Chart */}
      {activeTab === 'macd' && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                   tickLine={false} interval={9} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }}
                   tickLine={false} axisLine={false} width={40} />
            <Tooltip
              contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3e',
                              borderRadius: 8, fontSize: 12 }}
            />
            <ReferenceLine y={0} stroke="#475569" />
            <Line type="monotone" dataKey="macd"        stroke="#60a5fa"
                  strokeWidth={2} dot={false} name="MACD" />
            <Line type="monotone" dataKey="macd_signal" stroke="#f59e0b"
                  strokeWidth={2} dot={false} name="Signal" />
          </LineChart>
        </ResponsiveContainer>
      )}

      {/* Bollinger Bands Chart */}
      {activeTab === 'bollinger' && (
        <ResponsiveContainer width="100%" height={180}>
          <LineChart data={chartData}>
            <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
            <XAxis dataKey="date" tick={{ fill: '#64748b', fontSize: 10 }}
                   tickLine={false} interval={9} />
            <YAxis tick={{ fill: '#64748b', fontSize: 10 }}
                   tickLine={false} axisLine={false} width={55}
                   tickFormatter={v => `₹${v}`} />
            <Tooltip
              contentStyle={{ background: '#1e2130', border: '1px solid #2a2d3e',
                              borderRadius: 8, fontSize: 12 }}
            />
            <Line type="monotone" dataKey="bb_upper" stroke="#ef4444"
                  strokeWidth={1} dot={false} strokeDasharray="4 4"
                  name="Upper Band" />
            <Line type="monotone" dataKey="bb_mid"   stroke="#94a3b8"
                  strokeWidth={1} dot={false} name="Middle Band" />
            <Line type="monotone" dataKey="bb_lower" stroke="#22c55e"
                  strokeWidth={1} dot={false} strokeDasharray="4 4"
                  name="Lower Band" />
            <Line type="monotone" dataKey="close"    stroke="#60a5fa"
                  strokeWidth={2} dot={false} name="Price" />
          </LineChart>
        </ResponsiveContainer>
      )}
    </div>
  );
};

export default TechnicalIndicators;