// SupportPages.jsx
import React, { useState } from 'react';
import { colors, card, shadow } from '../styles/theme';

const Input = ({ label, type='text', placeholder, value, onChange, rows }) => (
  <div style={{ marginBottom: 14 }}>
    <label style={{ fontSize: 12, fontWeight: 600, color: colors.textMuted,
                    display: 'block', marginBottom: 5 }}>
      {label}
    </label>
    {rows ? (
      <textarea
        rows={rows} placeholder={placeholder} value={value}
        onChange={onChange}
        style={{
          width: '100%', padding: '10px 12px',
          border: `1px solid ${colors.border}`, borderRadius: 8,
          fontSize: 13, color: colors.text,
          background: '#fafafa', resize: 'vertical',
          fontFamily: 'inherit',
        }}
      />
    ) : (
      <input
        type={type} placeholder={placeholder} value={value}
        onChange={onChange}
        style={{
          width: '100%', padding: '10px 12px',
          border: `1px solid ${colors.border}`, borderRadius: 8,
          fontSize: 13, color: colors.text, background: '#fafafa',
        }}
      />
    )}
  </div>
);

// ── Help Page ────────────────────────────────────────
export const HelpPage = () => {
  const faqs = [
    { q: 'What is NeuroTrade AI?',
      a: 'NeuroTrade AI is an AI-powered stock intelligence platform that uses LSTM neural networks and FinBERT sentiment analysis to predict stock prices and provide trading signals.' },
    { q: 'How is the confidence score calculated?',
      a: 'The confidence score combines 60% weight on the LSTM price prediction signal and 40% on the FinBERT news sentiment score, giving a 0-100 composite rating.' },
    { q: 'What is paper trading?',
      a: 'Paper trading is simulated trading with virtual money (Rs.1,00,000 starting balance). You can practice buying and selling stocks without any real financial risk.' },
    { q: 'What do RSI, MACD, and Bollinger Bands mean?',
      a: 'RSI measures momentum (above 70 = overbought, below 30 = oversold). MACD shows trend direction. Bollinger Bands show price volatility and potential breakout zones.' },
    { q: 'How do price alerts work?',
      a: 'You can set alerts for when a stock goes above or below a target price. The alert will be marked as triggered the next time the system checks prices.' },
    { q: 'Is my data safe?',
      a: 'All data is stored locally on your machine in PostgreSQL. No trading data or personal information is sent to external servers.' },
  ];

  const [open, setOpen] = useState(null);

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text,
                   marginBottom: 4 }}>
        Help Center
      </h2>
      <p style={{ color: colors.textMuted, marginBottom: 24, fontSize: 13 }}>
        Find answers to common questions
      </p>

      {/* Quick links */}
      <div style={{
        display: 'grid', gridTemplateColumns: 'repeat(3,1fr)',
        gap: 12, marginBottom: 24,
      }}>
        {[
          { title: 'Getting Started', icon: '🚀', desc: 'Set up your account' },
          { title: 'Trading Guide',   icon: '📈', desc: 'Learn to trade' },
          { title: 'AI Models',       icon: '🤖', desc: 'How predictions work' },
        ].map((item, i) => (
          <div key={i} style={{
            ...card, textAlign: 'center', cursor: 'pointer',
          }}>
            <p style={{ fontSize: 28, marginBottom: 8 }}>{item.icon}</p>
            <p style={{ fontSize: 14, fontWeight: 600, color: colors.text }}>
              {item.title}
            </p>
            <p style={{ fontSize: 12, color: colors.textMuted, marginTop: 4 }}>
              {item.desc}
            </p>
          </div>
        ))}
      </div>

      {/* FAQs */}
      <div style={{ ...card }}>
        <p style={{ fontSize: 15, fontWeight: 700, color: colors.text,
                    marginBottom: 16 }}>
          Frequently Asked Questions
        </p>
        {faqs.map((faq, i) => (
          <div key={i} style={{
            borderBottom: i < faqs.length-1 ? `1px solid ${colors.border}` : 'none',
          }}>
            <div
              onClick={() => setOpen(open === i ? null : i)}
              style={{
                padding:  '14px 0', cursor: 'pointer',
                display:  'flex', justifyContent: 'space-between',
                alignItems: 'center',
              }}
            >
              <p style={{ fontSize: 13, fontWeight: 600, color: colors.text }}>
                {faq.q}
              </p>
              <span style={{ color: colors.textMuted, fontSize: 18 }}>
                {open === i ? '−' : '+'}
              </span>
            </div>
            {open === i && (
              <p style={{
                fontSize: 13, color: colors.textMuted,
                lineHeight: 1.6, paddingBottom: 14,
              }}>
                {faq.a}
              </p>
            )}
          </div>
        ))}
      </div>
    </div>
  );
};

