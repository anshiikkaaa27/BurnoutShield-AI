import React, { useState } from 'react';
import api from '../api';

const COURSES = [
  'Computer Science', 'Engineering', 'Business', 'Medicine', 'Law',
  'Arts', 'Psychology', 'Education', 'Mathematics', 'Biology', 'Other',
];
const YEARS   = ['1st', '2nd', '3rd', '4th', '5th', 'Postgraduate'];
const STRESS  = ['Low', 'Moderate', 'High', 'Severe'];
const QUALITY = ['Poor', 'Fair', 'Good', 'Excellent'];
const INET    = ['Poor', 'Average', 'Good', 'Excellent'];
const GENDER  = ['Male', 'Female', 'Non-binary', 'Prefer not to say'];

const RISK_PALETTE = {
  Low:      { color: '#4ecca3', bg: 'rgba(78,204,163,.08)',  border: 'rgba(78,204,163,.25)',  icon: '✅', label: 'Low Burnout Risk', msg: "Your current patterns suggest a healthy balance. Keep up your current routines and continue regular check-ins." },
  Moderate: { color: '#f9c74f', bg: 'rgba(249,199,79,.08)',  border: 'rgba(249,199,79,.25)',  icon: '⚠️', label: 'Moderate Burnout Risk', msg: "Some stress factors are elevated. Focus on improving sleep consistency and scheduling regular breaks during study sessions." },
  High:     { color: '#f97066', bg: 'rgba(249,112,102,.08)', border: 'rgba(249,112,102,.25)', icon: '🔴', label: 'High Burnout Risk', msg: "Multiple risk indicators are elevated. Strongly consider reducing your workload, improving sleep, and speaking with a counsellor or mentor." },
  Severe:   { color: '#ff4d4d', bg: 'rgba(255,77,77,.08)',   border: 'rgba(255,77,77,.25)',   icon: '🚨', label: 'Severe Burnout Risk', msg: "Critical burnout indicators detected. Please speak with a trusted person, counsellor, or mental health professional urgently." },
};

function Field({ label, children, hint }) {
  return (
    <div>
      <label className="field-label">{label}</label>
      {hint && <div style={{ fontSize: 11, color: '#3d4460', marginBottom: 5, marginTop: -2 }}>{hint}</div>}
      {children}
    </div>
  );
}

function ScoreSlider({ label, min = 0, max = 10, value, onChange, color = '#7c6cfa' }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5 }}>
        <span style={{ fontSize: 12, color: '#5a6180' }}>{label}</span>
        <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>{value} / {max}</span>
      </div>
      <input type="range" min={min} max={max} value={value} onChange={onChange}
        style={{ width: '100%', accentColor: color }} />
      <div style={{ display: 'flex', justifyContent: 'space-between',
        fontSize: 10, color: '#3d4460', marginTop: 3 }}>
        <span>Low</span><span>High</span>
      </div>
    </div>
  );
}

