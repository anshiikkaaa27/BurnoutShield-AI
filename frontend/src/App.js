import React, { useState } from 'react';
import { useAuth } from './context/AuthContext';
import Navbar from './components/Navbar';
import Login from './pages/Login';
import Register from './pages/Register';
import Dashboard from './pages/Dashboard';
import MoodTracker from './pages/MoodTracker';
import Journal from './pages/Journal';
import SleepTracker from './pages/SleepTracker';
import Wellness from './pages/Wellness';
import AIAssessment from './pages/AIAssessment';
import AIChat from './pages/AIChat';
import Reminders from './pages/Reminders';
import Profile from './pages/Profile';

function AppShell() {
  const [activePage, setActivePage] = useState('dashboard');

  const renderPage = () => {
    switch (activePage) {
      case 'dashboard':  return <Dashboard  setActivePage={setActivePage} />;
      case 'tracker':    return <MoodTracker />;
      case 'journal':    return <Journal />;
      case 'sleep':      return <SleepTracker />;
      case 'wellness':   return <Wellness />;
      case 'assessment': return <AIAssessment />;
      case 'chat':       return <AIChat />;
      case 'reminders':  return <Reminders />;
      case 'profile':    return <Profile />;
      default:           return <Dashboard setActivePage={setActivePage} />;
    }
  };

  return (
    <div style={{ minHeight: '100vh', background: '#0a0c12' }}>
      <Navbar activePage={activePage} setActivePage={setActivePage} />
      <main className="page-container">{renderPage()}</main>
    </div>
  );
}

export default function App() {
  const { user, loading } = useAuth();
  const [authView, setAuthView] = useState('login'); // 'login' | 'register'

  /* ── loading splash while verifying stored token ── */
  if (loading) {
    return (
      <div style={{
        minHeight: '100vh', background: '#0a0c12',
        display: 'flex', flexDirection: 'column',
        alignItems: 'center', justifyContent: 'center', gap: 16,
      }}>
        <div style={{
          width: 40, height: 40, borderRadius: 11,
          background: 'linear-gradient(135deg, #7c6cfa, #4ecca3)',
          display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 20,
        }}>🛡</div>
        <span className="spinner" style={{ width: 22, height: 22 }} />
        <span style={{ fontSize: 13, color: '#3d4460' }}>Loading BurnoutShield…</span>
      </div>
    );
  }

  /* ── not authenticated — show login or register ── */
  if (!user) {
    return authView === 'register'
      ? <Register onSwitchToLogin={() => setAuthView('login')} />
      : <Login    onSwitchToRegister={() => setAuthView('register')} />;
  }

  /* ── authenticated — show the full app ── */
  return <AppShell />;
}
