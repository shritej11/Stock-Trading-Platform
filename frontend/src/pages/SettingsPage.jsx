// SettingsPage.jsx
import React, { useState, useEffect } from 'react';
import {
  fetchProfile, updateProfile, changePassword,
  toggle2FA, resetPortfolio, clearWatchlist, clearAlerts,
} from '../services/api';
import { colors, shadow } from '../styles/theme';

// ── Reusable components ──────────────────────────────

const Card = ({ children, style }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: '20px 24px', boxShadow: shadow.sm,
    marginBottom: 16, ...style,
  }}>
    {children}
  </div>
);

const SectionTitle = ({ icon, title, desc }) => (
  <div style={{
    display: 'flex', alignItems: 'center',
    gap: 12, marginBottom: 20,
    paddingBottom: 16,
    borderBottom: `1px solid ${colors.border}`,
  }}>
    <div style={{
      width: 40, height: 40, borderRadius: 10,
      background: colors.primaryLight,
      display: 'flex', alignItems: 'center',
      justifyContent: 'center', fontSize: 18,
    }}>
      {icon}
    </div>
    <div>
      <h3 style={{ fontSize: 15, fontWeight: 700, color: colors.text }}>
        {title}
      </h3>
      <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
        {desc}
      </p>
    </div>
  </div>
);

const InputField = ({ label, type = 'text', value, onChange,
                       placeholder, disabled, hint }) => (
  <div style={{ marginBottom: 16 }}>
    <label style={{
      fontSize: 12, fontWeight: 600, color: colors.textMuted,
      display: 'block', marginBottom: 5,
      textTransform: 'uppercase', letterSpacing: '0.04em',
    }}>
      {label}
    </label>
    <input
      type={type}
      value={value}
      onChange={onChange}
      placeholder={placeholder}
      disabled={disabled}
      style={{
        width: '100%', padding: '10px 12px',
        border: `1px solid ${disabled ? colors.border : colors.borderDark}`,
        borderRadius: 8, fontSize: 14,
        color: disabled ? colors.textMuted : colors.text,
        background: disabled ? '#f9fafb' : '#fff',
        outline: 'none', fontFamily: 'inherit',
      }}
    />
    {hint && (
      <p style={{ fontSize: 11, color: colors.textLight, marginTop: 4 }}>
        {hint}
      </p>
    )}
  </div>
);