// ── Support Page ─────────────────────────────────────
export const SupportPage = () => (
  <div>
    <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text,
                 marginBottom: 4 }}>
      Support
    </h2>
    <p style={{ color: colors.textMuted, marginBottom: 24, fontSize: 13 }}>
      We are here to help you
    </p>
    <div style={{
      display: 'grid', gridTemplateColumns: 'repeat(3,1fr)', gap: 16,
    }}>
      {[
        { icon: '📧', title: 'Email Support',
          desc: 'support@neurotrade.ai', sub: 'Response within 24 hours' },
        { icon: '💬', title: 'Live Chat',
          desc: 'Chat with our team', sub: 'Available 9AM - 6PM IST' },
        { icon: '📞', title: 'Phone Support',
          desc: '+91 9309944232', sub: 'Mon-Fri, 9AM - 6PM IST' },
      ].map((item, i) => (
        <div key={i} style={{ ...card, textAlign: 'center' }}>
          <p style={{ fontSize: 32, marginBottom: 10 }}>{item.icon}</p>
          <p style={{ fontSize: 14, fontWeight: 700, color: colors.text,
                      marginBottom: 4 }}>
            {item.title}
          </p>
          <p style={{ fontSize: 13, color: colors.primary, fontWeight: 500,
                      marginBottom: 4 }}>
            {item.desc}
          </p>
          <p style={{ fontSize: 12, color: colors.textMuted }}>{item.sub}</p>
        </div>
      ))}
    </div>
  </div>
);

// ── Contact Page ─────────────────────────────────────
export const ContactPage = () => {
  const [form, setForm] = useState({
    name: '', email: '', subject: '', message: ''
  });
  const [sent, setSent] = useState(false);

  return (
    <div style={{ maxWidth: 600 }}>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text,
                   marginBottom: 4 }}>
        Contact Us
      </h2>
      <p style={{ color: colors.textMuted, marginBottom: 24, fontSize: 13 }}>
        Send us a message and we'll get back to you
      </p>
      {sent ? (
        <div style={{
          ...card, textAlign: 'center', padding: 40,
          background: '#f0fdf4', border: `1px solid #bbf7d0`,
        }}>
          <p style={{ fontSize: 32, marginBottom: 12 }}>✅</p>
          <p style={{ fontSize: 16, fontWeight: 700, color: colors.success }}>
            Message Sent!
          </p>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 6 }}>
            We'll get back to you within 24 hours.
          </p>
        </div>
      ) : (
        <div style={{ ...card }}>
          <Input label="Your Name" placeholder="John Doe"
            value={form.name}
            onChange={e => setForm({...form, name: e.target.value})} />
          <Input label="Email Address" type="email"
            placeholder="john@example.com"
            value={form.email}
            onChange={e => setForm({...form, email: e.target.value})} />
          <Input label="Subject" placeholder="How can we help?"
            value={form.subject}
            onChange={e => setForm({...form, subject: e.target.value})} />
          <Input label="Message" placeholder="Describe your issue..."
            rows={5} value={form.message}
            onChange={e => setForm({...form, message: e.target.value})} />
          <button
            onClick={() => setSent(true)}
            style={{
              width: '100%', padding: '12px 0',
              background: colors.primary, border: 'none',
              borderRadius: 8, color: '#fff',
              fontSize: 14, fontWeight: 700, cursor: 'pointer',
            }}
          >
            Send Message
          </button>
        </div>
      )}
    </div>
  );
};

