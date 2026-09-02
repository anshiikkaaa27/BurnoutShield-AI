import React, { useState, useEffect, useRef } from 'react';
import api from '../api';

const SUGGESTIONS = [
  "What's my current burnout risk?",
  'How can I improve my sleep?',
  'I feel overwhelmed with work',
  'Give me stress relief tips',
  'How much exercise should I do?',
  'What does my mood score mean?',
  'How do I improve my focus?',
  'I need recommendations',
];

function TypingIndicator() {
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 4, padding: '10px 14px' }}>
      {[0, 1, 2].map(i => (
        <div key={i} style={{
          width: 6, height: 6, borderRadius: '50%',
          background: '#3d4460',
          animation: `typingBounce 1.2s ${i * 0.2}s infinite ease-in-out`,
        }} />
      ))}
      <style>{`
        @keyframes typingBounce {
          0%, 60%, 100% { transform: translateY(0); }
          30% { transform: translateY(-5px); }
        }
      `}</style>
    </div>
  );
}

function Message({ msg }) {
  const isUser = msg.role === 'user';
  return (
    <div style={{
      display: 'flex',
      flexDirection: isUser ? 'row-reverse' : 'row',
      gap: 10,
      marginBottom: 14,
      alignItems: 'flex-end',
    }} className="fade-in">
      {/* avatar */}
      <div style={{
        width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
        background: isUser
          ? 'linear-gradient(135deg,#7c6cfa,#4ecca3)'
          : 'linear-gradient(135deg,#1e2235,#12151f)',
        border: '1px solid #2a2e45',
        display: 'flex', alignItems: 'center', justifyContent: 'center',
        fontSize: 12,
      }}>
        {isUser ? 'AK' : '🛡'}
      </div>

      <div className={`chat-bubble ${msg.role}`}>
        {msg.text}
      </div>
    </div>
  );
}