const Toggle = ({ value, onChange, label, desc }) => (
  <div style={{
    display: 'flex', justifyContent: 'space-between',
    alignItems: 'center', padding: '12px 0',
    borderBottom: `1px solid ${colors.border}`,
  }}>
    <div>
      <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
        {label}
      </p>
      {desc && (
        <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
          {desc}
        </p>
      )}
    </div>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 46, height: 26, borderRadius: 13,
        background: value ? colors.success : colors.border,
        position: 'relative', cursor: 'pointer',
        transition: 'background 0.2s', flexShrink: 0,
      }}
    >
      <div style={{
        width: 20, height: 20, borderRadius: '50%',
        background: '#fff', position: 'absolute',
        top: 3, left: value ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
  </div>
);

const SaveButton = ({ onClick, loading, label = 'Save Changes' }) => (
  <button
    onClick={onClick}
    disabled={loading}
    style={{
      padding: '10px 24px', background: colors.primary,
      border: 'none', borderRadius: 8, color: '#fff',
      fontSize: 13, fontWeight: 700, cursor: 'pointer',
      opacity: loading ? 0.6 : 1, marginTop: 8,
      fontFamily: 'inherit',
    }}
  >
    {loading ? 'Saving...' : label}
  </button>
);

const StatusMsg = ({ msg }) => msg ? (
  <div style={{
    padding: '10px 14px', borderRadius: 8,
    marginTop: 12, fontSize: 13,
    background: msg.type === 'success' ? colors.successLight : colors.dangerLight,
    color:      msg.type === 'success' ? colors.success      : colors.danger,
    border:     `1px solid ${msg.type === 'success'
                  ? colors.successBorder : colors.dangerBorder}`,
  }}>
    {msg.text}
  </div>
) : null;

const PasswordStrength = ({ password }) => {
  const checks = [
    { label: '8+ characters',  pass: password.length >= 8 },
    { label: 'Uppercase',      pass: /[A-Z]/.test(password) },
    { label: 'Number',         pass: /[0-9]/.test(password) },
    { label: 'Special char',   pass: /[^A-Za-z0-9]/.test(password) },
  ];
  const score = checks.filter(c => c.pass).length;
  const color = score <= 1 ? colors.danger
              : score <= 2 ? colors.warning
              : score <= 3 ? '#3b82f6'
              : colors.success;
  const label = ['', 'Weak', 'Fair', 'Good', 'Strong'][score];

  if (!password) return null;

  return (
    <div style={{ marginTop: 8, marginBottom: 16 }}>
      <div style={{ display: 'flex', gap: 4, marginBottom: 6 }}>
        {[1,2,3,4].map(i => (
          <div key={i} style={{
            flex: 1, height: 4, borderRadius: 2,
            background: i <= score ? color : colors.border,
            transition: 'background 0.3s',
          }} />
        ))}
      </div>
      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <div style={{ display: 'flex', gap: 12 }}>
          {checks.map((c, i) => (
            <span key={i} style={{
              fontSize: 10, color: c.pass ? colors.success : colors.textLight,
            }}>
              {c.pass ? '✓' : '○'} {c.label}
            </span>
          ))}
        </div>
        <span style={{ fontSize: 11, fontWeight: 700, color }}>
          {label}
        </span>
      </div>
    </div>
  );
};

// ── Sidebar nav ──────────────────────────────────────

const SECTIONS = [
  { id: 'profile',       icon: '👤', label: 'Profile' },
  { id: 'security',      icon: '🔒', label: 'Security' },
  { id: 'notifications', icon: '🔔', label: 'Notifications' },
  { id: 'trading',       icon: '📊', label: 'Trading' },
  { id: 'appearance',    icon: '🎨', label: 'Appearance' },
  { id: 'ai',            icon: '🤖', label: 'AI & Models' },
  { id: 'account',       icon: '⚙️',  label: 'Account Management' },
];

// ── Main settings page ───────────────────────────────

const SettingsPage = ({ onLogout }) => {
  const [active,  setActive]  = useState('profile');
  const [profile, setProfile] = useState(null);
  const [loading, setLoading] = useState(true);

  // Notification prefs (local state only)
  const [notifs, setNotifs] = useState({
    priceAlerts:    true,
    botTrades:      true,
    marketReminder: false,
    dailySummary:   true,
  });

  // Trading prefs (local state only)
  const [trading, setTrading] = useState({
    defaultQty:     1,
    riskLevel:      'moderate',
    skipConfirm:    false,
    defaultChart:   'candlestick',
  });

  // Appearance prefs (local state only)
  const [appearance, setAppearance] = useState({
    theme:          'light',
    currency:       'inr',
    numberFormat:   'indian',
    compactNumbers: false,
  });

  // AI prefs (local state only)
  const [aiPrefs, setAiPrefs] = useState({
    confidenceThreshold: 65,
    defaultIndicator:    'rsi',
    sentimentWeight:     40,
    showShap:            true,
  });

  useEffect(() => {
    fetchProfile()
      .then(r => { setProfile(r.data); setLoading(false); })
      .catch(() => setLoading(false));
  }, []);

  return (
    <div style={{ display: 'flex', gap: 0, minHeight: '100vh' }}>

      {/* Left sidebar */}
      <div style={{
        width: 220, flexShrink: 0,
        background: '#fff',
        borderRight: `1px solid ${colors.border}`,
        padding: '20px 12px',
      }}>
        <p style={{
          fontSize: 11, fontWeight: 700, color: colors.textLight,
          textTransform: 'uppercase', letterSpacing: '0.08em',
          padding: '0 8px', marginBottom: 10,
        }}>
          Settings
        </p>
        {SECTIONS.map(s => (
          <div
            key={s.id}
            onClick={() => setActive(s.id)}
            style={{
              display: 'flex', alignItems: 'center', gap: 10,
              padding: '9px 12px', borderRadius: 8,
              cursor: 'pointer', marginBottom: 2,
              background: active === s.id
                          ? colors.primaryLight : 'transparent',
              color:      active === s.id
                          ? colors.primary : colors.textMuted,
              fontWeight: active === s.id ? 600 : 400,
              fontSize: 13,
            }}
          >
            <span style={{ fontSize: 15 }}>{s.icon}</span>
            {s.label}
          </div>
        ))}
      </div>

      {/* Right content */}
      <div style={{
        flex: 1, padding: '28px 32px',
        maxWidth: 720, overflowY: 'auto',
      }}>

        {/* ── PROFILE ── */}
        {active === 'profile' && (
          <ProfileSection
            profile={profile}
            loading={loading}
            onUpdate={updated => setProfile(p => ({ ...p, ...updated }))}
          />
        )}

        {/* ── SECURITY ── */}
        {active === 'security' && (
          <SecuritySection profile={profile} />
        )}

        {/* ── NOTIFICATIONS ── */}
        {active === 'notifications' && (
          <NotificationsSection
            prefs={notifs}
            onChange={setNotifs}
          />
        )}

        {/* ── TRADING ── */}
        {active === 'trading' && (
          <TradingSection
            prefs={trading}
            onChange={setTrading}
          />
        )}

        {/* ── APPEARANCE ── */}
        {active === 'appearance' && (
          <AppearanceSection
            prefs={appearance}
            onChange={setAppearance}
          />
        )}

        {/* ── AI ── */}
        {active === 'ai' && (
          <AISection
            prefs={aiPrefs}
            onChange={setAiPrefs}
          />
        )}

        {/* ── ACCOUNT MANAGEMENT ── */}
        {active === 'account' && (
          <AccountSection onLogout={onLogout} />
        )}
      </div>
    </div>
  );
};

// ── Profile Section ──────────────────────────────────

const ProfileSection = ({ profile, loading, onUpdate }) => {
  const [name,    setName]    = useState('');
  const [phone,   setPhone]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [msg,     setMsg]     = useState(null);

  useEffect(() => {
    if (profile) {
      setName(profile.full_name  || '');
      setPhone(profile.phone     || '');
    }
  }, [profile]);

  const AVATAR_COLORS = [
    '#1a56db','#057a55','#e02424','#c27803',
    '#7e3af2','#0694a2','#f05252','#31c48d',
  ];
  const [avatarColor, setAvatarColor] = useState('#1a56db');

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateProfile({ full_name: name, phone });
      onUpdate({ full_name: name, phone });
      setMsg({ type: 'success', text: 'Profile updated successfully!' });
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed to update.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  if (loading) return (
    <div style={{ color: colors.textMuted, padding: 40, textAlign: 'center' }}>
      Loading profile...
    </div>
  );

  return (
    <>
      <Card>
        <SectionTitle icon="👤" title="Profile Settings"
                      desc="Manage your personal information" />

        {/* Avatar */}
        <div style={{ marginBottom: 20 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 10,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            AVATAR COLOR
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{
              width: 56, height: 56, borderRadius: '50%',
              background: avatarColor,
              display: 'flex', alignItems: 'center',
              justifyContent: 'center', color: '#fff',
              fontSize: 22, fontWeight: 800,
              border: `3px solid ${avatarColor}40`,
            }}>
              {name?.[0]?.toUpperCase() || 'U'}
            </div>
            <div style={{ display: 'flex', gap: 8 }}>
              {AVATAR_COLORS.map(c => (
                <div
                  key={c}
                  onClick={() => setAvatarColor(c)}
                  style={{
                    width: 28, height: 28, borderRadius: '50%',
                    background: c, cursor: 'pointer',
                    border: avatarColor === c
                            ? `3px solid ${colors.text}`
                            : '3px solid transparent',
                    transition: 'border 0.15s',
                  }}
                />
              ))}
            </div>
          </div>
        </div>

        <InputField label="Full Name" value={name}
          onChange={e => setName(e.target.value)}
          placeholder="Your full name" />

        <InputField label="Email Address" value={profile?.email || ''}
          disabled hint="Email cannot be changed for security reasons." />

        <InputField label="Phone Number" value={phone}
          onChange={e => setPhone(e.target.value)}
          placeholder="+91 9876543210"
          hint="Used for SMS OTP login" />

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            AUTH PROVIDER
          </label>
          <span style={{
            fontSize: 12, padding: '4px 12px', borderRadius: 10,
            background: colors.primaryLight, color: colors.primary,
            fontWeight: 600, border: `1px solid #bfdbfe`,
          }}>
            {profile?.auth_provider === 'google' ? '🔵 Google' : '📧 Email'}
          </span>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            MEMBER SINCE
          </label>
          <p style={{ fontSize: 13, color: colors.text }}>
            {profile?.created_at
              ? new Date(profile.created_at).toLocaleDateString('en-IN', {
                  year: 'numeric', month: 'long', day: 'numeric'
                })
              : '—'}
          </p>
        </div>

        <SaveButton onClick={handleSave} loading={saving} />
        <StatusMsg msg={msg} />
      </Card>
    </>
  );
};

// ── Security Section ─────────────────────────────────

const SecuritySection = ({ profile }) => {
  const [current,  setCurrent]  = useState('');
  const [newPass,  setNewPass]  = useState('');
  const [confirm,  setConfirm]  = useState('');
  const [saving,   setSaving]   = useState(false);
  const [msg,      setMsg]      = useState(null);
  const [twoFA,    setTwoFA]    = useState(profile?.two_fa_enabled ?? true);
  const [toggling, setToggling] = useState(false);

  const handleChangePassword = async () => {
    if (newPass !== confirm) {
      setMsg({ type: 'error', text: 'Passwords do not match.' });
      return;
    }
    if (newPass.length < 8) {
      setMsg({ type: 'error', text: 'Password must be at least 8 characters.' });
      return;
    }
    setSaving(true);
    try {
      await changePassword({
        current_password: current,
        new_password:     newPass,
      });
      setMsg({ type: 'success', text: 'Password changed successfully!' });
      setCurrent(''); setNewPass(''); setConfirm('');
    } catch (e) {
      setMsg({ type: 'error', text: e.response?.data?.detail || 'Failed.' });
    } finally {
      setSaving(false);
      setTimeout(() => setMsg(null), 3000);
    }
  };

  const handleToggle2FA = async () => {
    setToggling(true);
    try {
      const res = await toggle2FA();
      setTwoFA(res.data.two_fa_enabled);
    } catch (e) {
      console.error(e);
    } finally {
      setToggling(false);
    }
  };

  return (
    <>
      <Card>
        <SectionTitle icon="🔒" title="Security Settings"
                      desc="Protect your account" />

        <Toggle
          value={twoFA}
          onChange={handleToggle2FA}
          label="Two-Factor Authentication (2FA)"
          desc="Require OTP verification after every login"
        />

        <div style={{ marginTop: 16 }}>
          <p style={{
            fontSize: 13, fontWeight: 600, color: colors.text,
            marginBottom: 14,
          }}>
            Change Password
          </p>

          <InputField
            label="Current Password" type="password"
            value={current} onChange={e => setCurrent(e.target.value)}
            placeholder="Enter current password"
          />
          <InputField
            label="New Password" type="password"
            value={newPass} onChange={e => setNewPass(e.target.value)}
            placeholder="Enter new password"
          />
          <PasswordStrength password={newPass} />
          <InputField
            label="Confirm New Password" type="password"
            value={confirm} onChange={e => setConfirm(e.target.value)}
            placeholder="Confirm new password"
          />

          <SaveButton
            onClick={handleChangePassword}
            loading={saving}
            label="Change Password"
          />
          <StatusMsg msg={msg} />
        </div>
      </Card>

      {/* Login info */}
      <Card>
        <p style={{
          fontSize: 13, fontWeight: 700, color: colors.text,
          marginBottom: 14,
        }}>
          Account Status
        </p>
        <div style={{
          display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
        }}>
          {[
            { label: 'Email Verified',
              value: profile?.is_verified ? '✓ Verified' : '✗ Not verified',
              color: profile?.is_verified ? colors.success : colors.danger },
            { label: '2FA Status',
              value: twoFA ? '✓ Enabled' : '✗ Disabled',
              color: twoFA ? colors.success : colors.warning },
          ].map((item, i) => (
            <div key={i} style={{
              padding: '12px', borderRadius: 8,
              background: colors.bgSection,
              border: `1px solid ${colors.border}`,
            }}>
              <p style={{ fontSize: 11, color: colors.textMuted, marginBottom: 4 }}>
                {item.label}
              </p>
              <p style={{ fontSize: 13, fontWeight: 700, color: item.color }}>
                {item.value}
              </p>
            </div>
          ))}
        </div>
      </Card>
    </>
  );
};

// ── Notifications Section ────────────────────────────

const NotificationsSection = ({ prefs, onChange }) => {
  const [msg, setMsg] = useState(null);

  const togglePref = (key) => {
    onChange(prev => ({ ...prev, [key]: !prev[key] }));
  };

  const handleSave = () => {
    setMsg({ type: 'success', text: 'Notification preferences saved!' });
    setTimeout(() => setMsg(null), 2000);
  };

  return (
    <Card>
      <SectionTitle icon="🔔" title="Notification Preferences"
                    desc="Choose what you want to be notified about" />

      <Toggle value={prefs.priceAlerts}
        onChange={() => togglePref('priceAlerts')}
        label="Price Alert Notifications"
        desc="Show banner when a price alert is triggered" />

      <Toggle value={prefs.botTrades}
        onChange={() => togglePref('botTrades')}
        label="AI Bot Trade Notifications"
        desc="Show notification when bot places a trade" />

      <Toggle value={prefs.marketReminder}
        onChange={() => togglePref('marketReminder')}
        label="Market Open / Close Reminder"
        desc="Remind at 9:15 AM and 3:30 PM IST" />

      <Toggle value={prefs.dailySummary}
        onChange={() => togglePref('dailySummary')}
        label="Daily Portfolio Summary"
        desc="End of day P&L summary notification" />

      <div style={{ marginTop: 16 }}>
        <SaveButton onClick={handleSave} label="Save Preferences" />
        <StatusMsg msg={msg} />
      </div>
    </Card>
  );
};

// ── Trading Preferences Section ──────────────────────

const TradingSection = ({ prefs, onChange }) => {
  const [msg, setMsg] = useState(null);

  const handleSave = () => {
    setMsg({ type: 'success', text: 'Trading preferences saved!' });
    setTimeout(() => setMsg(null), 2000);
  };

  return (
    <>
      <Card>
        <SectionTitle icon="📊" title="Trading Preferences"
                      desc="Customize your trading experience" />

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 6,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            DEFAULT TRADE QUANTITY
          </label>
          <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
            <button
              onClick={() => onChange(p => ({ ...p, defaultQty: Math.max(1, p.defaultQty - 1) }))}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: '#fff', fontSize: 18,
                cursor: 'pointer', fontWeight: 600,
                color: colors.text,
              }}
            >−</button>
            <span style={{
              fontSize: 18, fontWeight: 800, color: colors.text,
              minWidth: 40, textAlign: 'center',
            }}>
              {prefs.defaultQty}
            </span>
            <button
              onClick={() => onChange(p => ({ ...p, defaultQty: p.defaultQty + 1 }))}
              style={{
                width: 32, height: 32, borderRadius: 8,
                border: `1px solid ${colors.border}`,
                background: '#fff', fontSize: 18,
                cursor: 'pointer', fontWeight: 600,
                color: colors.text,
              }}
            >+</button>
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            RISK LEVEL
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['conservative', 'moderate', 'aggressive'].map(level => (
              <button
                key={level}
                onClick={() => onChange(p => ({ ...p, riskLevel: level }))}
                style={{
                  flex: 1, padding: '9px 0', borderRadius: 8,
                  border: `1px solid ${prefs.riskLevel === level
                            ? colors.primary : colors.border}`,
                  background: prefs.riskLevel === level
                              ? colors.primaryLight : '#fff',
                  color:      prefs.riskLevel === level
                              ? colors.primary : colors.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit',
                  textTransform: 'capitalize',
                }}
              >
                {level === 'conservative' ? '🛡️' : level === 'moderate' ? '⚖️' : '⚡'} {level}
              </button>
            ))}
          </div>
        </div>

        <div style={{ marginBottom: 16 }}>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            display: 'block', marginBottom: 8,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            DEFAULT CHART TYPE
          </label>
          <div style={{ display: 'flex', gap: 8 }}>
            {['candlestick', 'line', 'bar'].map(type => (
              <button
                key={type}
                onClick={() => onChange(p => ({ ...p, defaultChart: type }))}
                style={{
                  flex: 1, padding: '8px 0', borderRadius: 8,
                  border: `1px solid ${prefs.defaultChart === type
                            ? colors.primary : colors.border}`,
                  background: prefs.defaultChart === type
                              ? colors.primaryLight : '#fff',
                  color:      prefs.defaultChart === type
                              ? colors.primary : colors.textMuted,
                  fontSize: 12, fontWeight: 600, cursor: 'pointer',
                  fontFamily: 'inherit', textTransform: 'capitalize',
                }}
              >
                {type}
              </button>
            ))}
          </div>
        </div>

        <Toggle value={prefs.skipConfirm}
          onChange={v => onChange(p => ({ ...p, skipConfirm: v }))}
          label="Skip Order Confirmation"
          desc="Place orders instantly without confirmation popup" />

        <div style={{ marginTop: 16 }}>
          <SaveButton onClick={handleSave} label="Save Preferences" />
          <StatusMsg msg={msg} />
        </div>
      </Card>
    </>
  );
};

