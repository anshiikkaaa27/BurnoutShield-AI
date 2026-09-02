import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

export default function Login({ onSwitchToRegister }) {
  const { login } = useAuth();

  const [email,    setEmail]    = useState('');
  const [password, setPassword] = useState('');
  const [error,    setError]    = useState('');
  const [loading,  setLoading]  = useState(false);
  const [showPw,   setShowPw]   = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!email.trim() || !password) { setError('Please fill in both fields.'); return; }
    setError('');
    setLoading(true);
    try {
      await login(email.trim(), password);
      /* AuthContext sets user — App.js will re-render to the dashboard */
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Incorrect email or password.');
    } finally {
      setLoading(false);
    }
  };

  const fillDemo = () => { setEmail('demo@burnoutshield.ai'); setPassword('demo1234'); setError(''); };

  return (
    <div style={styles.shell}>
      {/* left panel */}
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>🛡</div>
          <span style={styles.brandName}>BurnoutShield AI</span>
        </div>

        <div style={styles.tagline}>
          <div style={styles.taglineHeading}>Protect your energy.<br />Before it's gone.</div>
          <div style={styles.taglineSub}>
            Track mood, sleep, and stress. Get AI-powered insights that catch burnout before it catches you.
          </div>
        </div>

        <div style={styles.featureList}>
          {[
            { icon: '📊', text: 'Burnout risk score updated daily' },
            { icon: '🤖', text: 'AI wellness assistant always on hand' },
            { icon: '💤', text: 'Sleep & recovery tracking' },
            { icon: '🔔', text: 'Smart reminders for breaks & rest' },
          ].map((f, i) => (
            <div key={i} style={styles.featureRow}>
              <span style={styles.featureIcon}>{f.icon}</span>
              <span style={styles.featureText}>{f.text}</span>
            </div>
          ))}
        </div>
      </div>

      {/* right panel — form */}
      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Welcome back</div>
            <div style={styles.cardSub}>Sign in to your BurnoutShield account</div>
          </div>

          {/* demo shortcut */}
          <button type="button" onClick={fillDemo} style={styles.demoBtn}>
            <span style={{ fontSize: 13 }}>⚡</span> Try the demo account
          </button>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            <div>
              <label style={styles.label}>Email address</label>
              <input
                type="email"
                className="input-field"
                placeholder="you@example.com"
                value={email}
                onChange={e => setEmail(e.target.value)}
                autoComplete="email"
                required
              />
            </div>

            <div>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Your password"
                  value={password}
                  onChange={e => setPassword(e.target.value)}
                  autoComplete="current-password"
                  required
                  style={{ paddingRight: 42 }}
                />
                <button
                  type="button"
                  onClick={() => setShowPw(v => !v)}
                  style={styles.eyeBtn}
                  tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}
                >
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
            </div>

            {error && (
              <div className="alert alert-danger" style={{ padding: '9px 12px', fontSize: 12 }}>
                {error}
              </div>
            )}

            <button
              type="submit"
              disabled={loading}
              className="btn btn-primary"
              style={{ width: '100%', justifyContent: 'center', padding: '11px', fontSize: 14, marginTop: 2 }}
            >
              {loading ? <><span className="spinner" /> Signing in…</> : 'Sign in'}
            </button>
          </form>

          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.switchRow}>
            Don't have an account?{' '}
            <button type="button" onClick={onSwitchToRegister} style={styles.switchBtn}>
              Create one — it's free
            </button>
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── styles ── */
const styles = {
  shell: {
    display: 'flex',
    minHeight: '100vh',
    background: '#0a0c12',
  },
  left: {
    flex: '1 1 480px',
    display: 'flex',
    flexDirection: 'column',
    justifyContent: 'center',
    padding: '60px 64px',
    background: 'linear-gradient(160deg, #0d0f18 0%, #10122040 100%)',
    borderRight: '1px solid #1a1d2e',
    gap: 40,
  },
  brand: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  brandIcon: {
    width: 34,
    height: 34,
    borderRadius: 9,
    background: 'linear-gradient(135deg, #7c6cfa, #4ecca3)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 16,
  },
  brandName: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 17,
    fontWeight: 700,
    color: '#e2e4ed',
    letterSpacing: '.01em',
  },
  tagline: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  taglineHeading: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 34,
    fontWeight: 800,
    lineHeight: 1.2,
    color: '#e2e4ed',
    letterSpacing: '-.01em',
  },
  taglineSub: {
    fontSize: 14,
    color: '#5a6180',
    lineHeight: 1.75,
    maxWidth: 360,
  },
  featureList: {
    display: 'flex',
    flexDirection: 'column',
    gap: 14,
  },
  featureRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 12,
  },
  featureIcon: {
    width: 32,
    height: 32,
    borderRadius: 8,
    background: 'rgba(124,108,250,.1)',
    border: '1px solid rgba(124,108,250,.15)',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    fontSize: 14,
    flexShrink: 0,
  },
  featureText: {
    fontSize: 13,
    color: '#8891aa',
  },
  right: {
    flex: '0 0 460px',
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    padding: '40px 32px',
  },
  card: {
    width: '100%',
    maxWidth: 400,
    background: '#12151f',
    border: '1px solid #1e2235',
    borderRadius: 16,
    padding: '36px 32px',
    display: 'flex',
    flexDirection: 'column',
    gap: 20,
  },
  cardHeader: {
    display: 'flex',
    flexDirection: 'column',
    gap: 6,
  },
  cardTitle: {
    fontFamily: 'Syne, sans-serif',
    fontSize: 22,
    fontWeight: 700,
    color: '#e2e4ed',
  },
  cardSub: {
    fontSize: 13,
    color: '#5a6180',
  },
  label: {
    display: 'block',
    fontSize: 12,
    color: '#5a6180',
    fontWeight: 500,
    marginBottom: 6,
  },
  eyeBtn: {
    position: 'absolute',
    right: 12,
    top: '50%',
    transform: 'translateY(-50%)',
    background: 'none',
    border: 'none',
    cursor: 'pointer',
    fontSize: 14,
    color: '#5a6180',
    padding: 0,
    lineHeight: 1,
  },
  demoBtn: {
    display: 'flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 6,
    padding: '9px',
    borderRadius: 8,
    border: '1px dashed rgba(124,108,250,.35)',
    background: 'rgba(124,108,250,.06)',
    color: '#9d90ff',
    fontSize: 12,
    fontWeight: 500,
    cursor: 'pointer',
    width: '100%',
    transition: 'all .15s',
  },
  dividerRow: {
    display: 'flex',
    alignItems: 'center',
    gap: 10,
  },
  dividerLine: {
    flex: 1,
    height: 1,
    background: '#1e2235',
  },
  dividerText: {
    fontSize: 12,
    color: '#3d4460',
  },
  switchRow: {
    textAlign: 'center',
    fontSize: 13,
    color: '#5a6180',
  },
  switchBtn: {
    background: 'none',
    border: 'none',
    color: '#7c6cfa',
    cursor: 'pointer',
    fontSize: 13,
    fontWeight: 500,
    textDecoration: 'underline',
    textUnderlineOffset: 3,
    padding: 0,
  },
};