export default function AIAssessment() {
  const [form, setForm] = useState({
    age:                        21,
    gender:                     'Female',
    course:                     'Computer Science',
    year:                       '3rd',
    daily_study_hours:          4.0,
    daily_sleep_hours:          6.5,
    screen_time_hours:          5.0,
    stress_level:               'Moderate',
    anxiety_score:              6,
    depression_score:           5,
    academic_pressure_score:    6,
    financial_stress_score:     4,
    social_support_score:       5,
    physical_activity_hours:    1.0,
    sleep_quality:              'Fair',
    attendance_percentage:      85,
    cgpa:                       7.5,
    internet_quality:           'Good',
  });

  const [result,  setResult]  = useState(null);
  const [loading, setLoading] = useState(false);
  const [error,   setError]   = useState('');

  const set = (key, val) => setForm(f => ({ ...f, [key]: val }));

  const handleSubmit = async () => {
    setLoading(true);
    setError('');
    setResult(null);
    try {
      const payload = {
        ...form,
        gender: form.gender.toLowerCase(),
        age:                        Number(form.age),
        daily_study_hours:          Number(form.daily_study_hours),
        daily_sleep_hours:          Number(form.daily_sleep_hours),
        screen_time_hours:          Number(form.screen_time_hours),
        anxiety_score:              Number(form.anxiety_score),
        depression_score:           Number(form.depression_score),
        academic_pressure_score:    Number(form.academic_pressure_score),
        financial_stress_score:     Number(form.financial_stress_score),
        social_support_score:       Number(form.social_support_score),
        physical_activity_hours:    Number(form.physical_activity_hours),
        attendance_percentage:      Number(form.attendance_percentage),
        cgpa:                       Number(form.cgpa),
      };
      const res = await api.post('/predict', payload);
      setResult(res.data.burnout_level);
    } catch (e) {
      if (e?.response?.data?.detail) {
        setError(typeof e.response.data.detail === 'string'
          ? e.response.data.detail
          : JSON.stringify(e.response.data.detail));
      } else {
        setError('Could not reach the API. Make sure the backend is running on port 8000.');
      }
    } finally {
      setLoading(false);
    }
  };

  const rp = result ? (RISK_PALETTE[result] || {
    color: '#7c6cfa', bg: 'rgba(124,108,250,.08)', border: 'rgba(124,108,250,.25)',
    icon: '📊', label: `${result} Burnout Risk`,
    msg: 'Assessment complete. Review your wellness plan for personalised recommendations.',
  }) : null;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div className="page-title">AI Burnout Assessment</div>
        <div className="page-subtitle">
          Fill in your academic and lifestyle details — the ML model predicts your burnout risk level
        </div>
      </div>

      {/* ── result banner ── */}
      {rp && (
        <div className="fade-in" style={{
          padding: '20px 22px', borderRadius: 12,
          background: rp.bg, border: `1px solid ${rp.border}`,
          display: 'flex', gap: 18, alignItems: 'flex-start',
        }}>
          <span style={{ fontSize: 28, flexShrink: 0 }}>{rp.icon}</span>
          <div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 18,
              fontWeight: 700, color: rp.color, marginBottom: 6 }}>
              {rp.label}
            </div>
            <div style={{ fontSize: 13, color: rp.color, opacity: .85, lineHeight: 1.7 }}>
              {rp.msg}
            </div>
          </div>
        </div>
      )}

      {error && <div className="alert alert-danger">{error}</div>}

      {/* ─────────── FORM ─────────── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Personal details</div>
        <div className="grid-3" style={{ gap: 16 }}>
          <Field label="Age">
            <input type="number" className="input-field" min={14} max={60}
              value={form.age} onChange={e => set('age', e.target.value)} />
          </Field>
          <Field label="Gender">
            <select className="input-field" value={form.gender}
              onChange={e => set('gender', e.target.value)}>
              {GENDER.map(g => <option key={g}>{g}</option>)}
            </select>
          </Field>
          <Field label="Course / Programme">
            <select className="input-field" value={form.course}
              onChange={e => set('course', e.target.value)}>
              {COURSES.map(c => <option key={c}>{c}</option>)}
            </select>
          </Field>
          <Field label="Year of study">
            <select className="input-field" value={form.year}
              onChange={e => set('year', e.target.value)}>
              {YEARS.map(y => <option key={y}>{y}</option>)}
            </select>
          </Field>
          <Field label="CGPA">
            <input type="number" className="input-field" min={0} max={10} step={0.1}
              value={form.cgpa} onChange={e => set('cgpa', e.target.value)} />
          </Field>
          <Field label="Attendance (%)">
            <input type="number" className="input-field" min={0} max={100}
              value={form.attendance_percentage}
              onChange={e => set('attendance_percentage', e.target.value)} />
          </Field>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Daily habits</div>
        <div style={{ display: 'grid', gap: 22 }}>
          <ScoreSlider label="Daily study hours" min={0} max={14}
            value={form.daily_study_hours} color="#7c6cfa"
            onChange={e => set('daily_study_hours', e.target.value)} />
          <ScoreSlider label="Daily sleep hours" min={0} max={12}
            value={form.daily_sleep_hours} color="#4ecca3"
            onChange={e => set('daily_sleep_hours', e.target.value)} />
          <ScoreSlider label="Screen time hours (total)" min={0} max={16}
            value={form.screen_time_hours} color="#f9c74f"
            onChange={e => set('screen_time_hours', e.target.value)} />
          <ScoreSlider label="Physical activity hours" min={0} max={6}
            value={form.physical_activity_hours} color="#f97066"
            onChange={e => set('physical_activity_hours', e.target.value)} />
        </div>

        <hr className="divider" style={{ margin: '22px 0' }} />

        <div className="grid-3" style={{ gap: 16 }}>
          <Field label="Stress level">
            <select className="input-field" value={form.stress_level}
              onChange={e => set('stress_level', e.target.value)}>
              {STRESS.map(s => <option key={s}>{s}</option>)}
            </select>
          </Field>
          <Field label="Sleep quality">
            <select className="input-field" value={form.sleep_quality}
              onChange={e => set('sleep_quality', e.target.value)}>
              {QUALITY.map(q => <option key={q}>{q}</option>)}
            </select>
          </Field>
          <Field label="Internet quality">
            <select className="input-field" value={form.internet_quality}
              onChange={e => set('internet_quality', e.target.value)}>
              {INET.map(i => <option key={i}>{i}</option>)}
            </select>
          </Field>
        </div>
      </div>

      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 20 }}>Mental health scores</div>
        <div style={{ display: 'grid', gap: 22 }}>
          <ScoreSlider label="Anxiety score"            value={form.anxiety_score}
            color="#f97066" onChange={e => set('anxiety_score', e.target.value)} />
          <ScoreSlider label="Depression score"         value={form.depression_score}
            color="#f9c74f" onChange={e => set('depression_score', e.target.value)} />
          <ScoreSlider label="Academic pressure"        value={form.academic_pressure_score}
            color="#7c6cfa" onChange={e => set('academic_pressure_score', e.target.value)} />
          <ScoreSlider label="Financial stress"         value={form.financial_stress_score}
            color="#f97066" onChange={e => set('financial_stress_score', e.target.value)} />
          <ScoreSlider label="Social support (higher = more support)" value={form.social_support_score}
            color="#4ecca3" onChange={e => set('social_support_score', e.target.value)} />
        </div>
      </div>

      <div style={{ display: 'flex', gap: 12, alignItems: 'center' }}>
        <button onClick={handleSubmit} disabled={loading} className="btn btn-primary"
          style={{ padding: '11px 28px', fontSize: 14 }}>
          {loading
            ? <><span className="spinner" /> Running assessment…</>
            : '🤖 Run AI Assessment'}
        </button>
        {result && (
          <button onClick={() => setResult(null)} className="btn btn-ghost">Reset</button>
        )}
      </div>
    </div>
  );
}
