// ConfidenceMeter.jsx — updated colors
import React from 'react';

const ConfidenceMeter = ({ score, signal }) => {
  const radius    = 54;
  const stroke    = 10;
  const normalise = radius - stroke / 2;
  const circ      = 2 * Math.PI * normalise;
  const arc       = circ * 0.75;
  const offset    = arc - (score / 100) * arc;

  const color =
    score >= 65 ? '#057a55' :
    score >= 40 ? '#c27803' :
                  '#e02424';

  const signalBg =
    score >= 65 ? '#f3faf7' :
    score >= 40 ? '#fdfdea' :
                  '#fdf2f2';

  const signalBorder =
    score >= 65 ? '#bcf0da' :
    score >= 40 ? '#fce96a' :
                  '#f8b4b4';

  return (
    <div style={{ display: 'flex', flexDirection: 'column',
                  alignItems: 'center', gap: 8 }}>
      <svg width="130" height="100" viewBox="0 0 130 100">
        <circle
          cx="65" cy="70" r={normalise}
          fill="none" stroke="#e2e8f0" strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset="0" strokeLinecap="round"
          transform="rotate(-225 65 70)"
        />
        <circle
          cx="65" cy="70" r={normalise}
          fill="none" stroke={color} strokeWidth={stroke}
          strokeDasharray={`${arc} ${circ}`}
          strokeDashoffset={offset} strokeLinecap="round"
          transform="rotate(-225 65 70)"
          style={{ transition: 'stroke-dashoffset 0.8s ease' }}
        />
        <text x="65" y="68" textAnchor="middle"
              fill={color} fontSize="22" fontWeight="800">
          {Math.round(score)}
        </text>
        <text x="65" y="82" textAnchor="middle"
              fill="#9ca3af" fontSize="10">
          out of 100
        </text>
      </svg>
      <div style={{
        background: signalBg, color,
        padding: '4px 16px', borderRadius: 20,
        fontSize: 13, fontWeight: 700,
        border: `1px solid ${signalBorder}`,
      }}>
        {signal}
      </div>
    </div>
  );
};

export default ConfidenceMeter;