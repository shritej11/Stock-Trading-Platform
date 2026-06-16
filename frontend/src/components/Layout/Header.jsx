// Header.jsx
import React, { useState } from 'react';
import { colors, shadow } from '../../styles/theme';

const Header = ({ user, onLogout, onNavigate, cartCount }) => {
  const [profileOpen, setProfileOpen] = useState(false);

  return (
    <div style={{
      position:    'fixed',
      top:         0,
      left:        220,
      right:       0,
      height:      60,
      background:  colors.header,
      borderBottom:`1px solid ${colors.border}`,
      display:     'flex',
      alignItems:  'center',
      justifyContent: 'space-between',
      padding:     '0 24px',
      zIndex:      99,
      boxShadow:   shadow.sm,
    }}>

      {/* Left: page title */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <div style={{
          width: 3, height: 20, background: colors.primary,
          borderRadius: 2,
        }} />
        <h2 style={{ fontSize: 16, fontWeight: 600, color: colors.text }}>
          NeuroTrade AI
        </h2>
        <span style={{
          fontSize: 11, background: '#f0fdf4', color: '#16a34a',
          padding: '2px 8px', borderRadius: 10, fontWeight: 600,
          border: '1px solid #bbf7d0',
        }}>
          Live
        </span>
      </div>

      {/* Right: links + profile */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 4 }}>

        {/* Nav links */}
        {[
          { label: 'Help',       page: 'help' },
          { label: 'Support',    page: 'support' },
          { label: 'Contact Us', page: 'contact' },
          { label: 'Raise Ticket', page: 'tickets' },
        ].map(link => (
          <button key={link.page}
            onClick={() => onNavigate(link.page)}
            style={{
              padding:    '6px 12px',
              background: 'transparent',
              border:     'none',
              borderRadius: 6,
              color:      colors.textMuted,
              fontSize:   12,
              cursor:     'pointer',
              fontWeight: 500,
            }}
          >
            {link.label}
          </button>
        ))}

        {/* Divider */}
        <div style={{
          width: 1, height: 24,
          background: colors.border, margin: '0 8px',
        }} />

        {/* Cart */}
        <button onClick={() => onNavigate('cart')} style={{
          position:   'relative',
          width:      36, height: 36,
          background: cartCount > 0 ? colors.primaryLight : '#f3f4f6',
          border:     'none', borderRadius: 8,
          cursor:     'pointer', fontSize: 16,
          display:    'flex', alignItems: 'center',
          justifyContent: 'center',
        }}>
          ⊕
          {cartCount > 0 && (
            <span style={{
              position:  'absolute', top: -4, right: -4,
              background: colors.danger, color: '#fff',
              fontSize: 9, fontWeight: 700,
              width: 16, height: 16, borderRadius: '50%',
              display: 'flex', alignItems: 'center',
              justifyContent: 'center',
            }}>
              {cartCount}
            </span>
          )}
        </button>

        {/* Profile dropdown */}
        <div style={{ position: 'relative' }}>
          <div
            onClick={() => setProfileOpen(!profileOpen)}
            style={{
              display:    'flex', alignItems: 'center', gap: 8,
              padding:    '6px 12px', borderRadius: 8,
              border:     `1px solid ${colors.border}`,
              cursor:     'pointer', background: '#fff',
            }}
          >
            <div style={{
              width:          30, height: 30, borderRadius: '50%',
              background:     colors.primary,
              display:        'flex', alignItems: 'center',
              justifyContent: 'center',
              color:          '#fff', fontWeight: 700, fontSize: 13,
            }}>
              {(user?.name || 'T')[0].toUpperCase()}
            </div>
            <div>
              <p style={{ fontSize: 12, fontWeight: 600, color: colors.text }}>
                {user?.name || 'Trader'}
              </p>
              <p style={{ fontSize: 10, color: colors.textMuted }}>
                {user?.email || 'demo@neurotrade.ai'}
              </p>
            </div>
            <span style={{ fontSize: 10, color: colors.textMuted }}>▾</span>
          </div>

          {/* Dropdown */}
          {profileOpen && (
            <div style={{
              position:   'absolute', top: 46, right: 0,
              background: '#fff', borderRadius: 10,
              border:     `1px solid ${colors.border}`,
              boxShadow:  shadow.lg,
              minWidth:   180, zIndex: 200, overflow: 'hidden',
            }}>
              {[
                { label: 'My Profile',    icon: '👤', page: 'profile' },
                { label: 'Settings',      icon: '⚙️', page: 'settings' },
                { label: 'Security',      icon: '🔒', page: 'security' },
                { label: 'Notifications', icon: '🔔', page: 'notifications' },
              ].map(item => (
                <div key={item.page}
                  onClick={() => { onNavigate(item.page); setProfileOpen(false); }}
                  style={{
                    padding:    '10px 16px',
                    cursor:     'pointer',
                    fontSize:   13,
                    color:      colors.text,
                    display:    'flex', alignItems: 'center', gap: 10,
                    borderBottom: `1px solid ${colors.border}`,
                  }}
                  onMouseEnter={e => e.currentTarget.style.background = '#f9fafb'}
                  onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
                >
                  <span>{item.icon}</span>
                  {item.label}
                </div>
              ))}
              <div
                onClick={() => { onLogout(); setProfileOpen(false); }}
                style={{
                  padding:  '10px 16px', cursor: 'pointer',
                  fontSize: 13, color: colors.danger,
                  display:  'flex', alignItems: 'center', gap: 10,
                }}
                onMouseEnter={e => e.currentTarget.style.background = '#fef2f2'}
                onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
              >
                <span>🚪</span> Logout
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default Header;