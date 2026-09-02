import React, { useEffect, useState } from 'react';
import { Line, Radar, Bar } from 'react-chartjs-2';
import {
  Chart as ChartJS, CategoryScale, LinearScale, PointElement,
  LineElement, RadialLinearScale, BarElement, Filler, Tooltip, Legend,
} from 'chart.js';
import api from '../api';

ChartJS.register(
  CategoryScale, LinearScale, PointElement, LineElement,
  RadialLinearScale, BarElement, Filler, Tooltip, Legend,
);

/* ── shared chart axis style ── */
const axis = {
  ticks: { color: '#3d4460', font: { size: 10 } },
  grid:  { color: '#191c2c' },
};
const lineOpts = (max) => ({
  responsive: true, maintainAspectRatio: false,
  plugins: { legend: { display: false } },
  scales: { x: axis, y: { ...axis, min: 0, max } },
});

/* ── animated SVG gauge ── */
function Gauge({ score, color }) {
  const r = 50;
  const circ = 2 * Math.PI * r;
  const half = circ / 2;                      // semicircle
  const fill = (score / 100) * half;
  const offset = half - fill;
  return (
    <svg width={128} height={72} viewBox="0 0 128 72" style={{ overflow: 'visible' }}>
      {/* track */}
      <path
        d={`M 14 64 A ${r} ${r} 0 0 1 114 64`}
        fill="none" stroke="#1e2235" strokeWidth={10} strokeLinecap="round"
      />
      {/* fill */}
      <path
        d={`M 14 64 A ${r} ${r} 0 0 1 114 64`}
        fill="none" stroke={color} strokeWidth={10} strokeLinecap="round"
        strokeDasharray={`${half} ${half}`}
        strokeDashoffset={offset}
        style={{ transition: 'stroke-dashoffset 1.2s ease' }}
      />
      <text x={64} y={57} textAnchor="middle"
        fontFamily="Syne,sans-serif" fontSize={22} fontWeight={700} fill={color}>
        {score}
      </text>
      <text x={64} y={70} textAnchor="middle"
        fontFamily="DM Sans,sans-serif" fontSize={9} fill="#5a6180">
        out of 100
      </text>
    </svg>
  );
}

/* ── stat card ── */
function StatCard({ label, value, note, color }) {
  return (
    <div className="card" style={{ padding: '16px 18px' }}>
      <div style={{ fontSize: 11, color: '#3d4460', textTransform: 'uppercase',
        letterSpacing: '.08em', marginBottom: 8 }}>{label}</div>
      <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 22,
        fontWeight: 700, color }}>{value}</div>
      <div style={{ fontSize: 11, color: '#5a6180', marginTop: 5 }}>{note}</div>
    </div>
  );
}

/* ── quick-action pill ── */
function QuickAction({ label, color, bg, onClick }) {
  return (
    <button onClick={onClick} style={{
      padding: '7px 14px', borderRadius: 20,
      background: bg, border: `1px solid ${color}30`,
      color, fontSize: 12, fontWeight: 500, cursor: 'pointer',
      transition: 'opacity .15s',
    }}
    onMouseEnter={e => e.currentTarget.style.opacity = '.8'}
    onMouseLeave={e => e.currentTarget.style.opacity = '1'}>
      {label}
    </button>
  );
}

