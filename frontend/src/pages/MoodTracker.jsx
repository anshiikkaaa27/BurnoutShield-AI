import React, { useState, useEffect } from 'react';
import { Line } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale,
  PointElement, LineElement, Filler, Tooltip,
} from 'chart.js';
import api from '../api';

ChartJS.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip);

const MOODS = [
  { label: 'Exhausted', color: '#f97066', score: 1 },
  { label: 'Low',       color: '#f9c74f', score: 3 },
  { label: 'Neutral',   color: '#5a8caa', score: 5 },
  { label: 'Good',      color: '#4ecca3', score: 7 },
  { label: 'Great',     color: '#7c6cfa', score: 9 },
];

function SliderField({ label, min, max, value, onChange, color, unit = '' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 8 }}>
        <span style={{ fontSize: 12, color: '#5a6180' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>
          {value}{unit}
        </span>
      </div>
      <input
        type="range" min={min} max={max} step={unit === 'h' ? 0.5 : 1}
        value={value} onChange={onChange}
        style={{ width: '100%', accentColor: color }}
      />
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#3d4460', marginTop: 3 }}>
        <span>{min}{unit}</span><span>{max}{unit}</span>
      </div>
    </div>
  );
}

export default function MoodTracker() {
  const [selMood, setSelMood] = useState(null);
  const [stress,  setStress]  = useState(5);
  const [energy,  setEnergy]  = useState(6);
  const [sleep,   setSleep]   = useState(7);
  const [work,    setWork]    = useState(8);
  const [notes,   setNotes]   = useState('');
  const [saving,  setSaving]  = useState(false);
  const [saved,   setSaved]   = useState(false);
  const [logs,    setLogs]    = useState([]);
  const [summary, setSummary] = useState(null);
  const [loadErr, setLoadErr] = useState(false);

  const today = new Date().toISOString().split('T')[0];

  /* ── load logs & summary ── */
  useEffect(() => {
    Promise.all([api.get('/mood'), api.get('/mood/summary')])
      .then(([logsRes, sumRes]) => {
        setLogs(logsRes.data);
        setSummary(sumRes.data);
      })
      .catch(() => setLoadErr(true));
  }, [saved]);

  /* ── submit ── */
  const handleLog = async () => {
    if (!selMood) return;
    setSaving(true);
    try {
      await api.post('/mood', {
        date:        today,
        mood:        selMood,
        stress:      Number(stress),
        energy:      Number(energy),
        sleep_hours: Number(sleep),
        work_hours:  Number(work),
        notes,
      });
      setSaved(s => !s); // trigger reload
      setNotes('');
    } catch {
      /* silently ignore for offline dev */
    } finally {
      setSaving(false);
    }
  };

  /* ── streak dots (last 14 days) ── */
  const loggedDates = new Set(logs.map(l => l.date));
  const streakDots = Array.from({ length: 14 }, (_, i) => {
    const d = new Date();
    d.setDate(d.getDate() - (13 - i));
    const iso = d.toISOString().split('T')[0];
    const label = d.toLocaleDateString('en-US', { weekday: 'short' }).charAt(0);
    return { iso, label, done: loggedDates.has(iso) };
  });

  /* ── trend chart ── */
  const trendData = summary?.trend ?? [];
  const chartData = {
    labels: trendData.map(t => t.date.slice(5)), // MM-DD
    datasets: [
      {
        label: 'Stress',
        data: trendData.map(t => t.stress),
        borderColor: '#f97066', backgroundColor: 'rgba(249,112,102,.06)',
        fill: true, tension: 0.4, pointRadius: 2,
      },
      {
        label: 'Mood',
        data: trendData.map(t => t.mood),
        borderColor: '#7c6cfa', backgroundColor: 'rgba(124,108,250,.06)',
        fill: true, tension: 0.4, pointRadius: 2,
      },
    ],
  };
  const chartOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#5a6180', font: { size: 11 }, boxWidth: 10, boxHeight: 10 },
      },
    },
    scales: {
      x: { ticks: { color: '#3d4460', font: { size: 10 } }, grid: { color: '#191c2c' } },
      y: { ticks: { color: '#3d4460', font: { size: 10 } }, grid: { color: '#191c2c' }, min: 0, max: 10 },
    },
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div className="page-title">Daily Mood Log</div>
        <div className="page-subtitle">
          Track how you feel each day to improve burnout prediction accuracy
        </div>
      </div>

      {loadErr && (
        <div className="alert alert-warning">
          Backend unavailable — data shown may be stale. Start the API server to sync.
        </div>
      )}

      {/* ── mood selector ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500 }}>Current emotional state</div>
        <div style={{ fontSize: 12, color: '#5a6180', marginTop: 2, marginBottom: 16 }}>
          Select the option that best reflects how you feel right now
        </div>
        <div style={{ display: 'flex', gap: 8 }}>
          {MOODS.map(m => {
            const active = selMood === m.label;
            return (
              <button key={m.label} onClick={() => setSelMood(m.label)} style={{
                flex: 1, padding: '12px 8px', borderRadius: 8,
                border: `1px solid ${active ? m.color : '#1e2235'}`,
                background: active ? `${m.color}18` : '#0d1018',
                color: active ? m.color : '#4e5470',
                fontSize: 12, fontWeight: 500, cursor: 'pointer',
                transition: 'all .15s',
              }}>
                {m.label}
              </button>
            );
          })}
        </div>
        {selMood && (
          <div style={{ marginTop: 10, padding: '8px 12px', borderRadius: 8,
            background: '#0d1018', fontSize: 12, color: '#5a6180' }}>
            Selected —{' '}
            <span style={{ color: '#e2e4ed', fontWeight: 500 }}>{selMood}</span>
          </div>
        )}
      </div>

      {/* ── stress + energy ── */}
      <div className="grid-2">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Stress level</div>
          <SliderField label="How stressed do you feel?" min={0} max={10}
            value={stress} color="#f97066" onChange={e => setStress(e.target.value)} />
        </div>
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Energy level</div>
          <SliderField label="How energetic do you feel?" min={0} max={10}
            value={energy} color="#4ecca3" onChange={e => setEnergy(e.target.value)} />
        </div>
      </div>

      {/* ── sleep / work / notes ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Additional check-ins</div>
        <div style={{ display: 'grid', gap: 24 }}>
          <SliderField label="Hours slept last night" min={0} max={12} unit="h"
            value={sleep} color="#7c6cfa" onChange={e => setSleep(e.target.value)} />
          <SliderField label="Work / study hours today" min={0} max={16} unit="h"
            value={work} color="#f9c74f" onChange={e => setWork(e.target.value)} />
        </div>
        <textarea
          value={notes}
          onChange={e => setNotes(e.target.value)}
          placeholder="Optional notes about your day…"
          rows={2}
          className="input-field"
          style={{ marginTop: 20 }}
        />
      </div>

      {/* ── submit ── */}
      <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
        <button
          onClick={handleLog}
          disabled={saving || !selMood}
          className="btn btn-primary"
        >
          {saving ? <><span className="spinner" /> Saving…</> : 'Log today\'s check-in'}
        </button>
        {!selMood && (
          <span style={{ fontSize: 12, color: '#5a6180' }}>Select a mood to continue</span>
        )}
      </div>

      {/* ── 14-day streak ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500 }}>14-day check-in streak</div>
        <div style={{ fontSize: 12, color: '#5a6180', marginTop: 2, marginBottom: 16 }}>
          {summary ? `${summary.total_logs} total entries · ${summary.streak || 0} day streak` : '…'}
        </div>
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap' }}>
          {streakDots.map((d, i) => (
            <div key={i} style={{
              width: 34, height: 34, borderRadius: 7,
              display: 'flex', flexDirection: 'column',
              alignItems: 'center', justifyContent: 'center',
              fontSize: 10, fontWeight: 500,
              background: d.done ? 'rgba(78,204,163,.1)' : '#181b28',
              color: d.done ? '#4ecca3' : '#3d4460',
              border: d.iso === today ? '1px solid rgba(124,108,250,.4)' : '1px solid transparent',
            }}>
              {d.label}
            </div>
          ))}
        </div>
      </div>

      {/* ── trend chart ── */}
      {trendData.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500 }}>Stress & Mood Trend</div>
          <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 14 }}>
            Last {trendData.length} logged days
          </div>
          <div style={{ position: 'relative', height: 200 }}>
            <Line data={chartData} options={chartOpts} />
          </div>
        </div>
      )}

      {/* ── recent entries table ── */}
      {logs.length > 0 && (
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>Recent entries</div>
          <div style={{ overflowX: 'auto' }}>
            <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: 12 }}>
              <thead>
                <tr style={{ borderBottom: '1px solid #1e2235' }}>
                  {['Date', 'Mood', 'Stress', 'Energy', 'Sleep', 'Work'].map(h => (
                    <th key={h} style={{ textAlign: 'left', padding: '6px 10px',
                      color: '#3d4460', fontWeight: 500, whiteSpace: 'nowrap' }}>{h}</th>
                  ))}
                </tr>
              </thead>
              <tbody>
                {logs.slice(0, 10).map(l => {
                  const m = MOODS.find(x => x.label === l.mood) || {};
                  return (
                    <tr key={l.id} style={{ borderBottom: '1px solid #191c2c' }}>
                      <td style={{ padding: '8px 10px', color: '#5a6180' }}>{l.date}</td>
                      <td style={{ padding: '8px 10px', color: m.color || '#e2e4ed',
                        fontWeight: 500 }}>{l.mood}</td>
                      <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{l.stress}/10</td>
                      <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{l.energy}/10</td>
                      <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{l.sleep_hours}h</td>
                      <td style={{ padding: '8px 10px', color: '#e2e4ed' }}>{l.work_hours}h</td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
