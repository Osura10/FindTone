import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';

const ChatBot = ({ onClose }) => {
  const [messages, setMessages] = useState([
    { text: "Hello! I'm the MusicMarket AI Agent. How can I help you today?", isBot: true }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim()) return;

    const newMessages = [...messages, { text: inputValue, isBot: false }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const payload = { message: inputValue };
      if (window.chatSessionId) {
        payload.session_id = window.chatSessionId;
      }

      const aiServiceUrl = import.meta.env.VITE_AI_SERVICE_URL || "http://localhost:8000";
      const response = await fetch(`${aiServiceUrl}/api/chat`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify(payload),
      });

      const data = await response.json();
      if (data.session_id) {
        window.chatSessionId = data.session_id;
      }

      setMessages([...newMessages, { text: data.response, isBot: true }]);
    } catch (error) {
      console.error("Chat error:", error);
      setMessages([...newMessages, { text: "Sorry, I am having trouble connecting to the server.", isBot: true }]);
    } finally {
      setIsLoading(false);
    }
  };

  const handleClose = () => {
    // Reset the session so a new chat starts next time
    window.chatSessionId = null;
    onClose();
  };

  // Escape closes the panel
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') handleClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  });

  return (
    <div className="chat-panel" role="dialog" aria-label="MusicMarket assistant">
      <div className="chat-panel-header">
        <span className="chat-bot-avatar"><Bot size={20} aria-hidden="true" /></span>
        <div className="grow">
          <h2 style={{ fontSize: 'var(--text-base)' }}>MusicMarket Assistant</h2>
          <span className="text-xs" style={{ color: 'var(--success)' }}>● Online</span>
        </div>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={handleClose} aria-label="Close chat">
          <X size={18} />
        </button>
      </div>

      <div className="chat-panel-body" aria-live="polite">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-msg ${msg.isBot ? '' : 'me'}`}>
            <div className="bubble">
              {msg.isBot ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}
            </div>
          </div>
        ))}
        {isLoading && (
          <div className="chat-msg">
            <div className="bubble typing" aria-label="Assistant is typing"><span /><span /><span /></div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <form className="chat-panel-input" onSubmit={handleSend}>
        <label htmlFor="landing-chat-input" className="sr-only">Message</label>
        <input
          id="landing-chat-input"
          type="text"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          placeholder="Ask me anything…"
          className="input"
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-icon" disabled={!inputValue.trim()} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export default ChatBot;