export default function Dashboard({ setActivePage }) {
  const [data,    setData]    = useState(null);
  const [loading, setLoading] = useState(true);
  const [error,   setError]   = useState(false);

  useEffect(() => {
    api.get('/dashboard')
      .then(r => setData(r.data))
      .catch(() => setError(true))
      .finally(() => setLoading(false));
  }, []);

  if (loading) return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 12, color: '#5a6180', marginTop: 60 }}>
      <span className="spinner" /> Loading dashboard…
    </div>
  );

  if (error || !data) return (
    <div className="alert alert-danger" style={{ marginTop: 24 }}>
      Could not load dashboard data. Make sure the backend is running on port 8000.
    </div>
  );

  /* ── chart datasets ── */
  const stressChartData = {
    labels: data.stress_trend.labels,
    datasets: [{
      data: data.stress_trend.data,
      borderColor: '#f97066',
      backgroundColor: 'rgba(249,112,102,.06)',
      fill: true, tension: 0.4, pointRadius: 2, pointHoverRadius: 5,
    }],
  };

  const moodBarData = {
    labels: data.mood_comparison.labels,
    datasets: [
      {
        label: 'This week',
        data: data.mood_comparison.this_week,
        backgroundColor: 'rgba(124,108,250,.65)',
        borderRadius: 4,
      },
      {
        label: 'Last week',
        data: data.mood_comparison.last_week,
        backgroundColor: 'rgba(78,204,163,.35)',
        borderRadius: 4,
      },
    ],
  };

  const moodBarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#5a6180', font: { size: 11 }, boxWidth: 10, boxHeight: 10 },
      },
    },
    scales: { x: axis, y: { ...axis, min: 0, max: 10 } },
  };

  const radarData = {
    labels: data.radar.labels,
    datasets: [
      {
        label: 'You',
        data: data.radar.you,
        backgroundColor: 'rgba(124,108,250,.12)',
        borderColor: '#7c6cfa', borderWidth: 2, pointRadius: 3,
      },
      {
        label: 'Healthy',
        data: data.radar.healthy,
        backgroundColor: 'rgba(78,204,163,.06)',
        borderColor: '#4ecca3', borderWidth: 1.5,
        borderDash: [4, 4], pointRadius: 2,
      },
    ],
  };

  const radarOpts = {
    responsive: true, maintainAspectRatio: false,
    plugins: {
      legend: {
        display: true,
        labels: { color: '#5a6180', font: { size: 11 }, boxWidth: 10, boxHeight: 10 },
      },
    },
    scales: { r: {
      ticks: { color: '#3d4460', font: { size: 9 }, backdropColor: 'transparent' },
      grid:  { color: '#191c2c' },
      pointLabels: { color: '#6b7494', font: { size: 11 } },
      min: 0, max: 100,
      angleLines: { color: '#191c2c' },
    }},
  };

  const s = data.stats;
  const stats = [
    { label: 'Avg Sleep',  value: s.avg_sleep,   note: s.avg_sleep_note,   color: s.avg_sleep_color   },
    { label: 'Work Hours', value: s.work_hours,   note: s.work_hours_note,  color: s.work_hours_color  },
    { label: 'Mood Score', value: s.mood_score,   note: s.mood_score_note,  color: s.mood_score_color  },
    { label: 'Streak',     value: `${s.streak}d`, note: s.streak_note,      color: s.streak_color      },
  ];

  /* ── risk colour ── */
  const riskPalette = {
    'Low Risk':      { color: '#4ecca3', bg: 'rgba(78,204,163,.08)',  border: 'rgba(78,204,163,.2)'  },
    'Moderate Risk': { color: '#f9c74f', bg: 'rgba(249,199,79,.08)',  border: 'rgba(249,199,79,.2)'  },
    'High Risk':     { color: '#f97066', bg: 'rgba(249,112,102,.08)', border: 'rgba(249,112,102,.2)' },
  };
  const rp = riskPalette[data.risk_level] || riskPalette['Moderate Risk'];

  return (
    <div style={{ display: 'grid', gap: 16 }}>

      {/* ── header ── */}
      <div className="page-header">
        <div className="page-title">Burnout Overview</div>
        <div className="page-subtitle">Last updated today — based on 14 days of tracking data</div>
      </div>

      {/* ── alert ── */}
      <div className="alert alert-warning">{data.alert}</div>

      {/* ── risk card ── */}
      <div className="card" style={{ display: 'flex', alignItems: 'center', gap: 32, flexWrap: 'wrap' }}>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', gap: 8 }}>
          <Gauge score={data.burnout_score} color={rp.color} />
          <div style={{
            padding: '3px 14px', borderRadius: 20,
            background: rp.bg, border: `1px solid ${rp.border}`,
            color: rp.color, fontSize: 12, fontWeight: 500,
          }}>
            {data.risk_level}
          </div>
        </div>

        <div style={{ flex: 1, minWidth: 240 }}>
          <div style={{ fontSize: 11, color: '#5a6180', textTransform: 'uppercase',
            letterSpacing: '.1em', marginBottom: 6 }}>Burnout Risk Score</div>
          <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 48,
            fontWeight: 700, color: rp.color, lineHeight: 1 }}>
            {data.burnout_score}
          </div>
          <div style={{ fontSize: 13, color: '#5a6180', marginTop: 12,
            lineHeight: 1.75, maxWidth: 420 }}>
            Elevated stress with reduced recovery time detected. Consider scheduling short breaks
            between meetings and protecting your sleep schedule this week.
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 16, flexWrap: 'wrap' }}>
            <QuickAction label="Log today's mood" color="#7c6cfa" bg="rgba(124,108,250,.08)"
              onClick={() => setActivePage('tracker')} />
            <QuickAction label="View recommendations" color="#4ecca3" bg="rgba(78,204,163,.08)"
              onClick={() => setActivePage('wellness')} />
            <QuickAction label="Run AI assessment" color="#f9c74f" bg="rgba(249,199,79,.08)"
              onClick={() => setActivePage('assessment')} />
          </div>
        </div>
      </div>

      {/* ── stat cards ── */}
      <div className="grid-4">
        {stats.map(s => <StatCard key={s.label} {...s} />)}
      </div>

      {/* ── charts row ── */}
      <div className="grid-2">
        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500 }}>Stress — 14 Day Trend</div>
          <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 14 }}>Daily stress level 0–10</div>
          <div style={{ position: 'relative', height: 195 }}>
            <Line data={stressChartData} options={lineOpts(10)} />
          </div>
        </div>

        <div className="card">
          <div style={{ fontSize: 13, fontWeight: 500 }}>Weekly Mood Comparison</div>
          <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 14 }}>This week vs last week</div>
          <div style={{ position: 'relative', height: 195 }}>
            <Bar data={moodBarData} options={moodBarOpts} />
          </div>
        </div>
      </div>

      {/* ── radar ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500 }}>Burnout Factor Breakdown</div>
        <div style={{ fontSize: 11, color: '#5a6180', marginBottom: 14 }}>
          Five key dimensions contributing to your current risk score — dashed line shows healthy baseline
        </div>
        <div style={{ position: 'relative', height: 280 }}>
          <Radar data={radarData} options={radarOpts} />
        </div>
      </div>

      {/* ── bottom cta row ── */}
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: 12 }}>
        {[
          { label: '💬 Chat with AI wellness assistant', page: 'chat',       color: '#7c6cfa' },
          { label: '💤 Log sleep & work session',        page: 'sleep',      color: '#4ecca3' },
          { label: '📓 Write a journal entry',           page: 'journal',    color: '#f9c74f' },
        ].map(item => (
          <button key={item.page} onClick={() => setActivePage(item.page)}
            style={{
              padding: '14px 16px', borderRadius: 10,
              background: '#12151f', border: `1px solid #1e2235`,
              color: item.color, fontSize: 13, fontWeight: 500,
              textAlign: 'left', cursor: 'pointer',
              transition: 'border-color .15s',
            }}
            onMouseEnter={e => e.currentTarget.style.borderColor = item.color + '40'}
            onMouseLeave={e => e.currentTarget.style.borderColor = '#1e2235'}>
            {item.label}
          </button>
        ))}
      </div>

    </div>
  );
}
