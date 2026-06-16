// BiasAlert.jsx — light theme
import React from 'react';
import { colors } from '../styles/theme';

const BIAS_ALERTS = [
  {
    type:    'Panic Selling',
    color:   colors.danger,
    bg:      colors.dangerLight,
    border:  colors.dangerBorder,
    message: 'You have sold 6 of your last 8 positions within 3 hours of a red candle. This may be panic selling — consider setting a stop-loss instead.',
  },
  {
    type:    'FOMO Buying',
    color:   colors.warning,
    bg:      colors.warningLight,
    border:  colors.warningBorder,
    message: 'You tend to buy stocks after a 3%+ single-day rally. Entering after a surge often means buying at the peak.',
  },
  {
    type:    'Overconfidence',
    color:   colors.primary,
    bg:      colors.primaryLight,
    border:  '#bfdbfe',
    message: 'Your average position size has increased 40% this month. Overconfidence after a winning streak is a common bias.',
  },
];

const BiasAlert = () => (
  <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
    {BIAS_ALERTS.map((alert, i) => (
      <div key={i} style={{
        padding:      '12px 14px',
        background:   alert.bg,
        borderRadius: 8,
        borderLeft:   `3px solid ${alert.color}`,
        border:       `1px solid ${alert.border}`,
        borderLeft:   `3px solid ${alert.color}`,
      }}>
        <span style={{
          background:   '#fff',
          color:        alert.color,
          padding:      '2px 10px',
          borderRadius: 10,
          fontSize:     11, fontWeight: 700,
          border:       `1px solid ${alert.border}`,
          display:      'inline-block',
          marginBottom: 8,
        }}>
          {alert.type}
        </span>
        <p style={{ fontSize: 12, color: colors.text, lineHeight: 1.6 }}>
          {alert.message}
        </p>
      </div>
    ))}
    <p style={{
      fontSize:  11, color: colors.textMuted,
      textAlign: 'center', marginTop: 4,
    }}>
      Behavioral analysis based on your last 30 trading sessions
    </p>
  </div>
);

export default BiasAlert;