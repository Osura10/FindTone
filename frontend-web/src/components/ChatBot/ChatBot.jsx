import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Bot } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import './ChatBot.css';

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

      const response = await fetch("http://localhost:8000/api/chat", {
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

  return (
    <div className="chat-modal-overlay">
      <div className="chat-modal glass-panel animate-fade-in-up">
        <div className="chat-header">
          <div className="chat-header-info">
            <div className="bot-avatar">
              <Bot size={24} />
            </div>
            <div>
              <h3>MusicMarket Assistant</h3>
              <span className="online-status">Online</span>
            </div>
          </div>
          <button className="close-btn" onClick={handleClose}>
            <X size={24} />
          </button>
        </div>
        
        <div className="chat-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`message-wrapper ${msg.isBot ? 'bot' : 'user'}`}>
              <div className="message-bubble">
                {msg.isBot ? (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}
          {isLoading && (
            <div className="message-wrapper bot">
              <div className="message-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="chat-input-area" onSubmit={handleSend}>
          <input
            type="text"
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            placeholder="Ask me anything..."
            className="chat-input"
          />
          <button type="submit" className="send-btn" disabled={!inputValue.trim()}>
            <Send size={20} />
          </button>
        </form>
      </div>
    </div>
  );
};

export default ChatBot;
