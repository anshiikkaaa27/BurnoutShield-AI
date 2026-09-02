import React, { useState, useEffect } from 'react';
import api from '../api';

const ALL_DAYS = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];
const CATEGORIES = ['breaks', 'health', 'physical', 'recovery', 'sleep', 'check-in'];

const CAT_META = {
  'breaks':   { color: '#7c6cfa', bg: 'rgba(124,108,250,.08)', icon: '⏸' },
  'health':   { color: '#4ecca3', bg: 'rgba(78,204,163,.08)',  icon: '💧' },
  'physical': { color: '#f97066', bg: 'rgba(249,112,102,.08)', icon: '🏃' },
  'recovery': { color: '#f9c74f', bg: 'rgba(249,199,79,.08)',  icon: '🌿' },
  'sleep':    { color: '#a78bfa', bg: 'rgba(167,139,250,.08)', icon: '💤' },
  'check-in': { color: '#5a6180', bg: 'rgba(90,97,128,.08)',   icon: '📋' },
};

function ReminderCard({ reminder, onToggle, onDelete }) {
  const cat = CAT_META[reminder.category] || CAT_META['check-in'];
  return (
    <div className="card" style={{
      display: 'flex', alignItems: 'flex-start', gap: 14, padding: '16px 18px',
      opacity: reminder.enabled ? 1 : 0.55, transition: 'opacity .2s',
    }}>
      {/* icon */}
      <div style={{
        width: 38, height: 38, borderRadius: 10, flexShrink: 0,
        background: cat.bg, border: `1px solid ${cat.color}28`,
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 16,
      }}>
        {cat.icon}
      </div>

      {/* content */}
      <div style={{ flex: 1, minWidth: 0 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 3 }}>
          <span style={{ fontSize: 13, fontWeight: 500, color: '#e2e4ed' }}>
            {reminder.title}
          </span>
          <span style={{
            padding: '1px 8px', borderRadius: 10, fontSize: 10,
            background: cat.bg, color: cat.color, fontWeight: 500,
          }}>{reminder.category}</span>
        </div>
        {reminder.description && (
          <div style={{ fontSize: 12, color: '#5a6180', marginBottom: 8, lineHeight: 1.6 }}>
            {reminder.description}
          </div>
        )}
        <div style={{ display: 'flex', gap: 6, flexWrap: 'wrap', alignItems: 'center' }}>
          <span style={{ fontSize: 12, color: cat.color, fontWeight: 500 }}>
            🕐 {reminder.time}
          </span>
          <span style={{ color: '#2a2e45' }}>·</span>
          {reminder.days.map(d => (
            <span key={d} style={{
              padding: '1px 6px', borderRadius: 4, fontSize: 10,
              background: '#181b28', color: '#5a6180', border: '1px solid #2a2e45',
            }}>{d}</span>
          ))}
        </div>
      </div>

      {/* actions */}
      <div style={{ display: 'flex', flexDirection: 'column', gap: 6, flexShrink: 0 }}>
        <button onClick={() => onToggle(reminder.id, !reminder.enabled)} style={{
          padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: reminder.enabled ? 'rgba(78,204,163,.1)' : '#181b28',
          color: reminder.enabled ? '#4ecca3' : '#5a6180',
          fontSize: 11, fontWeight: 500, transition: 'all .15s',
        }}>
          {reminder.enabled ? 'On' : 'Off'}
        </button>
        <button onClick={() => onDelete(reminder.id)} style={{
          padding: '5px 10px', borderRadius: 6, border: 'none', cursor: 'pointer',
          background: 'rgba(249,112,102,.06)', color: '#f97066',
          fontSize: 11, transition: 'all .15s',
        }}>Delete</button>
      </div>
    </div>
  );
}

const EMPTY_FORM = {
  title: '', description: '', time: '09:00',
  days: ['Mon', 'Tue', 'Wed', 'Thu', 'Fri'],
  category: 'breaks', enabled: true,
};

