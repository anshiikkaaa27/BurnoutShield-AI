import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const axis = {
  ticks: { color: '#3d4460', font: { size: 10 } },
  grid:  { color: '#191c2c' },
};

const TIPS = [
  {
    title: 'Time-blocking',
    desc: 'Protect 90-minute deep work blocks and batch meetings to the afternoon to preserve your peak focus hours.',
  },
  {
    title: 'Decline strategically',
    desc: 'Identify one low-priority task or recurring meeting to decline or delegate without guilt each day.',
  },
  {
    title: 'Shutdown ritual',
    desc: 'End each workday by writing three things you completed, then closing all work tabs at a fixed time.',
  },
  {
    title: 'Pomodoro technique',
    desc: '25 minutes of focused work followed by a 5-minute break. After four cycles, take a longer 20-minute break.',
  },
  {
    title: 'Single-tasking',
    desc: 'Close all tabs unrelated to one task before starting. Context-switching is the highest cognitive cost in modern work.',
  },
];

const RECOVERY_DATA = {
  labels: ['Week 1', 'Week 2', 'Week 3', 'Week 4', 'Week 5', 'Week 6'],
  datasets: [{
    data: [42, 48, 55, 51, 62, 68],
    borderColor: '#4ecca3',
    backgroundColor: 'rgba(78,204,163,.07)',
    fill: true, tension: 0.4, pointRadius: 4, pointBackgroundColor: '#4ecca3',
  }],
};

const RECOVERY_OPTS = {
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: axis, y: { ...axis, min: 0, max: 100 } },
};

