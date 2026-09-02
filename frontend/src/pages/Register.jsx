import React, { useState } from 'react';
import { useAuth } from '../context/AuthContext';

const ROLES = ['Student', 'Software Engineer', 'Designer', 'Manager', 'Researcher',
               'Healthcare Worker', 'Teacher', 'Freelancer', 'Other'];

export default function Register({ onSwitchToLogin }) {
  const { register } = useAuth();

  const [form, setForm] = useState({
    name: '', email: '', password: '', confirm: '', role: 'Student',
  });
  const [error,   setError]   = useState('');
  const [loading, setLoading] = useState(false);
  const [showPw,  setShowPw]  = useState(false);

  const set = (k, v) => setForm(f => ({ ...f, [k]: v }));

  const validate = () => {
    if (!form.name.trim())          return 'Please enter your name.';
    if (!form.email.trim())         return 'Please enter your email address.';
    if (!/\S+@\S+\.\S+/.test(form.email)) return 'Please enter a valid email address.';
    if (form.password.length < 6)   return 'Password must be at least 6 characters.';
    if (form.password !== form.confirm) return 'Passwords do not match.';
    return null;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    const err = validate();
    if (err) { setError(err); return; }
    setError('');
    setLoading(true);
    try {
      await register(form.name.trim(), form.email.trim(), form.password, form.role);
    } catch (err) {
      const detail = err?.response?.data?.detail;
      setError(typeof detail === 'string' ? detail : 'Registration failed. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  /* password strength */
  const strength = (() => {
    const p = form.password;
    if (!p)          return { score: 0, label: '',       color: '#1e2235' };
    if (p.length < 6) return { score: 1, label: 'Weak',   color: '#f97066' };
    const hasUp  = /[A-Z]/.test(p);
    const hasNum = /\d/.test(p);
    const hasSym = /[^a-zA-Z0-9]/.test(p);
    const extras = [hasUp, hasNum, hasSym].filter(Boolean).length;
    if (p.length >= 10 && extras >= 2) return { score: 3, label: 'Strong', color: '#4ecca3' };
    if (p.length >= 8  && extras >= 1) return { score: 2, label: 'Good',   color: '#f9c74f' };
    return { score: 1, label: 'Weak', color: '#f97066' };
  })();

  return (
    <div style={styles.shell}>
      {/* left branding panel */}
      <div style={styles.left}>
        <div style={styles.brand}>
          <div style={styles.brandIcon}>🛡</div>
          <span style={styles.brandName}>BurnoutShield AI</span>
        </div>

        <div style={styles.tagline}>
          <div style={styles.taglineHeading}>Start your<br />wellness journey.</div>
          <div style={styles.taglineSub}>
            Create a free account and get personalised burnout insights from day one.
            Your data stays private and belongs to you.
          </div>
        </div>

        <div style={styles.steps}>
          {[
            { n: '01', title: 'Create your account',    desc: 'Takes less than a minute.' },
            { n: '02', title: 'Log your first check-in', desc: 'Mood, sleep, stress — 30 seconds.' },
            { n: '03', title: 'Get your burnout score',  desc: 'AI-powered, updated daily.' },
          ].map(s => (
            <div key={s.n} style={styles.stepRow}>
              <div style={styles.stepNum}>{s.n}</div>
              <div>
                <div style={styles.stepTitle}>{s.title}</div>
                <div style={styles.stepDesc}>{s.desc}</div>
              </div>
            </div>
          ))}
        </div>
      </div>

      {/* right panel — form */}
      <div style={styles.right}>
        <div style={styles.card}>
          <div style={styles.cardHeader}>
            <div style={styles.cardTitle}>Create your account</div>
            <div style={styles.cardSub}>Free forever · No credit card needed</div>
          </div>

          <form onSubmit={handleSubmit} style={{ display: 'grid', gap: 14 }}>
            {/* name */}
            <div>
              <label style={styles.label}>Full name</label>
              <input className="input-field" placeholder="Alex Johnson"
                value={form.name} onChange={e => set('name', e.target.value)}
                autoComplete="name" required />
            </div>

            {/* email */}
            <div>
              <label style={styles.label}>Email address</label>
              <input type="email" className="input-field" placeholder="you@example.com"
                value={form.email} onChange={e => set('email', e.target.value)}
                autoComplete="email" required />
            </div>

            {/* role */}
            <div>
              <label style={styles.label}>Your role</label>
              <select className="input-field" value={form.role}
                onChange={e => set('role', e.target.value)}>
                {ROLES.map(r => <option key={r}>{r}</option>)}
              </select>
            </div>

            {/* password */}
            <div>
              <label style={styles.label}>Password</label>
              <div style={{ position: 'relative' }}>
                <input
                  type={showPw ? 'text' : 'password'}
                  className="input-field"
                  placeholder="Min. 6 characters"
                  value={form.password}
                  onChange={e => set('password', e.target.value)}
                  autoComplete="new-password"
                  required
                  style={{ paddingRight: 42 }}
                />
                <button type="button" onClick={() => setShowPw(v => !v)}
                  style={styles.eyeBtn} tabIndex={-1}
                  aria-label={showPw ? 'Hide password' : 'Show password'}>
                  {showPw ? '🙈' : '👁'}
                </button>
              </div>
              {/* strength bar */}
              {form.password && (
                <div style={{ marginTop: 7 }}>
                  <div style={{ display: 'flex', gap: 4, marginBottom: 4 }}>
                    {[1, 2, 3].map(i => (
                      <div key={i} style={{
                        flex: 1, height: 3, borderRadius: 2,
                        background: i <= strength.score ? strength.color : '#1e2235',
                        transition: 'background .3s',
                      }} />
                    ))}
                  </div>
                  <div style={{ fontSize: 11, color: strength.color }}>{strength.label}</div>
                </div>
              )}
            </div>

            {/* confirm password */}
            <div>
              <label style={styles.label}>Confirm password</label>
              <input
                type={showPw ? 'text' : 'password'}
                className="input-field"
                placeholder="Repeat your password"
                value={form.confirm}
                onChange={e => set('confirm', e.target.value)}
                autoComplete="new-password"
                required
                style={{
                  borderColor: form.confirm && form.confirm !== form.password
                    ? 'rgba(249,112,102,.5)' : undefined,
                }}
              />
              {form.confirm && form.confirm !== form.password && (
                <div style={{ fontSize: 11, color: '#f97066', marginTop: 4 }}>
                  Passwords don't match
                </div>
              )}
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
              {loading ? <><span className="spinner" /> Creating account…</> : 'Create account'}
            </button>
          </form>

          <div style={styles.dividerRow}>
            <div style={styles.dividerLine} />
            <span style={styles.dividerText}>or</span>
            <div style={styles.dividerLine} />
          </div>

          <div style={styles.switchRow}>
            Already have an account?{' '}
            <button type="button" onClick={onSwitchToLogin} style={styles.switchBtn}>
              Sign in
            </button>
          </div>

          <div style={{ fontSize: 11, color: '#3d4460', textAlign: 'center', lineHeight: 1.6 }}>
            By creating an account you agree to our terms of service.
            Your data is stored locally on this server and never shared.
          </div>
        </div>
      </div>
    </div>
  );
}

/* ── styles (shared palette with Login) ── */
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
    borderRight: '1px solid #1a1d2e',
    gap: 44,
  },
  brand: { display: 'flex', alignItems: 'center', gap: 10 },
  brandIcon: {
    width: 34, height: 34, borderRadius: 9,
    background: 'linear-gradient(135deg, #7c6cfa, #4ecca3)',
    display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 16,
  },
  brandName: {
    fontFamily: 'Syne, sans-serif', fontSize: 17, fontWeight: 700,
    color: '#e2e4ed', letterSpacing: '.01em',
  },
  tagline: { display: 'flex', flexDirection: 'column', gap: 14 },
  taglineHeading: {
    fontFamily: 'Syne, sans-serif', fontSize: 34, fontWeight: 800,
    lineHeight: 1.2, color: '#e2e4ed', letterSpacing: '-.01em',
  },
  taglineSub: {
    fontSize: 14, color: '#5a6180', lineHeight: 1.75, maxWidth: 360,
  },
  steps: { display: 'flex', flexDirection: 'column', gap: 18 },
  stepRow: { display: 'flex', alignItems: 'flex-start', gap: 14 },
  stepNum: {
    width: 32, height: 32, borderRadius: 8, flexShrink: 0,
    background: 'rgba(124,108,250,.1)', border: '1px solid rgba(124,108,250,.2)',
    color: '#7c6cfa', fontSize: 11, fontWeight: 700,
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    fontFamily: 'Syne, sans-serif',
  },
  stepTitle: { fontSize: 13, fontWeight: 500, color: '#e2e4ed', marginBottom: 2 },
  stepDesc:  { fontSize: 12, color: '#5a6180' },
  right: {
    flex: '0 0 480px',
    display: 'flex', alignItems: 'center', justifyContent: 'center',
    padding: '40px 32px',
  },
  card: {
    width: '100%', maxWidth: 420,
    background: '#12151f', border: '1px solid #1e2235',
    borderRadius: 16, padding: '36px 32px',
    display: 'flex', flexDirection: 'column', gap: 18,
  },
  cardHeader: { display: 'flex', flexDirection: 'column', gap: 6 },
  cardTitle: {
    fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#e2e4ed',
  },
  cardSub: { fontSize: 13, color: '#5a6180' },
  label: {
    display: 'block', fontSize: 12, color: '#5a6180',
    fontWeight: 500, marginBottom: 6,
  },
  eyeBtn: {
    position: 'absolute', right: 12, top: '50%', transform: 'translateY(-50%)',
    background: 'none', border: 'none', cursor: 'pointer',
    fontSize: 14, color: '#5a6180', padding: 0, lineHeight: 1,
  },
  dividerRow: { display: 'flex', alignItems: 'center', gap: 10 },
  dividerLine: { flex: 1, height: 1, background: '#1e2235' },
  dividerText: { fontSize: 12, color: '#3d4460' },
  switchRow: { textAlign: 'center', fontSize: 13, color: '#5a6180' },
  switchBtn: {
    background: 'none', border: 'none', color: '#7c6cfa',
    cursor: 'pointer', fontSize: 13, fontWeight: 500,
    textDecoration: 'underline', textUnderlineOffset: 3, padding: 0,
  },
};
