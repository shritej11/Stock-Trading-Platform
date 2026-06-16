// AnalyticsDashboard.jsx
import React from 'react';
import {
  ResponsiveContainer, PieChart, Pie, Cell,
  Tooltip, BarChart, Bar, XAxis, YAxis, CartesianGrid, Legend
} from 'recharts';

const COLORS = ['#378ADD', '#22c55e', '#f59e0b', '#a78bfa', '#64748b'];

const StatCard = ({ label, value, color }) => (
  <div style={{
    background: '#0f1117', borderRadius: 8,
    padding: '10px 12px', border: '1px solid #2a2d3e',
    textAlign: 'center',
  }}>
    <p style={{ fontSize: 11, color: '#64748b', marginBottom: 4 }}>{label}</p>
    <p style={{ fontSize: 15, fontWeight: 700, color: color || '#e2e8f0' }}>
      {value}
    </p>
  </div>
);

const AnalyticsDashboard = ({ data }) => {
  if (!data) return (
    <div style={{ color: '#64748b', padding: 20 }}>Loading analytics...</div>
  );

  const { summary, breakdown, allocation } = data;

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 16 }}>

      {/* Summary stats */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(3, 1fr)',
        gap: 10,
      }}>
        <StatCard label="Portfolio Value"
          value={`Rs.${summary.current_value?.toLocaleString()}`}
          color="#60a5fa" />
        <StatCard label="Total P&L"
          value={`${summary.total_pnl >= 0 ? '+' : ''}Rs.${summary.total_pnl}`}
          color={summary.total_pnl >= 0 ? '#22c55e' : '#ef4444'} />
        <StatCard label="Return %"
          value={`${summary.total_pnl_pct >= 0 ? '+' : ''}${summary.total_pnl_pct}%`}
          color={summary.total_pnl_pct >= 0 ? '#22c55e' : '#ef4444'} />
        <StatCard label="Total Trades"  value={summary.total_trades} />
        <StatCard label="Buy Orders"    value={summary.buy_trades}   color="#22c55e" />
        <StatCard label="Sell Orders"   value={summary.sell_trades}  color="#ef4444" />
      </div>

      {/* Allocation pie + breakdown bar */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 16 }}>

        {/* Pie chart */}
        <div style={{
          background: '#0f1117', borderRadius: 10,
          padding: 14, border: '1px solid #2a2d3e',
        }}>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            PORTFOLIO ALLOCATION
          </p>
          {allocation.length > 0 ? (
            <>
              <ResponsiveContainer width="100%" height={180}>
                <PieChart>
                  <Pie data={allocation} dataKey="value"
                       nameKey="symbol" cx="50%" cy="50%"
                       innerRadius={45} outerRadius={75}
                       paddingAngle={3}>
                    {allocation.map((_, i) => (
                      <Cell key={i} fill={COLORS[i % COLORS.length]} />
                    ))}
                  </Pie>
                  <Tooltip
                    formatter={(v) => `Rs.${v.toLocaleString()}`}
                    contentStyle={{
                      background: '#1e2130',
                      border: '1px solid #2a2d3e',
                      borderRadius: 8, fontSize: 12,
                    }}
                  />
                </PieChart>
              </ResponsiveContainer>
              {/* Legend */}
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
                {allocation.map((a, i) => (
                  <div key={i} style={{
                    display: 'flex', alignItems: 'center', gap: 5,
                    fontSize: 11, color: '#94a3b8',
                  }}>
                    <div style={{
                      width: 8, height: 8, borderRadius: '50%',
                      background: COLORS[i % COLORS.length],
                    }} />
                    {a.symbol} ({a.pct}%)
                  </div>
                ))}
              </div>
            </>
          ) : (
            <p style={{ color: '#475569', textAlign: 'center', padding: 40,
                        fontSize: 13 }}>
              No holdings yet
            </p>
          )}
        </div>

        {/* P&L breakdown bar */}
        <div style={{
          background: '#0f1117', borderRadius: 10,
          padding: 14, border: '1px solid #2a2d3e',
        }}>
          <p style={{ fontSize: 11, color: '#64748b', marginBottom: 10 }}>
            P&L BY STOCK
          </p>
          {breakdown.length > 0 ? (
            <ResponsiveContainer width="100%" height={200}>
              <BarChart data={breakdown}>
                <CartesianGrid strokeDasharray="3 3" stroke="#1e2130" />
                <XAxis dataKey="symbol"
                       tickFormatter={v => v.replace('.NS', '')}
                       tick={{ fill: '#64748b', fontSize: 11 }}
                       tickLine={false} />
                <YAxis tick={{ fill: '#64748b', fontSize: 11 }}
                       tickLine={false} axisLine={false}
                       tickFormatter={v => `₹${v}`} width={55} />
                <Tooltip
                  contentStyle={{
                    background: '#1e2130',
                    border: '1px solid #2a2d3e',
                    borderRadius: 8, fontSize: 12,
                  }}
                  formatter={v => `Rs.${v.toLocaleString()}`}
                />
                <Bar dataKey="pnl" name="P&L" radius={[4, 4, 0, 0]}>
                  {breakdown.map((b, i) => (
                    <Cell key={i}
                      fill={b.pnl >= 0 ? '#22c55e' : '#ef4444'} />
                  ))}
                </Bar>
              </BarChart>
            </ResponsiveContainer>
          ) : (
            <p style={{ color: '#475569', textAlign: 'center',
                        padding: 40, fontSize: 13 }}>
              No trades yet
            </p>
          )}
        </div>
      </div>
    </div>
  );
};

export default AnalyticsDashboard;