function RecCard({ rec }) {
  const [done, setDone] = useState(false);
  return (
    <div style={{
      display: 'flex', alignItems: 'flex-start', gap: 14,
      padding: '16px 0',
      borderBottom: '1px solid #191c2c',
      opacity: done ? 0.5 : 1,
      transition: 'opacity .2s',
    }}>
      <div style={{
        width: 38, height: 38, borderRadius: 9, flexShrink: 0,
        background: rec.tag_bg, border: `1px solid ${rec.tag_color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        <div style={{ width: 8, height: 8, borderRadius: '50%', background: rec.tag_color }} />
      </div>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed',
          textDecoration: done ? 'line-through' : 'none' }}>
          {rec.title}
        </div>
        <div style={{ fontSize: 12, color: '#5a6180', marginTop: 4, lineHeight: 1.7 }}>
          {rec.desc}
        </div>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginTop: 8 }}>
          <span style={{
            display: 'inline-block', padding: '2px 9px', borderRadius: 6,
            fontSize: 11, fontWeight: 500, color: rec.tag_color, background: rec.tag_bg,
          }}>
            {rec.tag}
          </span>
          <button onClick={() => setDone(d => !d)} style={{
            fontSize: 11, background: 'none', border: 'none', cursor: 'pointer',
            color: done ? '#4ecca3' : '#3d4460', transition: 'color .15s',
          }}>
            {done ? '✓ Done' : 'Mark done'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default function Wellness() {
  const [recs,    setRecs]    = useState([]);
  const [conds,   setConds]   = useState([]);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);
  const [predicting, setPredicting] = useState(false);
  const [predResult, setPredResult] = useState(null);

  useEffect(() => {
    api.get('/recommendations')
      .then(r => {
        setRecs(r.data.recommendations);
        setConds(r.data.conditions);
      })
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  /* ── quick predict from sample data ── */
  const runPrediction = async () => {
    setPredicting(true);
    setPredResult(null);
    try {
      const res = await api.post('/predict', {
        age: 21, gender: 'female', course: 'Computer Science', year: '3rd',
        daily_study_hours: 4.0, daily_sleep_hours: 6.0, screen_time_hours: 6.5,
        stress_level: 'High', anxiety_score: 12, depression_score: 8,
        academic_pressure_score: 7, financial_stress_score: 3,
        social_support_score: 4, physical_activity_hours: 1.0,
        sleep_quality: 'Poor', attendance_percentage: 85.0,
        cgpa: 7.2, internet_quality: 'Good',
      });
      setPredResult(res.data.burnout_level);
    } catch {
      setPredResult('Error — backend not available');
    } finally {
      setPredicting(false);
    }
  };

  const riskColor = (level) => {
    if (!level) return '#5a6180';
    const l = level.toLowerCase();
    if (l === 'low')    return '#4ecca3';
    if (l === 'high')   return '#f97066';
    if (l === 'severe') return '#ff4d4d';
    return '#f9c74f';
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div className="page-title">Wellness Plan</div>
        <div className="page-subtitle">
          Personalised recommendations based on your burnout profile and recent check-in patterns
        </div>
      </div>

      {/* ── recommendations ── */}
      <div className="card">
        <div style={{ display: 'flex', justifyContent: 'space-between',
          alignItems: 'center', marginBottom: 4 }}>
          <div style={{ fontSize: 13, fontWeight: 500 }}>Today's recommendations</div>
          <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
            <button onClick={runPrediction} disabled={predicting}
              className="btn btn-ghost" style={{ fontSize: 12, padding: '5px 12px' }}>
              {predicting ? <><span className="spinner" style={{ width: 12, height: 12 }} /> Checking…</> : 'Run quick predict'}
            </button>
            {predResult && (
              <span style={{
                padding: '3px 10px', borderRadius: 6, fontSize: 11, fontWeight: 500,
                background: `${riskColor(predResult)}14`,
                color: riskColor(predResult),
                border: `1px solid ${riskColor(predResult)}28`,
              }}>
                {predResult}
              </span>
            )}
          </div>
        </div>

        {/* active conditions badges */}
        {conds.length > 0 && (
          <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', marginBottom: 16, marginTop: 8 }}>
            {conds.map(c => (
              <span key={c} style={{
                padding: '2px 9px', borderRadius: 10, fontSize: 10,
                background: '#181b28', color: '#5a6180', border: '1px solid #2a2e45',
              }}>{c.replace(/_/g, ' ')}</span>
            ))}
          </div>
        )}

        {loading && <div style={{ display: 'flex', gap: 10, color: '#5a6180', padding: '12px 0' }}>
          <span className="spinner" /> Loading recommendations…
        </div>}
        {error && <div className="alert alert-warning">
          Could not load recommendations. Backend may be offline.
        </div>}

        {recs.map((r, i) => <RecCard key={r.id || i} rec={r} />)}
      </div>

      {/* ── workload tips + recovery chart ── */}
      <div className="grid-2">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
            Workload management
          </div>
          {TIPS.map((t, i) => (
            <div key={i} style={{
              background: '#0d1018', border: '1px solid #1e2235',
              borderRadius: 9, padding: '12px 14px',
              marginBottom: i < TIPS.length - 1 ? 10 : 0,
            }}>
              <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{t.title}</div>
              <div style={{ fontSize: 12, color: '#5a6180', marginTop: 4, lineHeight: 1.6 }}>{t.desc}</div>
            </div>
          ))}
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500 }}>Recovery progress</div>
          <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 16 }}>
            Weekly recovery score — 6 week trend
          </div>
          <div style={{ position: 'relative', height: 200, marginBottom: 16 }}>
            <Line data={RECOVERY_DATA} options={RECOVERY_OPTS} />
          </div>

          {/* wellness dimensions */}
          <div style={{ display: 'grid', gap: 10 }}>
            {[
              { label: 'Sleep quality',   val: 52, color: '#4ecca3' },
              { label: 'Stress control',  val: 38, color: '#f9c74f' },
              { label: 'Physical health', val: 60, color: '#7c6cfa' },
              { label: 'Work-life balance', val: 44, color: '#f97066' },
            ].map(d => (
              <div key={d.label}>
                <div style={{ display: 'flex', justifyContent: 'space-between',
                  fontSize: 11, marginBottom: 4 }}>
                  <span style={{ color: '#5a6180' }}>{d.label}</span>
                  <span style={{ color: d.color, fontWeight: 500 }}>{d.val}%</span>
                </div>
                <div className="progress-track">
                  <div className="progress-fill" style={{ width: `${d.val}%`, background: d.color }} />
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* ── breathing exercise ── */}
      <div className="card" style={{
        background: 'linear-gradient(135deg, rgba(124,108,250,.06) 0%, rgba(78,204,163,.04) 100%)',
        border: '1px solid rgba(124,108,250,.2)',
      }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', gap: 16 }}>
          <div style={{ fontSize: 28, flexShrink: 0 }}>🫁</div>
          <div>
            <div style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed', marginBottom: 6 }}>
              Box breathing — quick stress reset
            </div>
            <div style={{ fontSize: 12, color: '#5a6180', lineHeight: 1.7 }}>
              Inhale for 4 counts → hold for 4 → exhale for 4 → hold for 4. Repeat 4–6 times.
              Box breathing activates the parasympathetic nervous system and reliably lowers cortisol
              within 3–5 minutes. Use it before high-pressure moments or when stress feels unmanageable.
            </div>
            <div style={{ display: 'flex', gap: 6, marginTop: 10, flexWrap: 'wrap' }}>
              {['4 counts in', 'Hold 4', '4 counts out', 'Hold 4'].map((s, i) => (
                <span key={i} style={{
                  padding: '3px 10px', borderRadius: 6, fontSize: 11,
                  background: 'rgba(124,108,250,.1)', color: '#9d90ff',
                  border: '1px solid rgba(124,108,250,.2)',
                }}>{s}</span>
              ))}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