// ── Appearance Section ───────────────────────────────

const AppearanceSection = ({ prefs, onChange }) => {
  const [msg, setMsg] = useState(null);

  const handleSave = () => {
    setMsg({ type: 'success', text: 'Appearance settings saved!' });
    setTimeout(() => setMsg(null), 2000);
  };

  return (
    <Card>
      <SectionTitle icon="🎨" title="Display & Appearance"
                    desc="Customize how NeuroTrade looks" />

      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontSize: 12, fontWeight: 600, color: colors.textMuted,
          display: 'block', marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          THEME
        </label>
        <div style={{ display: 'flex', gap: 10 }}>
          {[
            { id: 'light', label: '☀️ Light', desc: 'Clean white' },
            { id: 'dark',  label: '🌙 Dark',  desc: 'Easy on eyes' },
          ].map(t => (
            <div
              key={t.id}
              onClick={() => onChange(p => ({ ...p, theme: t.id }))}
              style={{
                flex: 1, padding: '12px', borderRadius: 10,
                border: `1px solid ${prefs.theme === t.id
                          ? colors.primary : colors.border}`,
                background: prefs.theme === t.id
                            ? colors.primaryLight : '#fafafa',
                cursor: 'pointer', textAlign: 'center',
              }}
            >
              <p style={{ fontSize: 18, marginBottom: 4 }}>{t.label.split(' ')[0]}</p>
              <p style={{
                fontSize: 12, fontWeight: 600,
                color: prefs.theme === t.id ? colors.primary : colors.text,
              }}>
                {t.label.split(' ')[1]}
              </p>
              <p style={{ fontSize: 11, color: colors.textMuted }}>{t.desc}</p>
            </div>
          ))}
        </div>
      </div>

      <div style={{ marginBottom: 16 }}>
        <label style={{
          fontSize: 12, fontWeight: 600, color: colors.textMuted,
          display: 'block', marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          NUMBER FORMAT
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {[
            { id: 'indian',        label: '🇮🇳 Indian',        example: '1,00,000' },
            { id: 'international', label: '🌍 International', example: '100,000' },
          ].map(f => (
            <button
              key={f.id}
              onClick={() => onChange(p => ({ ...p, numberFormat: f.id }))}
              style={{
                flex: 1, padding: '10px', borderRadius: 8,
                border: `1px solid ${prefs.numberFormat === f.id
                          ? colors.primary : colors.border}`,
                background: prefs.numberFormat === f.id
                            ? colors.primaryLight : '#fff',
                cursor: 'pointer', fontFamily: 'inherit',
              }}
            >
              <p style={{
                fontSize: 12, fontWeight: 600,
                color: prefs.numberFormat === f.id
                       ? colors.primary : colors.text,
              }}>
                {f.label}
              </p>
              <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
                e.g. {f.example}
              </p>
            </button>
          ))}
        </div>
      </div>

      <Toggle value={prefs.compactNumbers}
        onChange={v => onChange(p => ({ ...p, compactNumbers: v }))}
        label="Compact Number Display"
        desc="Show 1.2L instead of 1,20,000" />

      <div style={{ marginTop: 16 }}>
        <SaveButton onClick={handleSave} label="Save Appearance" />
        <StatusMsg msg={msg} />
      </div>
    </Card>
  );
};

// ── AI Settings Section ──────────────────────────────

const AISection = ({ prefs, onChange }) => {
  const [msg, setMsg] = useState(null);

  const handleSave = () => {
    setMsg({ type: 'success', text: 'AI preferences saved!' });
    setTimeout(() => setMsg(null), 2000);
  };

  const SliderField = ({ label, value, min, max, step = 1,
                         suffix = '', onChange: onCh, desc }) => (
    <div style={{ marginBottom: 20 }}>
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        marginBottom: 6,
      }}>
        <div>
          <label style={{
            fontSize: 12, fontWeight: 600, color: colors.textMuted,
            textTransform: 'uppercase', letterSpacing: '0.04em',
          }}>
            {label}
          </label>
          {desc && (
            <p style={{ fontSize: 11, color: colors.textLight, marginTop: 1 }}>
              {desc}
            </p>
          )}
        </div>
        <span style={{
          fontSize: 15, fontWeight: 800, color: colors.primary,
        }}>
          {value}{suffix}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={step}
        value={value} onChange={e => onCh(Number(e.target.value))}
        style={{ width: '100%', accentColor: colors.primary }}
      />
      <div style={{
        display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: colors.textLight, marginTop: 3,
      }}>
        <span>{min}{suffix}</span>
        <span>{max}{suffix}</span>
      </div>
    </div>
  );

  return (
    <Card>
      <SectionTitle icon="🤖" title="AI & Model Settings"
                    desc="Fine-tune how the AI makes decisions" />

      <SliderField
        label="Minimum Confidence for BUY Signal"
        desc="Only show BUY when confidence is above this threshold"
        value={prefs.confidenceThreshold} min={40} max={90} suffix="%"
        onChange={v => onChange(p => ({ ...p, confidenceThreshold: v }))}
      />

      <SliderField
        label="Sentiment Weight in Confidence Score"
        desc="How much news sentiment affects the final score"
        value={prefs.sentimentWeight} min={0} max={80} suffix="%"
        onChange={v => onChange(p => ({ ...p, sentimentWeight: v }))}
      />

      <div style={{ marginBottom: 20 }}>
        <label style={{
          fontSize: 12, fontWeight: 600, color: colors.textMuted,
          display: 'block', marginBottom: 8,
          textTransform: 'uppercase', letterSpacing: '0.04em',
        }}>
          DEFAULT INDICATOR TAB
        </label>
        <div style={{ display: 'flex', gap: 8 }}>
          {['rsi', 'macd', 'bollinger'].map(ind => (
            <button
              key={ind}
              onClick={() => onChange(p => ({ ...p, defaultIndicator: ind }))}
              style={{
                flex: 1, padding: '8px 0', borderRadius: 8,
                border: `1px solid ${prefs.defaultIndicator === ind
                          ? colors.primary : colors.border}`,
                background: prefs.defaultIndicator === ind
                            ? colors.primaryLight : '#fff',
                color:      prefs.defaultIndicator === ind
                            ? colors.primary : colors.textMuted,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit', textTransform: 'uppercase',
              }}
            >
              {ind}
            </button>
          ))}
        </div>
      </div>

      <Toggle value={prefs.showShap}
        onChange={v => onChange(p => ({ ...p, showShap: v }))}
        label="Show SHAP Explanations"
        desc="Display AI feature importance charts on predictions" />

      <div style={{ marginTop: 16 }}>
        <SaveButton onClick={handleSave} label="Save AI Settings" />
        <StatusMsg msg={msg} />
      </div>
    </Card>
  );
};

