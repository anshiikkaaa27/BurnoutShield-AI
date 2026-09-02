import React, { useState, useEffect } from 'react';
import api from '../api';

function SentimentBar({ label, val, color }) {
  return (
    <div>
      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: 12, marginBottom: 5 }}>
        <span style={{ color: '#5a6180' }}>{label}</span>
        <span style={{ color, fontWeight: 500 }}>{val}%</span>
      </div>
      <div className="progress-track">
        <div className="progress-fill" style={{ width: `${val}%`, background: color }} />
      </div>
    </div>
  );
}

function SentimentTag({ label, pct, color, bg }) {
  return (
    <span style={{
      display: 'inline-block', padding: '2px 9px', borderRadius: 6,
      fontSize: 11, fontWeight: 500, color, background: bg, marginRight: 6,
    }}>
      {label} {pct}%
    </span>
  );
}

const TONE_COLORS = {
  positive: { color: '#4ecca3', bg: 'rgba(78,204,163,.1)'  },
  neutral:  { color: '#f9c74f', bg: 'rgba(249,199,79,.1)'  },
  negative: { color: '#f97066', bg: 'rgba(249,112,102,.1)' },
};

export default function Journal() {
  const [text,       setText]       = useState('');
  const [liveResult, setLiveResult] = useState(null);
  const [saving,     setSaving]     = useState(false);
  const [entries,    setEntries]    = useState([]);
  const [loadErr,    setLoadErr]    = useState(false);
  const [reloadKey,  setReloadKey]  = useState(0);
  const [analyzing,  setAnalyzing]  = useState(false);

  /* ── load entries ── */
  useEffect(() => {
    api.get('/journal')
      .then(r => setEntries(r.data))
      .catch(() => setLoadErr(true));
  }, [reloadKey]);

  /* ── live sentiment debounce ── */
  useEffect(() => {
    if (!text.trim()) { setLiveResult(null); return; }
    const id = setTimeout(() => {
      setAnalyzing(true);
      api.post('/journal/analyze', { text })
        .then(r => setLiveResult(r.data))
        .catch(() => {/* offline */})
        .finally(() => setAnalyzing(false));
    }, 600);
    return () => clearTimeout(id);
  }, [text]);

  /* ── save entry ── */
  const handleSave = async () => {
    if (!text.trim()) return;
    setSaving(true);
    const now = new Date();
    const friendly = now.toLocaleDateString('en-US', { month: 'long', day: 'numeric', year: 'numeric' });
    const iso = now.toISOString().split('T')[0];
    try {
      await api.post('/journal', { text, date: friendly, date_iso: iso });
      setText('');
      setLiveResult(null);
      setReloadKey(k => k + 1);
    } catch {
      /* allow offline use */
    } finally {
      setSaving(false);
    }
  };

  /* ── delete entry ── */
  const handleDelete = async (id) => {
    try {
      await api.delete(`/journal/${id}`);
      setReloadKey(k => k + 1);
    } catch {/* ignore */}
  };

  return (
    <div style={{ display: 'grid', gap: 16 }}>
      <div className="page-header">
        <div className="page-title">Reflection Journal</div>
        <div className="page-subtitle">
          Write freely — entries are analyzed for emotional tone to improve burnout tracking
        </div>
      </div>

      {loadErr && (
        <div className="alert alert-warning">
          Backend unavailable. New entries won't persist until the server is running.
        </div>
      )}

      {/* ── editor ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500 }}>Today's entry</div>
        <div style={{ fontSize: 12, color: '#5a6180', marginTop: 2, marginBottom: 14 }}>
          Describe how your day went, what's on your mind, or anything that felt significant
        </div>
        <textarea
          value={text}
          onChange={e => setText(e.target.value)}
          placeholder="Write your thoughts here…"
          rows={6}
          className="input-field"
        />

        {/* live sentiment preview */}
        {liveResult && (
          <div style={{ marginTop: 14, padding: '14px 16px', borderRadius: 8, background: '#0d1018' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
              <span style={{ fontSize: 12, color: '#5a6180' }}>Live sentiment</span>
              {analyzing && <span className="spinner" style={{ width: 13, height: 13 }} />}
            </div>
            <div style={{ display: 'grid', gap: 10 }}>
              <SentimentBar label="Positive" val={liveResult.positive} color="#4ecca3" />
              <SentimentBar label="Neutral"  val={liveResult.neutral}  color="#3d4460" />
              <SentimentBar label="Negative" val={liveResult.negative} color="#f97066" />
            </div>
            {liveResult.note && (
              <div style={{ marginTop: 12, fontSize: 12, color: '#5a6180', lineHeight: 1.7,
                padding: '10px 12px', borderRadius: 7, background: '#181b28' }}>
                {liveResult.note}
              </div>
            )}
          </div>
        )}

        <div style={{ display: 'flex', gap: 8, marginTop: 14, justifyContent: 'flex-end' }}>
          <button onClick={() => { setText(''); setLiveResult(null); }}
            className="btn btn-ghost">Clear</button>
          <button onClick={handleSave} disabled={saving || !text.trim()}
            className="btn btn-primary">
            {saving ? <><span className="spinner" /> Saving…</> : 'Save entry'}
          </button>
        </div>
      </div>

      {/* ── past entries ── */}
      <div className="card">
        <div style={{ fontSize: 13, fontWeight: 500, marginBottom: 16 }}>
          Past entries{entries.length > 0 && <span style={{ color: '#3d4460', fontWeight: 400,
            fontSize: 12, marginLeft: 8 }}>({entries.length})</span>}
        </div>
        {entries.length === 0 && (
          <div style={{ fontSize: 13, color: '#3d4460', textAlign: 'center', padding: '24px 0' }}>
            No entries yet. Write your first one above.
          </div>
        )}
        {entries.map((e, i) => (
          <div key={e.id} style={{
            padding: '16px',
            background: '#0d1018',
            borderRadius: 8,
            marginBottom: i < entries.length - 1 ? 10 : 0,
            borderLeft: `2px solid ${
              e.sentiment.positive > e.sentiment.negative ? '#4ecca3' :
              e.sentiment.negative > 50 ? '#f97066' : '#f9c74f'
            }`,
          }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: 6 }}>
              <span style={{ fontSize: 11, color: '#3d4460' }}>{e.date}</span>
              <button onClick={() => handleDelete(e.id)} style={{
                background: 'none', border: 'none', cursor: 'pointer',
                color: '#3d4460', fontSize: 11, padding: '0 2px',
              }} title="Delete entry">✕</button>
            </div>
            <div style={{ fontSize: 13, color: '#8891aa', lineHeight: 1.7 }}>{e.text}</div>
            {e.note && (
              <div style={{ fontSize: 11, color: '#5a6180', marginTop: 8,
                padding: '7px 10px', borderRadius: 6, background: '#181b28', lineHeight: 1.6 }}>
                {e.note}
              </div>
            )}
            <div style={{ marginTop: 10 }}>
              <SentimentTag label="Positive" pct={e.sentiment.positive}
                color={TONE_COLORS.positive.color} bg={TONE_COLORS.positive.bg} />
              <SentimentTag label="Neutral"  pct={e.sentiment.neutral}
                color={TONE_COLORS.neutral.color}  bg={TONE_COLORS.neutral.bg}  />
              <SentimentTag label="Negative" pct={e.sentiment.negative}
                color={TONE_COLORS.negative.color} bg={TONE_COLORS.negative.bg} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