export default function Reminders() {
  const [reminders,  setReminders]  = useState([]);
  const [loadErr,    setLoadErr]    = useState(false);
  const [showForm,   setShowForm]   = useState(false);
  const [form,       setForm]       = useState(EMPTY_FORM);
  const [saving,     setSaving]     = useState(false);
  const [reloadKey,  setReloadKey]  = useState(0);

  useEffect(() => {
    api.get('/reminders')
      .then(r => setReminders(r.data))
      .catch(() => setLoadErr(true));
  }, [reloadKey]);

  const reload = () => setReloadKey(k => k + 1);

  const handleToggle = async (id, enabled) => {
    try {
      await api.patch(`/reminders/${id}`, { enabled });
      reload();
    } catch {/* optimistic update */
      setReminders(prev => prev.map(r => r.id === id ? { ...r, enabled } : r));
    }
  };

  const handleDelete = async (id) => {
    try {
      await api.delete(`/reminders/${id}`);
      reload();
    } catch {
      setReminders(prev => prev.filter(r => r.id !== id));
    }
  };

  const handleSave = async () => {
    if (!form.title.trim() || form.days.length === 0) return;
    setSaving(true);
    try {
      await api.post('/reminders', form);
      setForm(EMPTY_FORM);
      setShowForm(false);
      reload();
    } catch {/* ignore */}
    finally { setSaving(false); }
  };

  const toggleDay = (day) => {
    setForm(f => ({
      ...f,
      days: f.days.includes(day) ? f.days.filter(d => d !== day) : [...f.days, day],
    }));
  };

  const activeCount   = reminders.filter(r => r.enabled).length;
  const inactiveCount = reminders.length - activeCount;

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">Smart Reminders</div>
            <div className="page-subtitle">
              Scheduled nudges for breaks, hydration, movement, sleep and daily check-ins
            </div>
          </div>
          <button onClick={() => setShowForm(s => !s)} className="btn btn-primary">
            {showForm ? 'Cancel' : '+ Add reminder'}
          </button>
        </div>
      </div>

      {loadErr && (
        <div className="alert alert-warning">
          Backend unavailable — changes won't persist until the server is running.
        </div>
      )}

      {/* ── summary ── */}
      <div className="grid-3">
        {[
          { label: 'Active reminders',   value: activeCount,   color: '#4ecca3' },
          { label: 'Paused',             value: inactiveCount, color: '#5a6180' },
          { label: 'Total reminders',    value: reminders.length, color: '#7c6cfa' },
        ].map(s => (
          <div key={s.label} className="card" style={{ padding: '14px 18px' }}>
            <div style={{ fontSize: 11, color: '#3d4460', textTransform: 'uppercase',
              letterSpacing: '.08em', marginBottom: 6 }}>{s.label}</div>
            <div style={{ fontFamily: 'Syne, sans-serif', fontSize: 24,
              fontWeight: 700, color: s.color }}>{s.value}</div>
          </div>
        ))}
      </div>

      {/* ── add form ── */}
      {showForm && (
        <div className="card fade-in">
          <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 18 }}>New reminder</div>
          <div style={{ display: 'grid', gap: 16 }}>
            <div>
              <label className="field-label">Title *</label>
              <input className="input-field" placeholder="e.g. Take a break"
                value={form.title} onChange={e => setForm(f => ({ ...f, title: e.target.value }))} />
            </div>
            <div>
              <label className="field-label">Description</label>
              <input className="input-field" placeholder="Optional details…"
                value={form.description}
                onChange={e => setForm(f => ({ ...f, description: e.target.value }))} />
            </div>
            <div className="grid-2">
              <div>
                <label className="field-label">Time</label>
                <input type="time" className="input-field" value={form.time}
                  onChange={e => setForm(f => ({ ...f, time: e.target.value }))} />
              </div>
              <div>
                <label className="field-label">Category</label>
                <select className="input-field" value={form.category}
                  onChange={e => setForm(f => ({ ...f, category: e.target.value }))}>
                  {CATEGORIES.map(c => <option key={c}>{c}</option>)}
                </select>
              </div>
            </div>
            <div>
              <label className="field-label">Days *</label>
              <div style={{ display: 'flex', gap: 6 }}>
                {ALL_DAYS.map(d => (
                  <button key={d} onClick={() => toggleDay(d)} style={{
                    width: 36, height: 36, borderRadius: 7, border: 'none', cursor: 'pointer',
                    background: form.days.includes(d) ? 'rgba(124,108,250,.15)' : '#181b28',
                    color: form.days.includes(d) ? '#9d90ff' : '#4e5470',
                    fontSize: 11, fontWeight: 500, transition: 'all .15s',
                    outline: form.days.includes(d) ? '1px solid rgba(124,108,250,.3)' : 'none',
                  }}>{d.charAt(0)}</button>
                ))}
              </div>
            </div>
          </div>
          <div style={{ display: 'flex', gap: 8, marginTop: 18 }}>
            <button onClick={handleSave} disabled={saving || !form.title.trim() || form.days.length === 0}
              className="btn btn-primary">
              {saving ? <><span className="spinner" /> Saving…</> : 'Save reminder'}
            </button>
            <button onClick={() => { setShowForm(false); setForm(EMPTY_FORM); }}
              className="btn btn-ghost">Cancel</button>
          </div>
        </div>
      )}

      {/* ── reminder list grouped by time ── */}
      {reminders.length > 0 ? (
        <div style={{ display: 'grid', gap: 10 }}>
          {reminders.map(r => (
            <ReminderCard key={r.id} reminder={r}
              onToggle={handleToggle} onDelete={handleDelete} />
          ))}
        </div>
      ) : (
        <div className="card" style={{ textAlign: 'center', padding: '32px', color: '#3d4460' }}>
          <div style={{ fontSize: 28, marginBottom: 10 }}>🔔</div>
          <div style={{ fontSize: 13 }}>No reminders yet. Add your first one above.</div>
        </div>
      )}

      {/* ── tips ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 14 }}>Why smart reminders help</div>
        <div style={{ display: 'grid', gap: 10 }}>
          {[
            { icon: '⏸', text: 'Regular break reminders reduce decision fatigue and mental exhaustion by up to 16% in long work sessions.' },
            { icon: '💧', text: 'Hydration reminders combat cognitive dip — even mild dehydration (1–2%) impairs focus and mood.' },
            { icon: '💤', text: 'Sleep preparation reminders help anchor your circadian rhythm, improving sleep quality within days.' },
            { icon: '📋', text: 'Daily check-in reminders ensure consistent tracking, which is the most reliable way to catch burnout early.' },
          ].map((t, i) => (
            <div key={i} style={{ display: 'flex', gap: 10, fontSize: 12,
              color: '#5a6180', lineHeight: 1.7, alignItems: 'flex-start' }}>
              <span style={{ fontSize: 15, flexShrink: 0 }}>{t.icon}</span>
              <span>{t.text}</span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
