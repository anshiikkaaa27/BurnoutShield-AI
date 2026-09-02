import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const STRESSORS = ['Workload', 'Sleep', 'Finances', 'Relationships', 'Health', 'Career', 'Other'];
const SCHEDULES = [
  'Mon–Fri, 9am–5pm', 'Mon–Fri, 9am–6pm', 'Mon–Fri, 10am–7pm',
  'Flexible hours', 'Student schedule', 'Shift work', 'Remote',
];

const RISK_COLORS = {
  High:     { color: '#f97066', bg: 'rgba(249,112,102,.08)' },
  Moderate: { color: '#f9c74f', bg: 'rgba(249,199,79,.08)'  },
  Low:      { color: '#4ecca3', bg: 'rgba(78,204,163,.08)'  },
};

export default function Profile() {
  const [profile, setProfile]   = useState(null);
  const [editing, setEditing]   = useState(false);
  const [draft,   setDraft]     = useState({});
  const [saving,  setSaving]    = useState(false);
  const [saved,   setSaved]     = useState(false);
  const [loadErr, setLoadErr]   = useState(false);

  useEffect(() => {
    api.get('/profile')
      .then(r => { setProfile(r.data); setDraft(r.data); })
      .catch(() => setLoadErr(true));
  }, []);

  const handleSave = async () => {
    setSaving(true);
    try {
      const res = await api.patch('/profile', {
        name:             draft.name,
        initials:         draft.initials,
        role:             draft.role,
        schedule:         draft.schedule,
        primary_stressor: draft.primary_stressor,
        notifications:    draft.notifications,
        target_sleep:     Number(draft.target_sleep),
        target_work_max:  Number(draft.target_work_max),
        target_breaks:    Number(draft.target_breaks),
      });
      setProfile(res.data.profile);
      setEditing(false);
      setSaved(true);
      setTimeout(() => setSaved(false), 3000);
    } catch {/* ignore */}
    finally { setSaving(false); }
  };

  if (!profile && !loadErr) return (
    <div style={{ display: 'flex', gap: 12, color: '#5a6180', marginTop: 60 }}>
      <span className="spinner" /> Loading profile…
    </div>
  );

  if (loadErr && !profile) return (
    <div className="alert alert-danger" style={{ marginTop: 24 }}>
      Could not load profile. Make sure the backend is running.
    </div>
  );

  const p = profile;
  const d = draft;
  const set = (key, val) => setDraft(prev => ({ ...prev, [key]: val }));

  /* ── burnout history chart ── */
  const history = p.burnout_history || [];
  const histChart = {
    labels: history.map(h => h.week),
    datasets: [{
      data: history.map(h => h.score),
      borderColor: '#f9c74f',
      backgroundColor: 'rgba(249,199,79,.06)',
      fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5,
      pointBackgroundColor: '#f9c74f',
    }],
  };
  const histOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: false } },
    scales: {
      x: { ticks: { color: '#3d4460', font: { size: 8 }, maxTicksLimit: 8 }, grid: { color: '#191c2c' } },
      y: { ticks: { color: '#3d4460', font: { size: 9 } }, grid: { color: '#191c2c' }, min: 0, max: 100 },
    },
  };

  const currentScore = history.length ? history[history.length - 1].score : 62;
  const prevScore    = history.length > 1 ? history[history.length - 2].score : currentScore;
  const scoreDelta   = currentScore - prevScore;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Profile</div>
            <div className="page-subtitle">Your account details, targets and burnout history</div>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            {saved && <span style={{ fontSize: 12, color: '#4ecca3', alignSelf: 'center' }}>✓ Saved</span>}
            {editing ? (
              <>
                <button onClick={handleSave} disabled={saving} className="btn btn-primary">
                  {saving ? <><span className="spinner" /> Saving…</> : 'Save changes'}
                </button>
                <button onClick={() => { setEditing(false); setDraft(profile); }}
                  className="btn btn-ghost">Cancel</button>
              </>
            ) : (
              <button onClick={() => setEditing(true)} className="btn btn-ghost">
                Edit profile
              </button>
            )}
          </div>
        </div>
      </div>

      {loadErr && (
        <div className="alert alert-warning">Backend unavailable — displaying cached profile.</div>
      )}

      {/* ── top row: identity + history chart ── */}
      <div className="grid-2">

        {/* ── identity card ── */}
        <div className="card">
          {/* avatar + name */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 14,
            paddingBottom: 18, marginBottom: 18, borderBottom: '1px solid #1e2235' }}>
            <div style={{
              width: 52, height: 52, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg, #7c6cfa, #4ecca3)',
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700,
            }}>
              {editing ? d.initials?.toUpperCase() || '??' : p.initials}
            </div>
            <div>
              {editing ? (
                <div style={{ display: 'grid', gap: 6 }}>
                  <input className="input-field" placeholder="Full name"
                    value={d.name} onChange={e => set('name', e.target.value)}
                    style={{ fontSize: 14, fontWeight: 500 }} />
                  <input className="input-field" placeholder="Initials (2 chars)"
                    value={d.initials} onChange={e => set('initials', e.target.value.slice(0,2))}
                    style={{ width: 70, fontSize: 12 }} />
                </div>
              ) : (
                <>
                  <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 16, fontWeight: 700 }}>
                    {p.name}
                  </div>
                  <div style={{ fontSize: 12, color: '#5a6180', marginTop: 2 }}>{p.role}</div>
                </>
              )}
            </div>
          </div>

          {/* fields */}
          <div style={{ display: 'grid', gap: 0 }}>
            {[
              {
                key: 'role', label: 'Role',
                render: editing
                  ? <input className="input-field" value={d.role}
                      onChange={e => set('role', e.target.value)} />
                  : <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{p.role}</span>,
              },
              {
                key: 'schedule', label: 'Work schedule',
                render: editing
                  ? <select className="input-field" value={d.schedule}
                      onChange={e => set('schedule', e.target.value)}>
                      {SCHEDULES.map(s => <option key={s}>{s}</option>)}
                    </select>
                  : <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{p.schedule}</span>,
              },
              {
                key: 'primary_stressor', label: 'Primary stressor',
                render: editing
                  ? <select className="input-field" value={d.primary_stressor}
                      onChange={e => set('primary_stressor', e.target.value)}>
                      {STRESSORS.map(s => <option key={s}>{s}</option>)}
                    </select>
                  : <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{p.primary_stressor}</span>,
              },
              {
                key: 'member_since', label: 'Member since',
                render: <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{p.member_since}</span>,
              },
              {
                key: 'notifications', label: 'Notifications',
                render: editing
                  ? <button onClick={() => set('notifications', !d.notifications)} style={{
                      padding: '4px 12px', borderRadius: 6, border: 'none', cursor: 'pointer',
                      background: d.notifications ? 'rgba(78,204,163,.1)' : '#181b28',
                      color: d.notifications ? '#4ecca3' : '#5a6180', fontSize: 12, fontWeight: 500,
                    }}>{d.notifications ? 'Enabled' : 'Disabled'}</button>
                  : <span style={{ fontSize: 13, fontWeight: 500,
                      color: p.notifications ? '#4ecca3' : '#5a6180' }}>
                      {p.notifications ? 'Enabled' : 'Disabled'}
                    </span>,
              },
            ].map((row, i, arr) => (
              <div key={row.key} style={{
                display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                padding: '10px 0',
                borderBottom: i < arr.length - 1 ? '1px solid #191c2c' : 'none',
              }}>
                <span style={{ fontSize: 12, color: '#5a6180' }}>{row.label}</span>
                {row.render}
              </div>
            ))}
          </div>
        </div>

        {/* ── history chart ── */}
        <div className="card">
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 4 }}>
            <div>
              <div style={{ fontSize: 13, fontWeight: 500 }}>Burnout score history</div>
              <div style={{ fontSize: 11, color: '#5a6180', marginTop: 2 }}>
                Weekly risk score over time
              </div>
            </div>
            <div style={{ textAlign: 'right' }}>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22, fontWeight: 700, color: '#f9c74f' }}>
                {currentScore}
              </div>
              <div style={{ fontSize: 11, color: scoreDelta > 0 ? '#f97066' : '#4ecca3' }}>
                {scoreDelta > 0 ? `▲ +${scoreDelta}` : `▼ ${scoreDelta}`} vs prev week
              </div>
            </div>
          </div>
          <div style={{ position: 'relative', height: 200, marginTop: 16, marginBottom: 8 }}>
            <Line data={histChart} options={histOpts} />
          </div>
          <div style={{ fontSize: 11, color: '#3d4460', textAlign: 'center' }}>
            Higher = more burnout risk · Target: below 50
          </div>
        </div>
      </div>

      {/* ── targets ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 18 }}>Wellness targets</div>
        <div className="grid-3">
          {[
            { key: 'target_sleep',    label: 'Target sleep (hours/night)', unit: 'h',   min: 5,  max: 10, step: 0.5, color: '#7c6cfa' },
            { key: 'target_work_max', label: 'Max work hours/day',         unit: 'h',   min: 4,  max: 14, step: 0.5, color: '#f97066' },
            { key: 'target_breaks',   label: 'Target break time (min/day)', unit: 'min', min: 15, max: 120, step: 5, color: '#4ecca3' },
          ].map(t => (
            <div key={t.key}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
                <span style={{ fontSize: 12, color: '#5a6180' }}>{t.label}</span>
                <span style={{ fontSize: 13, fontWeight: 500, color: t.color }}>
                  {editing ? d[t.key] : p[t.key]}{t.unit}
                </span>
              </div>
              {editing ? (
                <input type="range" min={t.min} max={t.max} step={t.step}
                  value={d[t.key]} onChange={e => set(t.key, e.target.value)}
                  style={{ width: '100%', accentColor: t.color }} />
              ) : (
                <div className="progress-track">
                  <div className="progress-fill" style={{
                    background: t.color,
                    width: `${((p[t.key] - t.min) / (t.max - t.min)) * 100}%`,
                  }} />
                </div>
              )}
            </div>
          ))}
        </div>
      </div>

      {/* ── risk factor breakdown ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 18 }}>Risk factor analysis</div>
        <div style={{ display: 'grid', gap: 14 }}>
          {(p.risk_factors || []).map((f, i) => {
            const rc = RISK_COLORS[f.risk] || RISK_COLORS.Moderate;
            return (
              <div key={i}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  alignItems: 'center', marginBottom: 6 }}>
                  <span style={{ fontSize: 12, color: '#5a6180' }}>{f.label}</span>
                  <span style={{
                    padding: '2px 9px', borderRadius: 6,
                    fontSize: 11, fontWeight: 500,
                    color: rc.color, background: rc.bg,
                  }}>{f.risk}</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${f.val}%`, background: rc.color }} />
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
