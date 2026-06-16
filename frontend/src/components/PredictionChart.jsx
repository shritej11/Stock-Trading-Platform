// PredictionChart.jsx
// Line chart showing actual vs predicted stock prices

import React from 'react';
import {
  ResponsiveContainer, LineChart, Line,
  XAxis, YAxis, CartesianGrid, Tooltip, Legend
} from 'recharts';

const CustomTooltip = ({ active, payload, label }) => {
  if (active && payload && payload.length) {
    return (
      <div style={{
        background: '#1e2130',
        border: '1px solid #2a2d3e',
        borderRadius: 8,
        padding: '10px 14px',
        fontSize: 13
      }}>
        <p style={{ color: '#94a3b8', marginBottom: 6 }}>{label}</p>
        {payload.map((p, i) => (
          <p key={i} style={{ color: p.color, marginBottom: 2 }}>
            {p.name}: Rs.{Number(p.value).toFixed(2)}
          </p>
        ))}
      </div>
    );
  }
  return null;
};

const PredictionChart = ({ history, predictedPrice }) => {
  if (!history || history.length === 0) {
    return (
      <div style={{ color: '#64748b', textAlign: 'center', padding: 40 }}>
        Loading chart data...
      </div>
    );
  }

  // Build chart data: actual history + one predicted point at the end
  const chartData = history.map((h, i) => ({
    date:   h.date.slice(5),   // show MM-DD only
    actual: h.close,
  }));

  // Add predicted price as the next point
  chartData.push({
    date:      'Next',
    actual:    null,
    predicted: predictedPrice,
  });

  // Add predicted line starting from last actual
  chartData[chartData.length - 2].predicted = history[history.length - 1].close;

  return (
    <ResponsiveContainer width="100%" height={220}>
      <LineChart data={chartData} margin={{ top: 5, right: 10, left: 0, bottom: 5 }}>
        <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
        <XAxis
          dataKey="date"
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickLine={false}
          interval={9}
        />
        <YAxis
          tick={{ fill: '#64748b', fontSize: 11 }}
          tickLine={false}
          axisLine={false}
          tickFormatter={(v) => `₹${v}`}
          width={60}
        />
        <Tooltip content={<CustomTooltip />} />
        <Legend
          wrapperStyle={{ fontSize: 12, color: '#94a3b8', paddingTop: 8 }}
        />
        <Line
          type="monotone"
          dataKey="actual"
          stroke="#378ADD"
          strokeWidth={2}
          dot={false}
          name="Actual"
        />
        <Line
          type="monotone"
          dataKey="predicted"
          stroke="#f59e0b"
          strokeWidth={2}
          strokeDasharray="5 5"
          dot={{ fill: '#f59e0b', r: 4 }}
          name="Predicted"
        />
      </LineChart>
    </ResponsiveContainer>
  );
};

export default PredictionChart;