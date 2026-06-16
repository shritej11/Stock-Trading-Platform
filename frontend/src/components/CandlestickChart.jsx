// CandlestickChart.jsx
// Real OHLC candlestick chart using Recharts

import React from 'react';
import {
  ResponsiveContainer, ComposedChart, Bar,
  XAxis, YAxis, CartesianGrid, Tooltip, Cell
} from 'recharts';

const CustomCandle = (props) => {
  const { x, y, width, height, payload } = props;
  if (!payload) return null;

  const { open, close, high, low } = payload;
  const isGreen  = close >= open;
  const color    = isGreen ? '#22c55e' : '#ef4444';
  const bodyTop  = isGreen ? y : y + height;
  const bodyH    = Math.max(Math.abs(height), 1);

  // We need the full chart's yAxis scale to draw wicks
  // Use the bar's y/height as proxy for body position
  return (
    <g>
      {/* Wick line */}
      <line
        x1={x + width / 2} y1={props.highY || y}
        x2={x + width / 2} y2={props.lowY  || y + height}
        stroke={color} strokeWidth={1}
      />
      {/* Candle body */}
      <rect
        x={x + 1} y={bodyTop}
        width={width - 2} height={bodyH}
        fill={color} stroke={color} strokeWidth={0.5}
        opacity={0.9}
      />
    </g>
  );
};

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    const d = payload[0]?.payload;
    if (!d) return null;
    const isGreen = d.close >= d.open;
    return (
      <div style={{
        background: '#1e2130',
        border: '1px solid #2a2d3e',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 12,
        minWidth: 160,
      }}>
        <p style={{ color: '#94a3b8', marginBottom: 8, fontSize: 11 }}>{label}</p>
        <p style={{ color: '#e2e8f0', marginBottom: 3 }}>O: <span style={{ color: '#60a5fa' }}>Rs.{d.open}</span></p>
        <p style={{ color: '#e2e8f0', marginBottom: 3 }}>H: <span style={{ color: '#22c55e' }}>Rs.{d.high}</span></p>
        <p style={{ color: '#e2e8f0', marginBottom: 3 }}>L: <span style={{ color: '#ef4444' }}>Rs.{d.low}</span></p>
        <p style={{ color: '#e2e8f0', marginBottom: 3 }}>C: <span style={{ color: isGreen ? '#22c55e' : '#ef4444', fontWeight: 700 }}>Rs.{d.close}</span></p>
        <p style={{ color: '#64748b', marginTop: 6, fontSize: 11 }}>Vol: {d.volume?.toLocaleString()}</p>
      </div>
    );
  }
  return null;
};

const CandlestickChart = ({ candles }) => {
  if (!candles || candles.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
        Loading candlestick data...
      </div>
    );
  }

  // Build chart data with candle body height
  const data = candles.map(c => ({
    ...c,
    date:       c.date.slice(5),
    bodyBottom: Math.min(c.open, c.close),
    bodyHeight: Math.max(Math.abs(c.close - c.open), 1),
    isGreen:    c.close >= c.open,
  }));

  return (
    <ResponsiveContainer width="100%" height={260}>
      <ComposedChart data={data} margin={{ top: 10, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          interval={8}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 10 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${v}`}
          domain={['auto', 'auto']}
          width={65}
        />
        <Tooltip content={<CustomTooltip />} />

        {/* High-Low wick as thin bar */}
        <Bar dataKey="high" barSize={1} fill="transparent">
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isGreen ? '#22c55e' : '#ef4444'} />
          ))}
        </Bar>

        {/* Candle body */}
        <Bar dataKey="bodyHeight" barSize={8}>
          {data.map((entry, i) => (
            <Cell key={i} fill={entry.isGreen ? '#22c55e' : '#ef4444'} />
          ))}
        </Bar>
      </ComposedChart>
    </ResponsiveContainer>
  );
};

export default CandlestickChart;