// ── Account Management Section ───────────────────────

const AccountSection = ({ onLogout }) => {
  const [confirm,   setConfirm]   = useState('');
  const [loading,   setLoading]   = useState({});
  const [msg,       setMsg]       = useState(null);
  const [showReset, setShowReset] = useState(false);

  const showMsg = (type, text) => {
    setMsg({ type, text });
    setTimeout(() => setMsg(null), 4000);
  };

  const handleReset = async () => {
    if (confirm !== 'RESET') {
      showMsg('error', 'Type RESET to confirm.');
      return;
    }
    setLoading(l => ({ ...l, reset: true }));
    try {
      await resetPortfolio();
      showMsg('success', 'Portfolio reset to ₹1,00,000!');
      setConfirm('');
      setShowReset(false);
    } catch (e) {
      showMsg('error', 'Reset failed.');
    } finally {
      setLoading(l => ({ ...l, reset: false }));
    }
  };

  const handleClearWatchlist = async () => {
    setLoading(l => ({ ...l, watchlist: true }));
    try {
      await clearWatchlist();
      showMsg('success', 'Watchlist cleared.');
    } catch (e) {
      showMsg('error', 'Failed to clear watchlist.');
    } finally {
      setLoading(l => ({ ...l, watchlist: false }));
    }
  };

  const handleClearAlerts = async () => {
    setLoading(l => ({ ...l, alerts: true }));
    try {
      await clearAlerts();
      showMsg('success', 'All alerts cleared.');
    } catch (e) {
      showMsg('error', 'Failed to clear alerts.');
    } finally {
      setLoading(l => ({ ...l, alerts: false }));
    }
  };

  return (
    <>
      {/* Quick actions */}
      <Card>
        <SectionTitle icon="⚙️" title="Account Management"
                      desc="Manage your account data and preferences" />

        <div style={{ display: 'flex', flexDirection: 'column', gap: 12 }}>
          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '14px 16px',
            borderRadius: 10, background: '#f9fafb',
            border: `1px solid ${colors.border}`,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                Clear Watchlist
              </p>
              <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                Remove all stocks from your watchlist
              </p>
            </div>
            <button
              onClick={handleClearWatchlist}
              disabled={loading.watchlist}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${colors.warning}`,
                background: colors.warningLight, color: colors.warning,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading.watchlist ? 'Clearing...' : 'Clear Watchlist'}
            </button>
          </div>

          <div style={{
            display: 'flex', justifyContent: 'space-between',
            alignItems: 'center', padding: '14px 16px',
            borderRadius: 10, background: '#f9fafb',
            border: `1px solid ${colors.border}`,
          }}>
            <div>
              <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                Clear All Alerts
              </p>
              <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
                Delete all your price alerts
              </p>
            </div>
            <button
              onClick={handleClearAlerts}
              disabled={loading.alerts}
              style={{
                padding: '8px 16px', borderRadius: 8,
                border: `1px solid ${colors.warning}`,
                background: colors.warningLight, color: colors.warning,
                fontSize: 12, fontWeight: 600, cursor: 'pointer',
                fontFamily: 'inherit',
              }}
            >
              {loading.alerts ? 'Clearing...' : 'Clear Alerts'}
            </button>
          </div>
        </div>

        <StatusMsg msg={msg} />
      </Card>

      {/* Reset portfolio */}
      <Card style={{ border: `1px solid ${colors.dangerBorder}` }}>
        <div style={{
          display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16,
        }}>
          <div style={{
            width: 36, height: 36, borderRadius: 8,
            background: colors.dangerLight,
            display: 'flex', alignItems: 'center',
            justifyContent: 'center', fontSize: 16,
          }}>
            🔄
          </div>
          <div>
            <h3 style={{ fontSize: 14, fontWeight: 700, color: colors.danger }}>
              Reset Virtual Portfolio
            </h3>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 1 }}>
              This will clear all your trades and reset balance to ₹1,00,000
            </p>
          </div>
        </div>

        {!showReset ? (
          <button
            onClick={() => setShowReset(true)}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: `1px solid ${colors.danger}`,
              background: colors.dangerLight, color: colors.danger,
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Reset Portfolio
          </button>
        ) : (
          <div style={{
            padding: '16px', borderRadius: 10,
            background: colors.dangerLight,
            border: `1px solid ${colors.dangerBorder}`,
          }}>
            <p style={{
              fontSize: 13, color: colors.danger,
              fontWeight: 600, marginBottom: 10,
            }}>
              Type <strong>RESET</strong> to confirm:
            </p>
            <div style={{ display: 'flex', gap: 10 }}>
              <input
                value={confirm}
                onChange={e => setConfirm(e.target.value.toUpperCase())}
                placeholder="Type RESET"
                style={{
                  flex: 1, padding: '9px 12px',
                  border: `1px solid ${colors.dangerBorder}`,
                  borderRadius: 8, fontSize: 14, fontWeight: 700,
                  color: colors.danger, background: '#fff',
                  outline: 'none', fontFamily: 'inherit',
                  letterSpacing: 2,
                }}
              />
              <button
                onClick={handleReset}
                disabled={loading.reset || confirm !== 'RESET'}
                style={{
                  padding: '9px 20px', borderRadius: 8,
                  border: 'none', background: colors.danger,
                  color: '#fff', fontSize: 13, fontWeight: 700,
                  cursor: confirm === 'RESET' ? 'pointer' : 'not-allowed',
                  opacity: confirm === 'RESET' ? 1 : 0.5,
                  fontFamily: 'inherit',
                }}
              >
                {loading.reset ? 'Resetting...' : 'Confirm Reset'}
              </button>
              <button
                onClick={() => { setShowReset(false); setConfirm(''); }}
                style={{
                  padding: '9px 16px', borderRadius: 8,
                  border: `1px solid ${colors.border}`,
                  background: '#fff', color: colors.textMuted,
                  fontSize: 13, cursor: 'pointer',
                  fontFamily: 'inherit',
                }}
              >
                Cancel
              </button>
            </div>
          </div>
        )}
      </Card>

      {/* Sign out */}
      <Card>
        <div style={{
          display: 'flex', justifyContent: 'space-between',
          alignItems: 'center',
        }}>
          <div>
            <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
              Sign Out
            </p>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 2 }}>
              Sign out from this device
            </p>
          </div>
          <button
            onClick={onLogout}
            style={{
              padding: '9px 20px', borderRadius: 8,
              border: `1px solid ${colors.border}`,
              background: '#fff', color: colors.textMuted,
              fontSize: 13, fontWeight: 600, cursor: 'pointer',
              fontFamily: 'inherit',
            }}
          >
            Sign Out
          </button>
        </div>
      </Card>
    </>
  );
};

export default SettingsPage;