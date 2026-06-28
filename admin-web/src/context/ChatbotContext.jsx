import React, { createContext, useContext, useState, useEffect } from 'react';
import { api } from '../services/api';

const ChatbotContext = createContext();

export const useChatbot = () => useContext(ChatbotContext);

export const ChatbotProvider = ({ children }) => {
  const [isOpen, setIsOpen] = useState(false);
  const [messages, setMessages] = useState([]);
  const [sessionToken, setSessionToken] = useState(localStorage.getItem('cv_chat_token') || null);
  const [contextData, setContextData] = useState(null);

  useEffect(() => {
    if (sessionToken) {
      api.get(`/chatbot/${sessionToken}`)
        .then(data => setMessages(data || []))
        .catch(() => setMessages([{ id: 'welcome', sender: 'ai', message: 'Hello Admin! How can I help you today?' }]));
    } else {
      setMessages([{ id: 'welcome', sender: 'ai', message: 'Hello Admin! How can I help you today?' }]);
    }
  }, [sessionToken]);

  const toggleWidget = () => setIsOpen(!isOpen);

  const sendMessage = async (text) => {
    const userMsg = { id: Date.now(), sender: 'user', message: text };
    setMessages(prev => [...prev, userMsg]);
    
    try {
      const result = await api.post('/chatbot/message', {
        sessionToken,
        message: text,
        contextData
      });

      if (result.sessionToken && result.sessionToken !== sessionToken) {
        setSessionToken(result.sessionToken);
        localStorage.setItem('cv_chat_token', result.sessionToken);
      }

      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', message: result.message }]);
    } catch (err) {
      setMessages(prev => [...prev, { id: Date.now(), sender: 'ai', message: 'Sorry, I encountered an error.' }]);
    }
  };

  return (
    <ChatbotContext.Provider value={{
      isOpen,
      toggleWidget,
      messages,
      sendMessage,
      setContextData
    }}>
      {children}
    </ChatbotContext.Provider>
  );
};
