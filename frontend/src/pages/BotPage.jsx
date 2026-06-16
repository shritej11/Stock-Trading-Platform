// BotPage.jsx
import React, { useState, useEffect, useCallback } from 'react';
import {
  fetchBotConfig, updateBotConfig, toggleBot,
  fetchBotTrades, fetchBotLogs, runBotNow,
} from '../services/api';
import { colors, shadow, inputStyle } from '../styles/theme';

const Card = ({ title, children, style }) => (
  <div style={{
    background: '#fff', borderRadius: 12,
    border: `1px solid ${colors.border}`,
    padding: '18px 20px', boxShadow: shadow.sm,
    ...style,
  }}>
    {title && (
      <p style={{
        fontSize: 12, fontWeight: 700, color: colors.textMuted,
        textTransform: 'uppercase', letterSpacing: '0.06em',
        marginBottom: 16,
      }}>
        {title}
      </p>
    )}
    {children}
  </div>
);

const Toggle = ({ value, onChange, label }) => (
  <label style={{
    display: 'flex', alignItems: 'center',
    gap: 10, cursor: 'pointer',
  }}>
    <div
      onClick={() => onChange(!value)}
      style={{
        width: 44, height: 24, borderRadius: 12,
        background: value ? colors.success : colors.border,
        position: 'relative', transition: 'background 0.2s',
        cursor: 'pointer', flexShrink: 0,
      }}
    >
      <div style={{
        width: 18, height: 18, borderRadius: '50%',
        background: '#fff', position: 'absolute',
        top: 3, left: value ? 23 : 3,
        transition: 'left 0.2s',
        boxShadow: '0 1px 3px rgba(0,0,0,0.2)',
      }} />
    </div>
    <span style={{ fontSize: 13, color: colors.text, fontWeight: 500 }}>
      {label}
    </span>
  </label>
);

const RuleInput = ({ label, value, onChange, min, max, step = 1, suffix = '' }) => (
  <div style={{ marginBottom: 14 }}>
    <div style={{
      display: 'flex', justifyContent: 'space-between',
      marginBottom: 6,
    }}>
      <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted }}>
        {label}
      </label>
      <span style={{
        fontSize: 12, fontWeight: 700, color: colors.primary,
      }}>
        {value}{suffix}
      </span>
    </div>
    <input
      type="range" min={min} max={max} step={step}
      value={value}
      onChange={e => onChange(Number(e.target.value))}
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

const PRESET_STRATEGIES = [
  {
    id:    'conservative',
    label: 'Conservative',
    desc:  'Low risk — only strong signals',
    icon:  '🛡️',
    color: colors.success,
    rules: {
      buy_confidence_min:  75,
      buy_rsi_max:         30,
      sell_confidence_max: 30,
      sell_rsi_min:        75,
      sell_profit_target:  8,
      sell_stop_loss:      2,
      max_open_positions:  3,
      trade_amount:        1500,
    },
  },
  {
    id:    'balanced',
    label: 'Balanced',
    desc:  'Medium risk — balanced approach',
    icon:  '⚖️',
    color: colors.primary,
    rules: {
      buy_confidence_min:  65,
      buy_rsi_max:         40,
      sell_confidence_max: 35,
      sell_rsi_min:        70,
      sell_profit_target:  5,
      sell_stop_loss:      3,
      max_open_positions:  5,
      trade_amount:        2000,
    },
  },
  {
    id:    'aggressive',
    label: 'Aggressive',
    desc:  'High risk — more trades, bigger moves',
    icon:  '⚡',
    color: colors.danger,
    rules: {
      buy_confidence_min:  55,
      buy_rsi_max:         45,
      sell_confidence_max: 40,
      sell_rsi_min:        65,
      sell_profit_target:  3,
      sell_stop_loss:      5,
      max_open_positions:  8,
      trade_amount:        3000,
    },
  },
];

