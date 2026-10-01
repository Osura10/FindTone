import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ShoppingBag, BellPlus, CheckCircle, MapPin, Loader2 } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import { apiCall } from '../../services/api';
import './ShoppingAssistant.css';

const ShoppingAssistant = ({ onClose }) => {
  const navigate = useNavigate();
  const [messages, setMessages] = useState([
    {
      text: "Hi! I'm your FindTone Shopping Assistant. I can help you search live gear, compare instruments, verify if asking prices are fair, or set up smart alerts for you. What are you looking for today?",
      isBot: true
    }
  ]);
  const [inputValue, setInputValue] = useState("");
  const [isLoading, setIsLoading] = useState(false);
  const [sessionId, setSessionId] = useState(() => {
    return window.shoppingAssistantSessionId || null;
  });
  const [createdAlerts, setCreatedAlerts] = useState({});
  const [alertLoading, setAlertLoading] = useState({});
  const messagesEndRef = useRef(null);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: "smooth" });
  };

  useEffect(() => {
    scrollToBottom();
  }, [messages, isLoading]);

  const handleSend = async (e) => {
    e.preventDefault();
    if (!inputValue.trim() || isLoading) return;

    const userText = inputValue.trim();
    const newMessages = [...messages, { text: userText, isBot: false }];
    setMessages(newMessages);
    setInputValue("");
    setIsLoading(true);

    try {
      const payload = { message: userText };
      if (sessionId) {
        payload.session_id = sessionId;
      }

      // Authenticated call to .NET Backend
      const data = await apiCall('/shopping-assistant/chat', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (data.session_id) {
        setSessionId(data.session_id);
        window.shoppingAssistantSessionId = data.session_id;
      }

      setMessages([
        ...newMessages,
        {
          text: data.reply || "Here is what I found for you:",
          isBot: true,
          listings: data.listings || [],
          comparison: data.comparison || null,
          price_insight: data.price_insight || null,
          alert_to_create: data.alert_to_create || null
        }
      ]);
    } catch (err) {
      console.error("Shopping Assistant API error:", err);
      const errMsg = err.message || "Sorry, I am having trouble connecting to the shopping assistant.";
      setMessages([
        ...newMessages,
        { text: errMsg, isBot: true }
      ]);
    } finally {
      setIsLoading(false);
    }
  };

  // Reusable Alert Creation Flow matching MyAlerts.jsx exactly
  const handleCreateAlert = async (alertData, msgIndex) => {
    if (!alertData) return;
    setAlertLoading(prev => ({ ...prev, [msgIndex]: true }));

    try {
      const payload = {
        name: alertData.name || "Smart Alert",
        queryText: alertData.model_keyword || alertData.name || null,
        category: alertData.category || null,
        brand: alertData.brand || null,
        modelKeyword: alertData.model_keyword || null,
        minPrice: alertData.min_price != null ? Number(alertData.min_price) : null,
        maxPrice: alertData.max_price != null ? Number(alertData.max_price) : null,
        conditions: alertData.conditions || null,
        location: alertData.location || null
      };

      await apiCall('/alerts', {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      setCreatedAlerts(prev => ({ ...prev, [msgIndex]: true }));
    } catch (err) {
      console.error("Failed to create alert from Shopping Assistant:", err);
      alert(err.message || "Failed to create alert. Please check My Alerts.");
    } finally {
      setAlertLoading(prev => ({ ...prev, [msgIndex]: false }));
    }
  };

  const handleClose = () => {
    onClose();
  };

  return (
    <div className="shopping-assistant-overlay">
      <div className="shopping-assistant-modal glass-panel">
        {/* Header */}
        <div className="shopping-assistant-header">
          <div className="shopping-assistant-header-info">
            <div className="sa-avatar">
              <ShoppingBag size={22} />
            </div>
            <div>
              <h3>
                Shopping Assistant
                <span className="sa-badge">Agent 04</span>
              </h3>
              <span style={{ fontSize: '0.78rem', color: '#00f5d4' }}>
                Live Marketplace Advisor
              </span>
            </div>
          </div>
          <button className="sa-close-btn" onClick={handleClose} title="Close Assistant">
            <X size={22} />
          </button>
        </div>

        {/* Message Thread */}
        <div className="shopping-assistant-messages">
          {messages.map((msg, index) => (
            <div key={index} className={`sa-msg-wrapper ${msg.isBot ? 'bot' : 'user'}`}>
              <div className="sa-msg-bubble">
                {msg.isBot ? (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}

                {/* Structured Listing Cards */}
                {msg.listings && msg.listings.length > 0 && (
                  <div className="sa-listings-grid">
                    {msg.listings.map((item) => (
                      <div 
                        key={item.id} 
                        className="sa-listing-card"
                        style={{ cursor: 'pointer' }}
                        onClick={() => {
                          navigate(`/dashboard/listings/${item.id}`);
                          onClose();
                        }}
                      >
                        <div className="sa-listing-img-box">
                          {item.image_url ? (
                            <img src={item.image_url} alt={item.title} className="sa-listing-img" />
                          ) : (
                            <ShoppingBag size={32} style={{ color: 'rgba(255,255,255,0.3)' }} />
                          )}
                        </div>
                        <div className="sa-listing-body">
                          <h4 className="sa-listing-title">{item.title}</h4>
                          <p className="sa-listing-price">LKR {Number(item.price).toLocaleString()}</p>
                          <div className="sa-listing-meta">
                            <span><MapPin size={12} style={{ verticalAlign: 'middle' }} /> {item.location || 'Sri Lanka'}</span>
                            <span style={{ textTransform: 'capitalize' }}>{item.condition?.replace('_', ' ')}</span>
                          </div>
                          {item.price_verdict && (
                            <span className={`sa-verdict-tag ${item.price_verdict === 'FAIR' ? 'sa-verdict-fair' :
                                item.price_verdict === 'SUSPICIOUSLY_LOW' ? 'sa-verdict-low' : 'sa-verdict-high'
                              }`}>
                              {item.price_verdict} PRICE
                            </span>
                          )}
                        </div>
                      </div>
                    ))}
                  </div>
                )}

                {/* Structured Comparison View */}
                {msg.comparison && msg.comparison.items && (
                  <div className="sa-comparison-box">
                    <h5 style={{ margin: '0 0 10px 0', fontSize: '0.85rem', color: '#00f5d4' }}>
                      Side-by-Side Comparison
                    </h5>
                    <div className="sa-comparison-grid">
                      {msg.comparison.items.map((item) => {
                        const isCheapest = item.id === msg.comparison.cheapest_id;
                        return (
                          <div 
                            key={item.id} 
                            className={`sa-compare-card ${isCheapest ? 'cheapest' : ''}`}
                            style={{ cursor: 'pointer' }}
                            onClick={() => {
                              navigate(`/dashboard/listings/${item.id}`);
                              onClose();
                            }}
                          >
                            <strong style={{ fontSize: '0.88rem', color: '#fff' }}>{item.title}</strong>
                            <div style={{ fontSize: '1rem', fontWeight: 700, color: isCheapest ? '#00f5d4' : '#fff' }}>
                              LKR {Number(item.price).toLocaleString()}
                              {isCheapest && <span style={{ fontSize: '0.7rem', marginLeft: '6px', color: '#00f5d4' }}>(Cheapest)</span>}
                            </div>
                            <div style={{ fontSize: '0.8rem', color: 'rgba(255,255,255,0.7)' }}>
                              <div>Condition: <b>{item.condition}</b></div>
                              <div>Location: <b>{item.location}</b></div>
                              {item.trust_score && <div>Trust Score: <b>{item.trust_score}/100</b></div>}
                              {item.fair_price && <div>Fair Price: <b>LKR {item.fair_price.toLocaleString()}</b></div>}
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                )}

                {/* Structured Price Insight View */}
                {msg.price_insight && !msg.price_insight.error && (
                  <div className="sa-insight-card">
                    <div className="sa-insight-header">
                      <span style={{ fontWeight: 600, color: '#00f5d4' }}>
                        Fair Price Analysis: {msg.price_insight.title}
                      </span>
                      <span className={`sa-verdict-tag ${msg.price_insight.price_verdict === 'FAIR' ? 'sa-verdict-fair' :
                          msg.price_insight.price_verdict === 'SUSPICIOUSLY_LOW' ? 'sa-verdict-low' : 'sa-verdict-high'
                        }`}>
                        {msg.price_insight.price_verdict}
                      </span>
                    </div>

                    <div className="sa-insight-grid">
                      <div className="sa-insight-metric">
                        <span className="sa-metric-label">Asking Price</span>
                        <span className="sa-metric-value">LKR {Number(msg.price_insight.asking_price).toLocaleString()}</span>
                      </div>
                      <div className="sa-insight-metric">
                        <span className="sa-metric-label">Calculated Fair Price</span>
                        <span className="sa-metric-value">
                          {msg.price_insight.fair_price ? `LKR ${Number(msg.price_insight.fair_price).toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                      <div className="sa-insight-metric">
                        <span className="sa-metric-label">Fair Range</span>
                        <span className="sa-metric-value">
                          {msg.price_insight.fair_range?.min ?
                            `${Number(msg.price_insight.fair_range.min).toLocaleString()} - ${Number(msg.price_insight.fair_range.max).toLocaleString()}` : 'N/A'}
                        </span>
                      </div>
                    </div>

                    {msg.price_insight.explanation && (
                      <p style={{ margin: '4px 0 0 0', fontSize: '0.85rem', color: 'rgba(255,255,255,0.85)' }}>
                        {msg.price_insight.explanation}
                      </p>
                    )}
                  </div>
                )}

                {/* Structured Alert Criteria Suggestion */}
                {msg.alert_to_create && (
                  <div className="sa-alert-box">
                    <div>
                      <strong style={{ display: 'block', color: '#ff006e', fontSize: '0.95rem', marginBottom: '4px' }}>
                        Suggested Alert Criteria
                      </strong>
                      <span style={{ fontSize: '0.85rem', color: 'rgba(255,255,255,0.8)' }}>
                        Name: <b>{msg.alert_to_create.name}</b>
                      </span>
                    </div>

                    <div className="sa-alert-criteria-list">
                      {msg.alert_to_create.category && (
                        <span className="sa-criteria-pill">Category: {msg.alert_to_create.category}</span>
                      )}
                      {msg.alert_to_create.brand && (
                        <span className="sa-criteria-pill">Brand: {msg.alert_to_create.brand}</span>
                      )}
                      {msg.alert_to_create.max_price && (
                        <span className="sa-criteria-pill">Max Price: LKR {Number(msg.alert_to_create.max_price).toLocaleString()}</span>
                      )}
                      {msg.alert_to_create.location && (
                        <span className="sa-criteria-pill">Location: {msg.alert_to_create.location}</span>
                      )}
                      {msg.alert_to_create.conditions && (
                        <span className="sa-criteria-pill">Conditions: {msg.alert_to_create.conditions}</span>
                      )}
                    </div>

                    <div>
                      {createdAlerts[index] ? (
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#4ade80', fontSize: '0.88rem', fontWeight: 600 }}>
                          <CheckCircle size={18} />
                          <span>Alert Created! You can manage it anytime in My Alerts.</span>
                        </div>
                      ) : (
                        <button
                          className="sa-create-alert-btn"
                          disabled={alertLoading[index]}
                          onClick={() => handleCreateAlert(msg.alert_to_create, index)}
                        >
                          {alertLoading[index] ? (
                            <>
                              <Loader2 size={16} className="animate-spin" />
                              <span>Saving Alert...</span>
                            </>
                          ) : (
                            <>
                              <BellPlus size={16} />
                              <span>Create this alert</span>
                            </>
                          )}
                        </button>
                      )}
                    </div>
                  </div>
                )}
              </div>
            </div>
          ))}

          {isLoading && (
            <div className="sa-msg-wrapper bot">
              <div className="sa-msg-bubble typing-indicator">
                <span></span>
                <span></span>
                <span></span>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <form className="sa-input-area" onSubmit={handleSend}>
          <input
            type="text"
            className="sa-input"
            placeholder="Ask anything: 'find acoustic guitars under 50k', 'compare 4 and 7', 'is listing 7 fair?'..."
            value={inputValue}
            onChange={(e) => setInputValue(e.target.value)}
            disabled={isLoading}
            autoFocus
          />
          <button type="submit" className="sa-send-btn" disabled={!inputValue.trim() || isLoading}>
            <Send size={18} />
          </button>
        </form>
      </div>
    </div>
  );
};

export const ShoppingAssistantLauncher = ({ onClick }) => {
  return (
    <div className="sa-floating-launcher" onClick={onClick} title="Open Shopping Assistant">
      <Sparkles size={18} />
      <span>Shopping Assistant</span>
    </div>
  );
};

export default ShoppingAssistant;
