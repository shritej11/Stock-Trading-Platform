// Login.jsx
import React, { useState } from 'react';
import axios from 'axios';
// Change import at top
import { GoogleLogin } from '@react-oauth/google';  // instead of useGoogleLogin
import Signup from './Signup';
import { colors } from '../styles/theme';

const BASE = 'http://localhost:8000/auth';

export default function Login({ onLogin }) {

  // ALL hooks must be at the top — no exceptions
  const [authPage, setAuthPage] = useState('login');
  const [tab, setTab] = useState('email');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [phone, setPhone] = useState('');
  const [otp, setOtp] = useState('');
  const [step, setStep] = useState('form');
  const [identifier, setIdentifier] = useState('');
  const [purpose, setPurpose] = useState('');
  const [loading, setLoading] = useState(false);
  const [message, setMessage] = useState(null);

  const msg = (type, text) => setMessage({ type, text });

  // Google login hook — must be here at top level
 
  // Handler functions
  

  const handleEmailLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.post(`${BASE}/login`, { email, password });
      if (res.data.two_fa) {
        setIdentifier(res.data.identifier);
        setPurpose('2fa');
        setStep('otp');
        msg('info', 'OTP sent to your email.');
      } else {
        localStorage.setItem('access_token', res.data.access_token);
        localStorage.setItem('refresh_token', res.data.refresh_token);
        localStorage.setItem('user_name', res.data.user?.name || '');
        localStorage.setItem('user_email', res.data.user?.email || '');
        onLogin(res.data.user);
      }
    } catch (e) {
      msg('error', e.response?.data?.detail || 'Login failed.');
    } finally { setLoading(false); }
  };

 const handlePhoneLogin = async () => {
    setLoading(true);
    setMessage(null);
    try {
      let formatted = phone.trim().replace(/\s+/g, '');
      if (!formatted.startsWith('+')) {
        formatted = '+91' + formatted;
      }
      const res = await axios.post(`${BASE}/phone-login`, { phone: formatted });
      setIdentifier(res.data.identifier);
      setPurpose('phone_login');
      setStep('otp');
      msg('info', 'OTP sent to your mobile.');
    } catch (e) {
      msg('error', e.response?.data?.detail || 'Failed to send OTP.');
    } finally { setLoading(false); }
  };

  const handleVerifyOtp = async () => {
    setLoading(true);
    setMessage(null);
    try {
      const res = await axios.post(`${BASE}/verify-otp`, {
        identifier, otp_code: otp, purpose,
      });
      localStorage.setItem('access_token', res.data.access_token);
      localStorage.setItem('refresh_token', res.data.refresh_token);
      localStorage.setItem('user_name', res.data.user?.name || '');
      localStorage.setItem('user_email', res.data.user?.email || '');
      onLogin(res.data.user);
    } catch (e) {
      msg('error', e.response?.data?.detail || 'Invalid OTP.');
    } finally { setLoading(false); }
  };

  // Conditional render AFTER all hooks
  if (authPage === 'signup') {
    return <Signup onSwitch={setAuthPage} />;
  }

  // Styles
  const inputStyle = {
    width: '100%',
    padding: '11px 14px',
    background: '#f8fafc',
    border: `1px solid ${colors.border}`,
    borderRadius: 8,
    fontSize: 14,
    color: colors.text,
    outline: 'none',
    marginBottom: 12,
    fontFamily: 'inherit',
  };

  const btnPrimary = {
    width: '100%',
    padding: '12px 0',
    borderRadius: 8,
    border: 'none',
    cursor: loading ? 'not-allowed' : 'pointer',
    fontWeight: 700,
    fontSize: 14,
    background: colors.primary,
    color: '#fff',
    opacity: loading ? 0.6 : 1,
    marginBottom: 10,
  };

  const btnSuccess = {
    ...btnPrimary,
    background: colors.success,
  };

  return (
    <div style={{
      minHeight: '100vh',
      background: '#f0f4f8',
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width: 420,
        background: '#fff',
        borderRadius: 16,
        padding: 32,
        border: `1px solid ${colors.border}`,
        boxShadow: '0 8px 24px rgba(0,0,0,0.08)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display: 'inline-flex',
            alignItems: 'center',
            justifyContent: 'center',
            width: 48, height: 48,
            background: colors.primary,
            borderRadius: 12,
            color: '#fff',
            fontSize: 22, fontWeight: 800,
            marginBottom: 12,
          }}>
            N
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>
            NeuroTrade AI
          </h2>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            {step === 'otp'
              ? 'Enter your verification code'
              : 'Sign in to your account'}
          </p>
        </div>

        {/* Message banner */}
        {message && (
          <div style={{
            padding: '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize: 13,
            lineHeight: 1.5,
            background: message.type === 'error'
              ? '#fdf2f2' : message.type === 'info'
                ? '#eff6ff' : '#f0fdf4',
            color: message.type === 'error'
              ? colors.danger : message.type === 'info'
                ? colors.primary : colors.success,
            border: `1px solid ${message.type === 'error' ? '#fecaca'
                : message.type === 'info' ? '#bfdbfe'
                  : '#bbf7d0'}`,
          }}>
            {message.text}
          </div>
        )}

        {/* OTP verification screen */}
        {step === 'otp' ? (
          <>
            <p style={{
              fontSize: 13, color: colors.textMuted,
              marginBottom: 16, textAlign: 'center',
            }}>
              Code sent to{' '}
              <strong style={{ color: colors.text }}>{identifier}</strong>
            </p>

            <input
              style={{
                ...inputStyle,
                fontSize: 28,
                fontWeight: 800,
                textAlign: 'center',
                letterSpacing: 12,
                marginBottom: 16,
              }}
              placeholder="------"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            />

            <button
              style={btnSuccess}
              onClick={handleVerifyOtp}
              disabled={loading || otp.length !== 6}
            >
              {loading ? 'Verifying...' : 'Verify OTP'}
            </button>

            <button
              onClick={async () => {
                await axios.post(`${BASE}/resend-otp`, { identifier, purpose });
                msg('info', 'New OTP sent!');
                setOtp('');
              }}
              style={{
                width: '100%',
                padding: '10px 0',
                background: 'transparent',
                border: `1px solid ${colors.border}`,
                borderRadius: 8,
                color: colors.textMuted,
                fontSize: 13,
                cursor: 'pointer',
                marginBottom: 8,
              }}
            >
              Resend OTP
            </button>

            <button
              onClick={() => {
                setStep('form');
                setOtp('');
                setMessage(null);
              }}
              style={{
                width: '100%',
                padding: '8px 0',
                background: 'transparent',
                border: 'none',
                color: colors.textLight,
                fontSize: 12,
                cursor: 'pointer',
              }}
            >
              ← Back to login
            </button>
          </>
        ) : (
          <>
            {/* Email / Phone tab switcher */}
            <div style={{
              display: 'flex',
              background: '#f8fafc',
              borderRadius: 8,
              padding: 3,
              marginBottom: 20,
              border: `1px solid ${colors.border}`,
            }}>
              {['email', 'phone'].map(t => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  style={{
                    flex: 1,
                    padding: '8px 0',
                    borderRadius: 6,
                    border: 'none',
                    cursor: 'pointer',
                    fontWeight: 600,
                    fontSize: 13,
                    transition: 'all 0.2s',
                    background: tab === t ? '#fff' : 'transparent',
                    color: tab === t ? colors.primary : colors.textMuted,
                    boxShadow: tab === t
                      ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                  }}
                >
                  {t === 'email' ? '✉ Email' : '📱 Mobile OTP'}
                </button>
              ))}
            </div>

            {/* Email login form */}
            {tab === 'email' ? (
              <>
                <input
                  style={inputStyle}
                  type="email"
                  placeholder="Email address"
                  value={email}
                  onChange={e => setEmail(e.target.value)}
                />
                <input
                  style={inputStyle}
                  type="password"
                  placeholder="Password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  onKeyDown={e => e.key === 'Enter' && handleEmailLogin()}
                />
                <button
                  style={btnPrimary}
                  onClick={handleEmailLogin}
                  disabled={loading}
                >
                  {loading ? 'Signing in...' : 'Sign In'}
                </button>
              </>
            ) : (
              /* Phone login form */
              <>
                <input
                  style={inputStyle}
                  type="tel"
                  placeholder="+91 9876543210"
                  value={phone}
                  onChange={e => setPhone(e.target.value)}
                />
                <button
                  style={btnPrimary}
                  onClick={handlePhoneLogin}
                  disabled={loading}
                >
                  {loading ? 'Sending OTP...' : 'Send OTP'}
                </button>
              </>
            )}

            {/* OR divider */}
            <div style={{
              display: 'flex',
              alignItems: 'center',
              gap: 12,
              margin: '16px 0',
            }}>
              <div style={{
                flex: 1, height: 1, background: colors.border,
              }} />
              <span style={{ color: colors.textLight, fontSize: 12 }}>
                or continue with
              </span>
              <div style={{
                flex: 1, height: 1, background: colors.border,
              }} />
            </div>

            {/* Google Sign In */}
            <GoogleLogin
              onSuccess={async (credentialResponse) => {
                setLoading(true);
                setMessage(null);
                try {
                  const res = await axios.post(`${BASE}/google`, {
                    token: credentialResponse.credential,
                  });
                  if (res.data.two_fa) {
                    setIdentifier(res.data.identifier);
                    setPurpose('2fa');
                    setStep('otp');
                    msg('info', `OTP sent to ${res.data.identifier}`);
                  } else {
                    localStorage.setItem('access_token', res.data.access_token);
                    localStorage.setItem('refresh_token', res.data.refresh_token);
                    localStorage.setItem('user_name', res.data.user?.name || '');
                    localStorage.setItem('user_email', res.data.user?.email || '');
                    onLogin(res.data.user);
                  }
                } catch (e) {
                  msg('error', e.response?.data?.detail || 'Google sign-in failed.');
                } finally {
                  setLoading(false);
                }
              }}
              onError={() => msg('error', 'Google sign-in was cancelled.')}
              width="358"
            />

            {/* Sign up link */}
            <p style={{
              textAlign: 'center',
              fontSize: 13,
              color: colors.textMuted,
            }}>
              No account?{' '}
              <span
                onClick={() => setAuthPage('signup')}
                style={{
                  color: colors.primary,
                  cursor: 'pointer',
                  fontWeight: 600,
                }}
              >
                Sign up free →
              </span>
            </p>
          </>
        )}
      </div>
    </div>
  );
}