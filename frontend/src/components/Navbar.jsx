import React, { useState, useRef, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';

const tabs = [
  { id: 'dashboard',  label: 'Dashboard',    icon: '📊' },
  { id: 'tracker',    label: 'Mood Log',      icon: '😊' },
  { id: 'journal',    label: 'Journal',       icon: '📓' },
  { id: 'sleep',      label: 'Sleep & Work',  icon: '💤' },
  { id: 'wellness',   label: 'Wellness',      icon: '🌿' },
  { id: 'assessment', label: 'AI Assessment', icon: '🤖' },
  { id: 'chat',       label: 'AI Chat',       icon: '💬' },
  { id: 'reminders',  label: 'Reminders',     icon: '🔔' },
];

export default function Navbar({ activePage, setActivePage }) {
  const { user, logout } = useAuth();
  const [menuOpen, setMenuOpen] = useState(false);
  const menuRef = useRef(null);

  /* close menu on outside click */
  useEffect(() => {
    const handler = (e) => {
      if (menuRef.current && !menuRef.current.contains(e.target)) setMenuOpen(false);
    };
    document.addEventListener('mousedown', handler);
    return () => document.removeEventListener('mousedown', handler);
  }, []);

  const initials  = user?.initials  || user?.name?.slice(0, 2).toUpperCase() || '??';
  const firstName = user?.name?.split(' ')[0] || 'User';

  return (
    <nav style={{
      display: 'flex',
      alignItems: 'center',
      justifyContent: 'space-between',
      padding: '0 20px',
      height: 56,
      background: '#0d0f17',
      borderBottom: '1px solid #1a1d2e',
      position: 'sticky',
      top: 0,
      zIndex: 200,
      gap: 12,
    }}>

      {/* ── Logo ── */}
      <button
        onClick={() => setActivePage('dashboard')}
        style={{
          display: 'flex', alignItems: 'center', gap: 9,
          background: 'none', border: 'none', cursor: 'pointer',
          fontFamily: 'Syne, sans-serif', fontSize: 14, fontWeight: 700,
          letterSpacing: '.01em', color: '#e2e4ed', flexShrink: 0,
          padding: 0,
        }}
      >
        <div style={{
          width: 26, height: 26, borderRadius: 7,
          background: 'linear-gradient(135deg, #7c6cfa 0%, #4ecca3 100%)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          fontSize: 13, flexShrink: 0,
        }}>🛡</div>
        BurnoutShield
      </button>

      {/* ── Nav tabs ── */}
      <div style={{
        display: 'flex', gap: 1, overflowX: 'auto', flex: 1,
        msOverflowStyle: 'none', scrollbarWidth: 'none',
      }}>
        {tabs.map(tab => {
          const active = activePage === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActivePage(tab.id)}
              style={{
                display: 'flex', alignItems: 'center', gap: 5,
                padding: '5px 11px', borderRadius: 6, border: 'none',
                cursor: 'pointer', whiteSpace: 'nowrap',
                fontSize: 12, fontFamily: 'DM Sans, sans-serif',
                fontWeight: active ? 500 : 400,
                background: active ? 'rgba(124,108,250,.14)' : 'transparent',
                color: active ? '#9d90ff' : '#4e5470',
                transition: 'all .15s',
              }}
              onMouseEnter={e => { if (!active) e.currentTarget.style.color = '#8891aa'; }}
              onMouseLeave={e => { if (!active) e.currentTarget.style.color = '#4e5470'; }}
            >
              <span style={{ fontSize: 12 }}>{tab.icon}</span>
              {tab.label}
            </button>
          );
        })}
      </div>

      {/* ── User menu ── */}
      <div ref={menuRef} style={{ position: 'relative', flexShrink: 0 }}>
        <button
          onClick={() => setMenuOpen(o => !o)}
          style={{
            display: 'flex', alignItems: 'center', gap: 8,
            background: menuOpen ? 'rgba(124,108,250,.12)' : 'transparent',
            border: '1px solid',
            borderColor: menuOpen ? 'rgba(124,108,250,.3)' : '#1e2235',
            borderRadius: 8, padding: '5px 10px 5px 6px',
            cursor: 'pointer', transition: 'all .15s',
          }}
          aria-label="User menu"
          aria-expanded={menuOpen}
        >
          {/* avatar */}
          <div style={{
            width: 26, height: 26, borderRadius: '50%',
            background: 'linear-gradient(135deg, #7c6cfa, #4ecca3)',
            display: 'flex', alignItems: 'center', justifyContent: 'center',
            fontSize: 10, fontWeight: 700, color: '#fff', flexShrink: 0,
          }}>
            {initials}
          </div>
          <span style={{ fontSize: 12, color: '#8891aa', fontWeight: 500 }}>{firstName}</span>
          <span style={{
            fontSize: 9, color: '#3d4460',
            transform: menuOpen ? 'rotate(180deg)' : 'none',
            transition: 'transform .2s', display: 'inline-block',
          }}>▼</span>
        </button>

        {/* dropdown */}
        {menuOpen && (
          <div style={{
            position: 'absolute', right: 0, top: 'calc(100% + 6px)',
            width: 210, background: '#12151f',
            border: '1px solid #1e2235', borderRadius: 10,
            boxShadow: '0 8px 32px rgba(0,0,0,.4)',
            overflow: 'hidden', zIndex: 300,
          }}>
            {/* user info */}
            <div style={{
              padding: '14px 16px',
              borderBottom: '1px solid #1e2235',
            }}>
              <div style={{ fontSize: 13, fontWeight: 600, color: '#e2e4ed' }}>{user?.name}</div>
              <div style={{ fontSize: 11, color: '#5a6180', marginTop: 2 }}>{user?.email}</div>
              <div style={{
                display: 'inline-block', marginTop: 6,
                padding: '2px 8px', borderRadius: 10,
                background: 'rgba(124,108,250,.1)', color: '#9d90ff',
                fontSize: 10, fontWeight: 500,
              }}>{user?.role}</div>
            </div>

            {/* menu items */}
            {[
              { label: 'Profile & settings', icon: '👤', action: () => { setActivePage('profile'); setMenuOpen(false); } },
              { label: 'Wellness plan',       icon: '🌿', action: () => { setActivePage('wellness'); setMenuOpen(false); } },
              { label: 'AI Chat',             icon: '💬', action: () => { setActivePage('chat'); setMenuOpen(false); } },
            ].map(item => (
              <button key={item.label} onClick={item.action} style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 12, color: '#8891aa', transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = '#1a1d2a'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}>
                <span>{item.icon}</span>
                {item.label}
              </button>
            ))}

            <div style={{ borderTop: '1px solid #1e2235', margin: '4px 0' }} />

            {/* logout */}
            <button
              onClick={() => { setMenuOpen(false); logout(); }}
              style={{
                display: 'flex', alignItems: 'center', gap: 10,
                width: '100%', padding: '10px 16px', border: 'none',
                background: 'transparent', cursor: 'pointer', textAlign: 'left',
                fontSize: 12, color: '#f97066', transition: 'background .12s',
              }}
              onMouseEnter={e => e.currentTarget.style.background = 'rgba(249,112,102,.06)'}
              onMouseLeave={e => e.currentTarget.style.background = 'transparent'}
            >
              <span>🚪</span> Sign out
            </button>
          </div>
        )}
      </div>
    </nav>
  );
}
