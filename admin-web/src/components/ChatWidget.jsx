import React, { useState, useRef, useEffect } from 'react';
import { useChatbot } from '../context/ChatbotContext';
import s from '../styles/ChatWidget.module.css';

export default function ChatWidget() {
  const { isOpen, toggleWidget, messages, sendMessage } = useChatbot();
  const [text, setText] = useState('');
  const [loading, setLoading] = useState(false);
  const endRef = useRef(null);

  useEffect(() => {
    endRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages, isOpen]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!text.trim()) return;

    const msg = text;
    setText('');
    setLoading(true);
    await sendMessage(msg);
    setLoading(false);
  };

  return (
    <>
      <button className={`${s.fab} ${isOpen ? s.fabOpen : ''}`} onClick={toggleWidget}>
        {isOpen ? (
          <svg viewBox="0 0 24 24" width="24" height="24" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <line x1="18" y1="6" x2="6" y2="18"></line>
            <line x1="6" y1="6" x2="18" y2="18"></line>
          </svg>
        ) : (
          <svg viewBox="0 0 24 24" width="28" height="28" stroke="currentColor" strokeWidth="2" fill="none" strokeLinecap="round" strokeLinejoin="round">
            <path d="M21 16V8a2 2 0 0 0-1-1.73l-7-4a2 2 0 0 0-2 0l-7 4A2 2 0 0 0 3 8v8a2 2 0 0 0 1 1.73l7 4a2 2 0 0 0 2 0l7-4A2 2 0 0 0 21 16z"></path>
            <circle cx="12" cy="12" r="4"></circle>
          </svg>
        )}
      </button>

      {isOpen && (
        <div className={s.widget}>
          <div className={s.header}>
            <h3>CitiVoice AI Assistant</h3>
            <p>I can help you navigate and analyze data.</p>
          </div>

          <div className={s.messages}>
            {messages.map((m, i) => (
              <div key={i} className={`${s.messageWrapper} ${m.sender === 'user' ? s.user : s.ai}`}>
                <div className={s.bubble}>{m.message}</div>
              </div>
            ))}
            {loading && (
              <div className={`${s.messageWrapper} ${s.ai}`}>
                <div className={s.bubble}><span className={s.typing}>...</span></div>
              </div>
            )}
            <div ref={endRef} />
          </div>

          <form className={s.inputArea} onSubmit={handleSubmit}>
            <input
              type="text"
              placeholder="Ask anything..."
              value={text}
              onChange={e => setText(e.target.value)}
              disabled={loading}
            />
            <button type="submit" disabled={!text.trim() || loading}>➤</button>
          </form>
        </div>
      )}
    </>
  );
}
