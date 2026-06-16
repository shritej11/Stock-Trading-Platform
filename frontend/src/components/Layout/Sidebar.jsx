// Sidebar.jsx
import React from 'react';
import { colors, shadow } from '../../styles/theme';

const NAV_ITEMS = [
  { id: 'dashboard', label: 'Dashboard',  icon: '▦' },
  { id: 'watchlist', label: 'Watchlist',  icon: '★' },
  { id: 'portfolio', label: 'Portfolio',  icon: '◈' },
  { id: 'analytics', label: 'Analytics',  icon: '◉' },
  { id: 'alerts',    label: 'Alerts',     icon: '◎' },
  { id: 'cart',      label: 'Cart',       icon: '⊕' },
  { id: 'bot', label: 'AI Bot', icon: '🤖' },
];

const BOTTOM_ITEMS = [
  { id: 'support',   label: 'Support',    icon: '?' },
  { id: 'settings',  label: 'Settings',   icon: '⚙' },
];

const Sidebar = ({ active, onChange, alertCount, cartCount }) => {
  const itemStyle = (id) => ({
    display:      'flex',
    alignItems:   'center',
    gap:          10,
    padding:      '10px 16px',
    borderRadius: 8,
    cursor:       'pointer',
    marginBottom: 2,
    background:   active === id ? colors.primaryLight : 'transparent',
    color:        active === id ? colors.primary : colors.textMuted,
    fontWeight:   active === id ? 600 : 400,
    fontSize:     13,
    transition:   'all 0.15s',
    position:     'relative',
  });

  const iconStyle = (id) => ({
    width:         32,
    height:        32,
    borderRadius:  8,
    display:       'flex',
    alignItems:    'center',
    justifyContent:'center',
    background:    active === id ? colors.primary : '#f3f4f6',
    color:         active === id ? '#fff' : colors.textMuted,
    fontSize:      14,
    flexShrink:    0,
  });

  return (
    <div style={{
      width:         220,
      minHeight:     '100vh',
      background:    colors.sidebar,
      borderRight:   `1px solid ${colors.border}`,
      display:       'flex',
      flexDirection: 'column',
      padding:       '16px 12px',
      position:      'fixed',
      top:           0,
      left:          0,
      zIndex:        100,
      boxShadow:     shadow.sm,
    }}>

      {/* Logo */}
      <div style={{
        padding:      '8px 8px 20px',
        borderBottom: `1px solid ${colors.border}`,
        marginBottom: 12,
      }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
          <div style={{
            width: 34, height: 34, borderRadius: 10,
            background: colors.primary,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center',
            color: '#fff', fontWeight: 800, fontSize: 16,
          }}>
            N
          </div>
          <div>
            <p style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
              NeuroTrade
            </p>
            <p style={{ fontSize: 10, color: colors.textMuted }}>AI Platform</p>
          </div>
        </div>
      </div>

      {/* Main nav */}
      <div style={{ flex: 1 }}>
        <p style={{
          fontSize: 10, fontWeight: 600, color: colors.textLight,
          letterSpacing: '0.08em', padding: '0 8px', marginBottom: 8,
        }}>
          MAIN MENU
        </p>
        {NAV_ITEMS.map(item => (
          <div key={item.id} onClick={() => onChange(item.id)}
               style={itemStyle(item.id)}>
            <div style={iconStyle(item.id)}>{item.icon}</div>
            <span>{item.label}</span>
            {/* Badge for alerts */}
            {item.id === 'alerts' && alertCount > 0 && (
              <span style={{
                marginLeft: 'auto', background: colors.danger,
                color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10,
              }}>
                {alertCount}
              </span>
            )}
            {/* Badge for cart */}
            {item.id === 'cart' && cartCount > 0 && (
              <span style={{
                marginLeft: 'auto', background: colors.primary,
                color: '#fff', fontSize: 10, fontWeight: 700,
                padding: '1px 6px', borderRadius: 10,
              }}>
                {cartCount}
              </span>
            )}
          </div>
        ))}
      </div>

      {/* Bottom nav */}
      <div style={{ borderTop: `1px solid ${colors.border}`, paddingTop: 12 }}>
        {BOTTOM_ITEMS.map(item => (
          <div key={item.id} onClick={() => onChange(item.id)}
               style={itemStyle(item.id)}>
            <div style={iconStyle(item.id)}>{item.icon}</div>
            <span>{item.label}</span>
          </div>
        ))}
      </div>
    </div>
  );
};

export default Sidebar;