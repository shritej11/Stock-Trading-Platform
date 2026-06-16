// SentimentPanel.jsx — light theme colors
import React from 'react';
import { colors } from '../styles/theme';

const badge = (sentiment) => {
  const map = {
    positive: {
      bg:     colors.successLight,
      color:  colors.success,
      border: colors.successBorder,
      label:  'Positive'
    },
    negative: {
      bg:     colors.dangerLight,
      color:  colors.danger,
      border: colors.dangerBorder,
      label:  'Negative'
    },
    neutral: {
      bg:     colors.primaryLight,
      color:  colors.primary,
      border: '#bfdbfe',
      label:  'Neutral'
    },
  };
  return map[sentiment] || map.neutral;
};

const SentimentPanel = ({ data }) => {
  if (!data) return (
    <div style={{ color: colors.textMuted, padding: 20, fontSize: 13 }}>
      Loading sentiment...
    </div>
  );

  const overall = badge(data.overall);

  return (
    <div>
      {/* Overall */}
      <div style={{
        display:        'flex',
        alignItems:     'center',
        justifyContent: 'space-between',
        marginBottom:   12,
        padding:        '10px 12px',
        background:     colors.bgSection,
        borderRadius:   8,
        border:         `1px solid ${colors.border}`,
      }}>
        <span style={{ fontSize: 13, color: colors.textMuted }}>
          Overall sentiment
        </span>
        <span style={{
          background:   overall.bg,
          color:        overall.color,
          padding:      '3px 12px',
          borderRadius: 12,
          fontSize:     12, fontWeight: 700,
          border:       `1px solid ${overall.border}`,
        }}>
          {overall.label}
        </span>
      </div>

      {/* Headlines */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
        {data.headlines.map((h, i) => {
          const b = badge(h.sentiment);
          return (
            <div key={i} style={{
              display:    'flex',
              alignItems: 'flex-start',
              gap:        10,
              padding:    '10px 12px',
              background: colors.bgSection,
              borderRadius: 8,
              border:     `1px solid ${colors.border}`,
              borderLeft: `3px solid ${b.color}`,
            }}>
              <span style={{
                background:   b.bg,
                color:        b.color,
                padding:      '2px 8px',
                borderRadius: 10,
                fontSize:     10, fontWeight: 700,
                whiteSpace:   'nowrap',
                marginTop:    2,
                border:       `1px solid ${b.border}`,
              }}>
                {b.label}
              </span>
              <p style={{ fontSize: 12, color: colors.text, lineHeight: 1.5 }}>
                {h.headline}
              </p>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default SentimentPanel;