const BotPage = () => {
  const [config,   setConfig]   = useState(null);
  const [trades,   setTrades]   = useState([]);
  const [logs,     setLogs]     = useState([]);
  const [loading,  setLoading]  = useState(true);
  const [saving,   setSaving]   = useState(false);
  const [running,  setRunning]  = useState(false);
  const [activeTab,setActiveTab]= useState('config');
  const [message,  setMessage]  = useState(null);

  const load = useCallback(() => {
    Promise.all([fetchBotConfig(), fetchBotTrades(), fetchBotLogs()])
      .then(([cfgR, trdR, logR]) => {
        setConfig(cfgR.data);
        setTrades(trdR.data.trades);
        setLogs(logR.data.logs);
        setLoading(false);
      })
      .catch(console.error);
  }, []);

  useEffect(() => {
    load();
    const interval = setInterval(load, 15000);
    return () => clearInterval(interval);
  }, [load]);

  const handleToggle = async () => {
    try {
      const res = await toggleBot();
      setConfig(prev => ({ ...prev, is_active: res.data.is_active }));
      setMessage({
        type: 'success',
        text: res.data.message,
      });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to toggle bot.' });
    }
  };

  const handleSave = async () => {
    setSaving(true);
    try {
      await updateBotConfig(config);
      setMessage({ type: 'success', text: 'Settings saved!' });
      setTimeout(() => setMessage(null), 3000);
    } catch (e) {
      setMessage({ type: 'error', text: 'Failed to save.' });
    } finally {
      setSaving(false); }
  };

  const handlePreset = (preset) => {
    setConfig(prev => ({ ...prev, ...preset.rules, strategy: preset.id }));
    setMessage({ type: 'info', text: `${preset.label} strategy loaded!` });
    setTimeout(() => setMessage(null), 2000);
  };

  const handleRunNow = async () => {
    setRunning(true);
    try {
      const res = await runBotNow();
      setMessage({
        type: 'success',
        text: `Bot ran! ${res.data.recent_trades.length} trade(s) executed.`,
      });
      load();
    } catch (e) {
      setMessage({ type: 'error', text: 'Bot run failed.' });
    } finally {
      setRunning(false);
      setTimeout(() => setMessage(null), 4000);
    }
  };

  if (loading) return (
    <div style={{ padding: 60, textAlign: 'center', color: colors.textMuted }}>
      Loading bot...
    </div>
  );

  const isActive = config?.is_active;

  return (
    <div style={{ maxWidth: 1000, margin: '0 auto' }}>

      {/* Page header */}
      <div style={{
        display:        'flex',
        justifyContent: 'space-between',
        alignItems:     'center',
        marginBottom:   24,
      }}>
        <div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>
            AI Trading Bot
          </h2>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            Automatically executes trades based on AI signals and your rules
          </p>
        </div>

        {/* Bot status + controls */}
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <button
            onClick={handleRunNow}
            disabled={running}
            style={{
              padding:    '8px 16px', borderRadius: 8,
              border:     `1px solid ${colors.border}`,
              background: '#fff', color: colors.textMuted,
              fontSize:   12, cursor: 'pointer', fontWeight: 500,
            }}
          >
            {running ? 'Running...' : 'Run Now'}
          </button>
          <button
            onClick={handleToggle}
            style={{
              padding:    '10px 24px', borderRadius: 8,
              border:     'none', cursor: 'pointer',
              fontWeight: 700, fontSize: 13,
              background: isActive ? colors.danger : colors.success,
              color:      '#fff',
              boxShadow:  `0 2px 8px ${isActive
                            ? 'rgba(224,36,36,0.3)'
                            : 'rgba(5,122,85,0.3)'}`,
            }}
          >
            {isActive ? 'Stop Bot' : 'Start Bot'}
          </button>
        </div>
      </div>

      {/* Status banner */}
      <div style={{
        padding:      '12px 16px',
        borderRadius: 10,
        background:   isActive ? colors.successLight : colors.bgSection,
        border:       `1px solid ${isActive
                        ? colors.successBorder : colors.border}`,
        marginBottom: 20,
        display:      'flex',
        alignItems:   'center',
        gap:          12,
      }}>
        <div style={{
          width: 10, height: 10, borderRadius: '50%',
          background: isActive ? colors.success : colors.textLight,
          flexShrink: 0,
        }} />
        <div>
          <p style={{
            fontSize: 13, fontWeight: 600,
            color:    isActive ? colors.success : colors.textMuted,
          }}>
            {isActive ? 'Bot is ACTIVE — trading every 30 seconds'
                      : 'Bot is STOPPED — configure rules and start'}
          </p>
          <p style={{ fontSize: 11, color: colors.textMuted, marginTop: 2 }}>
            Strategy: {config?.strategy} ·
            Max positions: {config?.max_open_positions} ·
            Trade amount: ₹{config?.trade_amount}
          </p>
        </div>
      </div>

      {/* Message */}
      {message && (
        <div style={{
          padding: '10px 16px', borderRadius: 8, marginBottom: 16,
          fontSize: 13, fontWeight: 500,
          background: message.type === 'success' ? colors.successLight
                    : message.type === 'error'   ? colors.dangerLight
                    : colors.primaryLight,
          color:      message.type === 'success' ? colors.success
                    : message.type === 'error'   ? colors.danger
                    : colors.primary,
          border:     `1px solid ${
                        message.type === 'success' ? colors.successBorder
                      : message.type === 'error'   ? colors.dangerBorder
                      : '#bfdbfe'}`,
        }}>
          {message.text}
        </div>
      )}

      {/* Tabs */}
      <div style={{
        display: 'flex', gap: 4, marginBottom: 20,
        background: colors.bgSection, borderRadius: 10,
        padding: 3, width: 'fit-content',
        border: `1px solid ${colors.border}`,
      }}>
        {[
          { id: 'config', label: 'Configure' },
          { id: 'trades', label: `Trades (${trades.length})` },
          { id: 'logs',   label: 'Bot Logs' },
        ].map(tab => (
          <button key={tab.id} onClick={() => setActiveTab(tab.id)} style={{
            padding:    '7px 18px', borderRadius: 7,
            border:     'none', cursor: 'pointer',
            fontSize:   13, fontWeight: 600,
            background: activeTab === tab.id ? '#fff' : 'transparent',
            color:      activeTab === tab.id ? colors.primary : colors.textMuted,
            boxShadow:  activeTab === tab.id ? shadow.xs : 'none',
          }}>
            {tab.label}
          </button>
        ))}
      </div>

      {/* CONFIG TAB */}
      {activeTab === 'config' && (
        <div style={{
          display: 'grid',
          gridTemplateColumns: '1fr 1fr',
          gap: 16,
        }}>

          {/* Preset strategies */}
          <Card title="Quick Presets" style={{ gridColumn: '1 / -1' }}>
            <div style={{
              display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 12,
            }}>
              {PRESET_STRATEGIES.map(preset => (
                <div
                  key={preset.id}
                  onClick={() => handlePreset(preset)}
                  style={{
                    padding:    '14px', borderRadius: 10,
                    border:     `1px solid ${
                                  config?.strategy === preset.id
                                  ? preset.color : colors.border}`,
                    cursor:     'pointer',
                    background: config?.strategy === preset.id
                                ? preset.color + '10' : '#fafafa',
                    transition: 'all 0.15s',
                  }}
                >
                  <p style={{ fontSize: 22, marginBottom: 6 }}>{preset.icon}</p>
                  <p style={{
                    fontSize: 14, fontWeight: 700, color: colors.text,
                    marginBottom: 4,
                  }}>
                    {preset.label}
                  </p>
                  <p style={{ fontSize: 12, color: colors.textMuted }}>
                    {preset.desc}
                  </p>
                  {config?.strategy === preset.id && (
                    <p style={{
                      fontSize: 11, color: preset.color,
                      fontWeight: 700, marginTop: 6,
                    }}>
                      ✓ Active
                    </p>
                  )}
                </div>
              ))}
            </div>
          </Card>

          {/* BUY rules */}
          <Card title="Buy Rules">
            <RuleInput
              label="Min confidence to BUY"
              value={config?.buy_confidence_min}
              onChange={v => setConfig(p => ({...p, buy_confidence_min: v}))}
              min={40} max={90} suffix="%"
            />
            <RuleInput
              label="Max RSI to BUY (oversold)"
              value={config?.buy_rsi_max}
              onChange={v => setConfig(p => ({...p, buy_rsi_max: v}))}
              min={20} max={60} suffix=""
            />
            <RuleInput
              label="Trade amount per BUY"
              value={config?.trade_amount}
              onChange={v => setConfig(p => ({...p, trade_amount: v}))}
              min={500} max={10000} step={500} suffix="₹"
            />
            <RuleInput
              label="Max positions open"
              value={config?.max_open_positions}
              onChange={v => setConfig(p => ({...p, max_open_positions: v}))}
              min={1} max={15} suffix=""
            />
          </Card>

          {/* SELL rules */}
          <Card title="Sell Rules">
            <RuleInput
              label="Max confidence to SELL"
              value={config?.sell_confidence_max}
              onChange={v => setConfig(p => ({...p, sell_confidence_max: v}))}
              min={10} max={60} suffix="%"
            />
            <RuleInput
              label="Min RSI to SELL (overbought)"
              value={config?.sell_rsi_min}
              onChange={v => setConfig(p => ({...p, sell_rsi_min: v}))}
              min={60} max={90} suffix=""
            />
            <RuleInput
              label="Profit target"
              value={config?.sell_profit_target}
              onChange={v => setConfig(p => ({...p, sell_profit_target: v}))}
              min={1} max={20} suffix="%"
            />
            <RuleInput
              label="Stop loss"
              value={config?.sell_stop_loss}
              onChange={v => setConfig(p => ({...p, sell_stop_loss: v}))}
              min={1} max={15} suffix="%"
            />
          </Card>

          {/* Save button */}
          <div style={{ gridColumn: '1 / -1' }}>
            <button
              onClick={handleSave}
              disabled={saving}
              style={{
                padding:    '12px 32px',
                background: colors.primary,
                border:     'none', borderRadius: 8,
                color:      '#fff', fontSize: 14,
                fontWeight: 700, cursor: 'pointer',
                opacity:    saving ? 0.6 : 1,
              }}
            >
              {saving ? 'Saving...' : 'Save Settings'}
            </button>
          </div>
        </div>
      )}

      {/* TRADES TAB */}
      {activeTab === 'trades' && (
        <Card title="Bot Trade History">
          {trades.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 0',
              color: colors.textMuted, fontSize: 13,
            }}>
              No trades yet. Start the bot or click Run Now.
            </div>
          ) : (
            <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
              {trades.map((t, i) => (
                <div key={i} style={{
                  padding:      '12px 14px',
                  borderRadius: 8,
                  border:       `1px solid ${colors.border}`,
                  background:   '#fafafa',
                }}>
                  <div style={{
                    display:        'flex',
                    justifyContent: 'space-between',
                    alignItems:     'flex-start',
                    marginBottom:   6,
                  }}>
                    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
                      <span style={{
                        fontSize:   11, fontWeight: 700,
                        padding:    '2px 8px', borderRadius: 6,
                        background: t.action === 'BUY'
                                    ? colors.successLight : colors.dangerLight,
                        color:      t.action === 'BUY'
                                    ? colors.success : colors.danger,
                        border:     `1px solid ${t.action === 'BUY'
                                      ? colors.successBorder
                                      : colors.dangerBorder}`,
                      }}>
                        {t.action}
                      </span>
                      <p style={{
                        fontSize: 14, fontWeight: 700, color: colors.text,
                      }}>
                        {t.quantity} × {t.symbol.replace('.NS','')}
                      </p>
                      <p style={{ fontSize: 13, color: colors.textMuted }}>
                        @ ₹{t.price}
                      </p>
                    </div>
                    <p style={{
                      fontSize: 13, fontWeight: 700, color: colors.text,
                    }}>
                      ₹{t.total?.toLocaleString()}
                    </p>
                  </div>

                  {/* Reason */}
                  <div style={{
                    padding:      '6px 10px',
                    background:   colors.primaryLight,
                    borderRadius: 6,
                    marginBottom: 6,
                  }}>
                    <p style={{ fontSize: 11, color: colors.primary }}>
                      Reason: {t.reason}
                    </p>
                  </div>

                  {/* Stats row */}
                  <div style={{
                    display: 'flex', gap: 16, fontSize: 11,
                    color: colors.textMuted,
                  }}>
                    {t.confidence && (
                      <span>Confidence: {t.confidence}%</span>
                    )}
                    {t.rsi && (
                      <span>RSI: {t.rsi}</span>
                    )}
                    <span>{new Date(t.traded_at).toLocaleString()}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      )}

      {/* LOGS TAB */}
      {activeTab === 'logs' && (
        <Card title="Bot Activity Logs">
          {logs.length === 0 ? (
            <div style={{
              textAlign: 'center', padding: '40px 0',
              color: colors.textMuted, fontSize: 13,
            }}>
              No logs yet.
            </div>
          ) : (
            <div style={{
              fontFamily:  'monospace',
              fontSize:    12,
              background:  '#0f1117',
              borderRadius: 8,
              padding:     16,
              maxHeight:   400,
              overflowY:   'auto',
            }}>
              {logs.map((log, i) => (
                <div key={i} style={{
                  padding:      '3px 0',
                  borderBottom: i < logs.length - 1
                                ? '1px solid #1e2130' : 'none',
                  color:        log.level === 'WARN'  ? '#f59e0b'
                              : log.level === 'ERROR' ? '#ef4444'
                              : log.level === 'DEBUG' ? '#6b7280'
                              : '#22c55e',
                }}>
                  <span style={{ color: '#475569', marginRight: 8 }}>
                    {new Date(log.created_at).toLocaleTimeString()}
                  </span>
                  <span style={{
                    marginRight: 8, fontWeight: 700,
                    color:      log.level === 'WARN'  ? '#f59e0b'
                              : log.level === 'ERROR' ? '#ef4444'
                              : log.level === 'DEBUG' ? '#4b5563'
                              : '#16a34a',
                  }}>
                    [{log.level}]
                  </span>
                  {log.message}
                </div>
              ))}
            </div>
          )}
        </Card>
      )}
    </div>
  );
};

export default BotPage;