export default function AIChat() {
  const [messages,  setMessages]  = useState([]);
  const [input,     setInput]     = useState('');
  const [sending,   setSending]   = useState(false);
  const [typing,    setTyping]    = useState(false);
  const [loadErr,   setLoadErr]   = useState(false);
  const bottomRef = useRef(null);
  const inputRef  = useRef(null);

  /* ── load history ── */
  useEffect(() => {
    api.get('/chat/history')
      .then(r => {
        if (r.data.length === 0) {
          // Show welcome message
          setMessages([{
            id: 'welcome',
            role: 'assistant',
            text: "👋 Hi! I'm your BurnoutShield wellness assistant. I can help you understand your burnout risk, interpret your mood and sleep trends, and suggest practical stress-relief actions. What's on your mind?",
            timestamp: new Date().toISOString(),
          }]);
        } else {
          setMessages(r.data);
        }
      })
      .catch(() => {
        setLoadErr(true);
        setMessages([{
          id: 'welcome',
          role: 'assistant',
          text: "👋 Hi! I'm your BurnoutShield wellness assistant. The backend isn't connected right now, but feel free to explore the interface.",
          timestamp: new Date().toISOString(),
        }]);
      });
  }, []);

  /* ── auto scroll ── */
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, typing]);

  /* ── send message ── */
  const handleSend = async (text) => {
    const msg = (text || input).trim();
    if (!msg) return;

    setInput('');
    setSending(true);

    // Optimistic user bubble
    const userBubble = { id: 'u_' + Date.now(), role: 'user', text: msg, timestamp: new Date().toISOString() };
    setMessages(prev => [...prev, userBubble]);
    setTyping(true);

    try {
      const res = await api.post('/chat/message', { message: msg });
      setTyping(false);
      setMessages(prev => [
        ...prev.filter(m => m.id !== userBubble.id),
        res.data.user_message,
        res.data.response,
      ]);
    } catch {
      setTyping(false);
      setMessages(prev => [...prev, {
        id: 'err_' + Date.now(),
        role: 'assistant',
        text: "I'm having trouble connecting to the server right now. Please make sure the backend is running on port 8000.",
        timestamp: new Date().toISOString(),
      }]);
    } finally {
      setSending(false);
      inputRef.current?.focus();
    }
  };

  const handleKeyDown = (e) => {
    if (e.key === 'Enter' && !e.shiftKey) {
      e.preventDefault();
      handleSend();
    }
  };

  const handleClear = async () => {
    try { await api.delete('/chat/history'); } catch {/* ignore */}
    setMessages([{
      id: 'welcome',
      role: 'assistant',
      text: "Chat cleared. I'm here whenever you need me! Ask me anything about your burnout risk, sleep, stress, or wellness.",
      timestamp: new Date().toISOString(),
    }]);
  };

  return (
    <div style={{ display: 'flex', flexDirection: 'column', height: 'calc(100vh - 140px)', gap: 0 }}>

      {/* ── header ── */}
      <div style={{ marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <div className="page-title">AI Wellness Assistant</div>
            <div className="page-subtitle">
              Ask about your burnout risk, stress, sleep, mood, or get personalised recommendations
            </div>
          </div>
          <button onClick={handleClear} className="btn btn-ghost" style={{ fontSize: 12 }}>
            Clear chat
          </button>
        </div>
        {loadErr && (
          <div className="alert alert-warning" style={{ marginTop: 10 }}>
            Backend unavailable — responses won't persist until the server is running.
          </div>
        )}
      </div>

      {/* ── message area ── */}
      <div style={{
        flex: 1, overflowY: 'auto', padding: '16px',
        background: '#0d0f17', borderRadius: '12px 12px 0 0',
        border: '1px solid #1e2235', borderBottom: 'none',
        minHeight: 0,
      }}>
        {messages.map(msg => <Message key={msg.id} msg={msg} />)}
        {typing && (
          <div style={{ display: 'flex', gap: 10, alignItems: 'flex-end', marginBottom: 14 }}>
            <div style={{ width: 28, height: 28, borderRadius: '50%', flexShrink: 0,
              background: 'linear-gradient(135deg,#1e2235,#12151f)', border: '1px solid #2a2e45',
              display: 'flex', alignItems: 'center', justifyContent: 'center', fontSize: 12 }}>🛡</div>
            <div className="chat-bubble assistant">
              <TypingIndicator />
            </div>
          </div>
        )}
        <div ref={bottomRef} />
      </div>

      {/* ── suggestions ── */}
      <div style={{
        padding: '10px 16px', background: '#0f1119',
        border: '1px solid #1e2235', borderTop: '1px solid #1a1d2e',
        overflowX: 'auto', display: 'flex', gap: 7,
        scrollbarWidth: 'none', msOverflowStyle: 'none',
      }}>
        {SUGGESTIONS.map(s => (
          <button key={s} onClick={() => handleSend(s)} disabled={sending} style={{
            padding: '5px 12px', borderRadius: 20, whiteSpace: 'nowrap',
            background: '#181b28', border: '1px solid #2a2e45',
            color: '#5a6180', fontSize: 11, cursor: 'pointer',
            transition: 'all .15s',
          }}
          onMouseEnter={e => { e.currentTarget.style.borderColor = '#7c6cfa50'; e.currentTarget.style.color = '#9d90ff'; }}
          onMouseLeave={e => { e.currentTarget.style.borderColor = '#2a2e45';   e.currentTarget.style.color = '#5a6180'; }}>
            {s}
          </button>
        ))}
      </div>

      {/* ── input bar ── */}
      <div style={{
        display: 'flex', gap: 10, padding: '12px 14px',
        background: '#12151f', borderRadius: '0 0 12px 12px',
        border: '1px solid #1e2235', borderTop: 'none',
        alignItems: 'flex-end',
      }}>
        <textarea
          ref={inputRef}
          value={input}
          onChange={e => setInput(e.target.value)}
          onKeyDown={handleKeyDown}
          placeholder="Ask me anything about your wellbeing… (Enter to send)"
          rows={1}
          className="input-field"
          style={{ flex: 1, resize: 'none', lineHeight: 1.5, maxHeight: 100 }}
        />
        <button
          onClick={() => handleSend()}
          disabled={sending || !input.trim()}
          className="btn btn-primary"
          style={{ flexShrink: 0, height: 40 }}
        >
          {sending ? <span className="spinner" /> : 'Send'}
        </button>
      </div>
    </div>
  );
}
