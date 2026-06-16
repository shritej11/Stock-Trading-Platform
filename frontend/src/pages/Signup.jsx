// Signup.jsx
import React, { useState } from 'react';
import axios from 'axios';
import { colors } from '../styles/theme';

const BASE = 'http://localhost:8000/auth';

const Signup = ({ onSwitch }) => {
  const [fullName,  setFullName]  = useState('');
  const [email,     setEmail]     = useState('');
  const [password,  setPassword]  = useState('');
  const [confirm,   setConfirm]   = useState('');
  const [step,      setStep]      = useState('form');
  const [otp,       setOtp]       = useState('');
  const [loading,   setLoading]   = useState(false);
  const [message,   setMessage]   = useState(null);

  const msg = (type, text) => setMessage({ type, text });

  const handleSignup = async () => {
    if (!fullName || !email || !password) {
      msg('error', 'Please fill in all fields.');
      return;
    }
    if (password !== confirm) {
      msg('error', 'Passwords do not match.');
      return;
    }
    if (password.length < 8) {
      msg('error', 'Password must be at least 8 characters.');
      return;
    }

    setLoading(true);
    setMessage(null);
    try {
      await axios.post(`${BASE}/signup`, {
        email,
        password,
        full_name: fullName,
      });
      setStep('verify');
      msg('info', `Verification code sent to ${email}`);
    } catch (e) {
      msg('error', e.response?.data?.detail || 'Signup failed.');
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    setLoading(true);
    try {
      await axios.post(`${BASE}/verify-otp`, {
        identifier: email,
        otp_code:   otp,
        purpose:    'email_verify',
      });
      msg('success', 'Email verified! You can now log in.');
      setTimeout(() => onSwitch('login'), 2000);
    } catch (e) {
      msg('error', e.response?.data?.detail || 'Invalid OTP.');
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = {
    width:        '100%',
    padding:      '11px 14px',
    background:   '#f8fafc',
    border:       `1px solid ${colors.border}`,
    borderRadius: 8,
    fontSize:     14,
    color:        colors.text,
    marginBottom: 12,
    outline:      'none',
  };

  return (
    <div style={{
      minHeight:      '100vh',
      background:     '#f0f4f8',
      display:        'flex',
      alignItems:     'center',
      justifyContent: 'center',
    }}>
      <div style={{
        width:        420,
        background:   '#fff',
        borderRadius: 16,
        padding:      32,
        border:       `1px solid ${colors.border}`,
        boxShadow:    '0 8px 24px rgba(0,0,0,0.08)',
      }}>

        {/* Logo */}
        <div style={{ textAlign: 'center', marginBottom: 28 }}>
          <div style={{
            display:        'inline-flex',
            alignItems:     'center',
            justifyContent: 'center',
            width:          48, height: 48,
            background:     colors.primary,
            borderRadius:   12,
            color:          '#fff',
            fontSize:       22, fontWeight: 800,
            marginBottom:   12,
          }}>
            N
          </div>
          <h2 style={{ fontSize: 22, fontWeight: 800, color: colors.text }}>
            Create Account
          </h2>
          <p style={{ fontSize: 13, color: colors.textMuted, marginTop: 4 }}>
            {step === 'form'
              ? 'Join NeuroTrade AI today'
              : 'Verify your email to continue'}
          </p>
        </div>

        {/* Message */}
        {message && (
          <div style={{
            padding:      '10px 14px',
            borderRadius: 8,
            marginBottom: 16,
            fontSize:     13,
            background:   message.type === 'success' ? '#f0fdf4'
                        : message.type === 'error'   ? '#fdf2f2'
                        : '#eff6ff',
            color:        message.type === 'success' ? colors.success
                        : message.type === 'error'   ? colors.danger
                        : colors.primary,
            border:       `1px solid ${
                            message.type === 'success' ? '#bbf7d0'
                          : message.type === 'error'   ? '#fecaca'
                          : '#bfdbfe'}`,
          }}>
            {message.text}
          </div>
        )}

        {step === 'form' ? (
          <>
            <input style={inputStyle} type="text"
              placeholder="Full Name"
              value={fullName}
              onChange={e => setFullName(e.target.value)} />
            <input style={inputStyle} type="email"
              placeholder="Email Address"
              value={email}
              onChange={e => setEmail(e.target.value)} />
            <input style={inputStyle} type="password"
              placeholder="Password (min 8 characters)"
              value={password}
              onChange={e => setPassword(e.target.value)} />
            <input style={inputStyle} type="password"
              placeholder="Confirm Password"
              value={confirm}
              onChange={e => setConfirm(e.target.value)}
              onKeyDown={e => e.key === 'Enter' && handleSignup()} />

            <button
              onClick={handleSignup}
              disabled={loading}
              style={{
                width:        '100%',
                padding:      '12px 0',
                background:   colors.primary,
                border:       'none',
                borderRadius: 8,
                color:        '#fff',
                fontSize:     14,
                fontWeight:   700,
                cursor:       loading ? 'not-allowed' : 'pointer',
                opacity:      loading ? 0.6 : 1,
                marginBottom: 12,
              }}
            >
              {loading ? 'Creating account...' : 'Create Account'}
            </button>
          </>
        ) : (
          <>
            <p style={{
              fontSize: 13, color: colors.textMuted,
              marginBottom: 16, textAlign: 'center',
            }}>
              Code sent to <strong style={{ color: colors.text }}>{email}</strong>
            </p>

            <input
              style={{
                ...inputStyle,
                fontSize:      28,
                fontWeight:    800,
                textAlign:     'center',
                letterSpacing: 12,
                marginBottom:  16,
              }}
              placeholder="------"
              maxLength={6}
              value={otp}
              onChange={e => setOtp(e.target.value.replace(/\D/g, ''))}
            />

            <button
              onClick={handleVerify}
              disabled={loading || otp.length !== 6}
              style={{
                width:        '100%',
                padding:      '12px 0',
                background:   colors.success,
                border:       'none',
                borderRadius: 8,
                color:        '#fff',
                fontSize:     14,
                fontWeight:   700,
                cursor:       loading || otp.length !== 6
                              ? 'not-allowed' : 'pointer',
                opacity:      loading || otp.length !== 6 ? 0.6 : 1,
                marginBottom: 12,
              }}
            >
              {loading ? 'Verifying...' : 'Verify Email'}
            </button>

            <button
              onClick={async () => {
                await axios.post(`${BASE}/resend-otp`, {
                  identifier: email,
                  purpose:    'email_verify',
                });
                msg('info', 'New OTP sent!');
                setOtp('');
              }}
              style={{
                width:        '100%',
                padding:      '10px 0',
                background:   'transparent',
                border:       `1px solid ${colors.border}`,
                borderRadius: 8,
                color:        colors.textMuted,
                fontSize:     13,
                cursor:       'pointer',
              }}
            >
              Resend OTP
            </button>
          </>
        )}

        <p style={{
          textAlign:  'center',
          marginTop:  16,
          fontSize:   13,
          color:      colors.textMuted,
        }}>
          Already have an account?{' '}
          <span
            onClick={() => onSwitch('login')}
            style={{ color: colors.primary, cursor: 'pointer', fontWeight: 600 }}
          >
            Sign in
          </span>
        </p>
      </div>
    </div>
  );
};

export default Signup;