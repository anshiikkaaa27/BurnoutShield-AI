import React, { useState, useEffect } from 'react';
import { Line, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, BarElement, Filler, Tooltip, Legend);

const axis = {
  ticks: { color: '#3d4460', font: { size: 10 } },
  grid:  { color: '#191c2c' },
};

const QUALITY = ['Poor', 'Fair', 'Good', 'Excellent'];
const QUALITY_COLOR = { Poor: '#f97066', Fair: '#f9c74f', Good: '#4ecca3', Excellent: '#7c6cfa' };

function Field({ label, children }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {children}
    </div>
  );
}

function SliderRow({ label, min, max, step = 0.5, value, onChange, color, unit }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}>
        <span style={{ fontSize: 12, color: '#5a6180' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{value}{unit}</span>
      </div>
      <input type="range" min={min} max={max} step={step} value={value} onChange={onChange}
        style={{ width: '100%', accentColor: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#3d4460', marginTop: 3 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

function InsightPill({ type, message }) {
  const colors = {
    warning:  { color: '#f9c74f', bg: 'rgba(249,199,79,.07)',  border: 'rgba(249,199,79,.2)',  icon: '⚠️' },
    danger:   { color: '#f97066', bg: 'rgba(249,112,102,.07)', border: 'rgba(249,112,102,.2)', icon: '🔴' },
    tip:      { color: '#7c6cfa', bg: 'rgba(124,108,250,.07)', border: 'rgba(124,108,250,.2)', icon: '💡' },
    positive: { color: '#4ecca3', bg: 'rgba(78,204,163,.07)',  border: 'rgba(78,204,163,.2)',  icon: '✅' },
  };
  const c = colors[type] || colors.tip;
  return (
    <div style={{
      display: 'flex', gap: 10, alignItems: 'flex-start',
      padding: '12px 14px', borderRadius: 9,
      background: c.bg, border: `1px solid ${c.border}`,
    }}>
      <span style={{ fontSize: 14, flexShrink: 0 }}>{c.icon}</span>
      <span style={{ fontSize: 12, color: c.color, lineHeight: 1.65 }}>{message}</span>
    </div>
  );
}

export default function SleepTracker() {
  const [form, setForm] = useState({
    date:             new Date().toISOString().split('T')[0],
    sleep_hours:      7,
    sleep_quality:    'Good',
    work_hours:       8,
    break_minutes:    45,
    screen_time:      5,
    physical_minutes: 20,
    notes:            '',
  });
  const [saving,   setSaving]   = useState(false);
  const [saved,    setSaved]    = useState(false);
  const [sessions, setSessions] = useState([]);
  const [stats,    setStats]    = useState(null);
  const [loadErr,  setLoadErr]  = useState(false);

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  useEffect(() => {
    Promise.all([api.get('/tracker'), api.get('/tracker/stats')])
      .then(([sRes, stRes]) => {
        setSessions(sRes.data);
        setStats(stRes.data);
      })
      .catch(() => setLoadErr(true));
  }, [saved]);

  const handleSave = async () => {
    setSaving(true);
    try {
      await api.post('/tracker', {
        ...form,
        sleep_hours:      Number(form.sleep_hours),
        work_hours:       Number(form.work_hours),
        break_minutes:    Number(form.break_minutes),
        screen_time:      Number(form.screen_time),
        physical_minutes: Number(form.physical_minutes),
      });
      setSaved(s => !s);
    } catch {/* offline */}
    finally { setSaving(false); }
  };

  /* ── chart data from stats ── */
  const chart = stats?.chart ?? [];
  const sleepWorkChart = {
    labels: chart.map(c => c.date.slice(5)),
    datasets: [
      { label: 'Sleep (h)', data: chart.map(c => c.sleep), borderColor: '#7c6cfa',
        backgroundColor: 'rgba(124,108,250,.07)', fill: true, tension: 0.4, pointRadius: 3 },
      { label: 'Work (h)',  data: chart.map(c => c.work),  borderColor: '#f97066',
        backgroundColor: 'rgba(249,112,102,.07)', fill: true, tension: 0.4, pointRadius: 3 },
    ],
  };
  const scoreChart = {
    labels: chart.map(c => c.date.slice(5)),
    datasets: [{
      label: 'Wellness Score',
      data: chart.map(c => c.score),
      backgroundColor: chart.map(c =>
        c.score >= 70 ? 'rgba(78,204,163,.55)' :
        c.score >= 50 ? 'rgba(249,199,79,.55)' : 'rgba(249,112,102,.55)'
      ),
      borderRadius: 4,
    }],
  };
  const chartOpts = (max) => ({
    responsive: true, maintainAspectRatio: false,
    plugins: { legend: { display: true,
      labels: { color: '#5a6180', font: { size: 11 }, boxWidth: 10, boxHeight: 10 } } },
    scales: { x: axis, y: { ...axis, min: 0, max } },
  });

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div className="page-title">Sleep & Work Tracker</div>
        <div className="page-subtitle">
          Log daily sleep, work sessions, breaks and physical activity to measure recovery quality
        </div>
      </div>

      {loadErr && (
        <div className="alert alert-warning">
          Backend unavailable — data shown may be stale.
        </div>
      )}

      {/* ── stats row ── */}
      {stats && (
        <div className="grid-4">
          {[
            { label: 'Avg Sleep',    value: `${stats.avg_sleep}h`,    color: '#7c6cfa' },
            { label: 'Avg Work',     value: `${stats.avg_work}h`,     color: '#f97066' },
            { label: 'Avg Breaks',   value: `${stats.avg_breaks}min`, color: '#4ecca3' },
            { label: 'Wellness Score', value: stats.avg_wellness_score, color:
              stats.avg_wellness_score >= 70 ? '#4ecca3' :
              stats.avg_wellness_score >= 50 ? '#f9c74f' : '#f97066' },
          ].map(s => (
            <div key={s.label} className="card" style={{ padding: '16px 18px' }}>
              <div style={{ fontSize: 11, color: '#3d4460', textTransform: 'uppercase',
                letterSpacing: '.08em', marginBottom: 8 }}>{s.label}</div>
              <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22,
                fontWeight: 700, color: s.color }}>{s.value}</div>
            </div>
          ))}
        </div>
      )}

      {/* ── charts ── */}
      {chart.length > 0 && (
        <div className="grid-2">
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500 }}>Sleep vs Work Hours</div>
            <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 14 }}>Last 7 days</div>
            <div style={{ position: 'relative', height: 190 }}>
              <Line data={sleepWorkChart} options={chartOpts(14)} />
            </div>
          </div>
          <div className="card">
            <div style={{ fontSize: 13, fontWeight: 500 }}>Daily Wellness Score</div>
            <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 14 }}>0–100 composite</div>
            <div style={{ position: 'relative', height: 190 }}>
              <Bar data={scoreChart} options={chartOpts(100)} />
            </div>
          </div>
        </div>
      )}

      {/* ── insights ── */}
      {stats?.insights?.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Insights</div>
          <div style={{ display: 'grid', gap: 10 }}>
            {stats.insights.map((ins, i) => (
              <InsightPill key={i} type={ins.type} message={ins.message} />
            ))}
          </div>
        </div>
      )}

      {/* ── log form ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Log a session</div>
        <div style={{ display: 'grid', gap: 20 }}>

          <Field label="Date">
            <input type="date" className="input-field"
              value={form.date} onChange={e => set('date', e.target.value)} />
          </Field>

          <SliderRow label="Sleep hours" min={0} max={12} unit="h"
            value={form.sleep_hours} color="#7c6cfa"
            onChange={e => set('sleep_hours', e.target.value)} />

          <Field label="Sleep quality">
            <div style={{ display: 'flex', gap: 8, marginTop: 2 }}>
              {QUALITY.map(q => (
                <button key={q} onClick={() => set('sleep_quality', q)} style={{
                  flex: 1, padding: '9px 6px', borderRadius: 7, cursor: 'pointer',
                  border: `1px solid ${form.sleep_quality === q ? QUALITY_COLOR[q] : '#1e2235'}`,
                  background: form.sleep_quality === q ? `${QUALITY_COLOR[q]}18` : '#0d1018',
                  color: form.sleep_quality === q ? QUALITY_COLOR[q] : '#4e5470',
                  fontSize: 11, fontWeight: 500, transition: 'all .15s',
                }}>{q}</button>
              ))}
            </div>
          </Field>

          <SliderRow label="Work / study hours" min={0} max={16} unit="h"
            value={form.work_hours} color="#f97066"
            onChange={e => set('work_hours', e.target.value)} />

          <SliderRow label="Total break time" min={0} max={180} step={5} unit=" min"
            value={form.break_minutes} color="#4ecca3"
            onChange={e => set('break_minutes', e.target.value)} />

          <SliderRow label="Screen time (non-work)" min={0} max={12} unit="h"
            value={form.screen_time} color="#f9c74f"
            onChange={e => set('screen_time', e.target.value)} />

          <SliderRow label="Physical activity" min={0} max={180} step={5} unit=" min"
            value={form.physical_minutes} color="#7c6cfa"
            onChange={e => set('physical_minutes', e.target.value)} />

          <Field label="Notes (optional)">
            <textarea className="input-field" rows={2} placeholder="Anything notable about today…"
              value={form.notes} onChange={e => set('notes', e.target.value)} />
          </Field>
        </div>

        <div style={{ marginTop: 20 }}>
          <button onClick={handleSave} disabled={saving} className="btn btn-primary">
            {saving ? <><span className="spinner" /> Saving…</> : 'Save session'}
          </button>
        </div>
      </div>

      {/* ── session history ── */}
      {sessions.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
            Session history
          </div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2235' }}>
                  {['Date', 'Sleep', 'Quality', 'Work', 'Breaks', 'Physical', 'Score'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px',
                      color: '#3d4460', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {sessions.slice(0, 10).map(s => (
                  <tr key={s.id} style={{ borderBottom: '1px solid #191c2c' }}>
                    <td style={{ padding: '8px 10px', color: '#5a6180' }}>{s.date}</td>
                    <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{s.sleep_hours}h</td>
                    <td style={{ padding: '8px 10px',
                      color: QUALITY_COLOR[s.sleep_quality] || '#e2e4ed' }}>{s.sleep_quality}</td>
                    <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{s.work_hours}h</td>
                    <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{s.break_minutes}min</td>
                    <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{s.physical_minutes}min</td>
                    <td style={{ padding: '8px 10px', fontWeight: 500,
                      color: (s.wellness_score||0) >= 70 ? '#4ecca3' :
                             (s.wellness_score||0) >= 50 ? '#f9c74f' : '#f97066' }}>
                      {s.wellness_score}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