// ── Tickets Page ─────────────────────────────────────
export const TicketsPage = () => {
  const [form, setForm]       = useState({
    title: '', type: 'bug', priority: 'medium', description: ''
  });
  const [tickets, setTickets] = useState([
    { id: 'TKT-001', title: 'Chart not loading',
      type: 'bug', priority: 'high',
      status: 'open', created: '2026-04-01' },
    { id: 'TKT-002', title: 'Request for more stocks',
      type: 'feature', priority: 'low',
      status: 'in_review', created: '2026-04-02' },
  ]);
  const [submitted, setSubmitted] = useState(false);

  const handleSubmit = () => {
    const newTicket = {
      id:       `TKT-00${tickets.length + 1}`,
      title:    form.title,
      type:     form.type,
      priority: form.priority,
      status:   'open',
      created:  new Date().toISOString().slice(0, 10),
    };
    setTickets([newTicket, ...tickets]);
    setSubmitted(true);
    setForm({ title: '', type: 'bug', priority: 'medium', description: '' });
    setTimeout(() => setSubmitted(false), 3000);
  };

  const statusColor = (s) =>
    s === 'open'      ? { bg: '#fef2f2', color: colors.danger }
  : s === 'in_review' ? { bg: '#fffbeb', color: colors.warning }
  :                     { bg: '#f0fdf4', color: colors.success };

  return (
    <div>
      <h2 style={{ fontSize: 20, fontWeight: 700, color: colors.text,
                   marginBottom: 4 }}>
        Raise a Ticket
      </h2>
      <p style={{ color: colors.textMuted, marginBottom: 24, fontSize: 13 }}>
        Report issues or request features
      </p>

      <div style={{
        display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20,
      }}>

        {/* New ticket form */}
        <div style={{ ...card }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: colors.text,
                      marginBottom: 16 }}>
            New Ticket
          </p>
          {submitted && (
            <div style={{
              padding: '10px 14px', borderRadius: 8, marginBottom: 14,
              background: '#f0fdf4', color: colors.success,
              fontSize: 13, fontWeight: 500,
            }}>
              ✓ Ticket submitted successfully!
            </div>
          )}
          <Input label="Title" placeholder="Brief description of your issue"
            value={form.title}
            onChange={e => setForm({...form, title: e.target.value})} />
          <div style={{
            display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 12,
          }}>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600,
                              color: colors.textMuted, display: 'block',
                              marginBottom: 5 }}>
                Type
              </label>
              <select value={form.type}
                onChange={e => setForm({...form, type: e.target.value})}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: `1px solid ${colors.border}`, borderRadius: 8,
                  fontSize: 13, color: colors.text, background: '#fafafa',
                }}
              >
                <option value="bug">Bug Report</option>
                <option value="feature">Feature Request</option>
                <option value="question">Question</option>
                <option value="other">Other</option>
              </select>
            </div>
            <div style={{ marginBottom: 14 }}>
              <label style={{ fontSize: 12, fontWeight: 600,
                              color: colors.textMuted, display: 'block',
                              marginBottom: 5 }}>
                Priority
              </label>
              <select value={form.priority}
                onChange={e => setForm({...form, priority: e.target.value})}
                style={{
                  width: '100%', padding: '10px 12px',
                  border: `1px solid ${colors.border}`, borderRadius: 8,
                  fontSize: 13, color: colors.text, background: '#fafafa',
                }}
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>
          <Input label="Description" placeholder="Describe the issue in detail..."
            rows={4} value={form.description}
            onChange={e => setForm({...form, description: e.target.value})} />
          <button
            onClick={handleSubmit}
            disabled={!form.title}
            style={{
              width: '100%', padding: '11px 0',
              background: colors.primary, border: 'none',
              borderRadius: 8, color: '#fff',
              fontSize: 13, fontWeight: 700, cursor: 'pointer',
              opacity: !form.title ? 0.5 : 1,
            }}
          >
            Submit Ticket
          </button>
        </div>

        {/* Ticket list */}
        <div style={{ ...card }}>
          <p style={{ fontSize: 14, fontWeight: 700, color: colors.text,
                      marginBottom: 16 }}>
            My Tickets
          </p>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {tickets.map((t, i) => {
              const sc = statusColor(t.status);
              return (
                <div key={i} style={{
                  padding: '12px', borderRadius: 8,
                  border: `1px solid ${colors.border}`, background: '#fafafa',
                }}>
                  <div style={{
                    display: 'flex', justifyContent: 'space-between',
                    alignItems: 'flex-start', marginBottom: 6,
                  }}>
                    <div>
                      <p style={{ fontSize: 13, fontWeight: 600,
                                  color: colors.text }}>
                        {t.title}
                      </p>
                      <p style={{ fontSize: 11, color: colors.textMuted,
                                  marginTop: 2 }}>
                        {t.id} · {t.created}
                      </p>
                    </div>
                    <span style={{
                      fontSize: 10, fontWeight: 700,
                      padding: '2px 8px', borderRadius: 10,
                      background: sc.bg, color: sc.color,
                    }}>
                      {t.status.replace('_', ' ').toUpperCase()}
                    </span>
                  </div>
                  <div style={{ display: 'flex', gap: 6 }}>
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 6,
                      background: colors.primaryLight, color: colors.primary,
                    }}>
                      {t.type}
                    </span>
                    <span style={{
                      fontSize: 10, padding: '1px 7px', borderRadius: 6,
                      background: t.priority === 'high'   ? '#fef2f2'
                                : t.priority === 'medium' ? '#fffbeb' : '#f0fdf4',
                      color:      t.priority === 'high'   ? colors.danger
                                : t.priority === 'medium' ? colors.warning
                                : colors.success,
                    }}>
                      {t.priority} priority
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
};