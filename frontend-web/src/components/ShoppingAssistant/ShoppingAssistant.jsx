import React, { useState, useRef, useEffect } from 'react';
import { X, Send, Sparkles, ShoppingBag, BellPlus, CheckCircle, MapPin } from 'lucide-react';
import { useNavigate } from 'react-router-dom';
import ReactMarkdown from 'react-markdown';
import toast from 'react-hot-toast';
import { apiCall } from '../../services/api';
import { Button, VerdictBadge, formatLKR } from '../ui';

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
      toast.error(err.message || "Failed to create alert. Please check My Alerts.");
    } finally {
      setAlertLoading(prev => ({ ...prev, [msgIndex]: false }));
    }
  };

  const handleClose = () => {
    onClose();
  };

  // Escape closes the panel
  useEffect(() => {
    const onKey = (e) => { if (e.key === 'Escape') onClose(); };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [onClose]);

  const openListing = (listingId) => {
    navigate(`/dashboard/listings/${listingId}`);
    onClose();
  };

  return (
    <div className="chat-panel sa-panel" role="dialog" aria-label="Shopping assistant">
      {/* Header */}
      <div className="chat-panel-header">
        <span className="chat-bot-avatar"><Sparkles size={18} aria-hidden="true" /></span>
        <div className="grow">
          <h2 className="row" style={{ fontSize: 'var(--text-base)', gap: 8 }}>
            Shopping Assistant <span className="badge badge-primary" style={{ minHeight: 18, fontSize: 10 }}>Agent 04</span>
          </h2>
          <span className="text-xs" style={{ color: 'var(--success)' }}>● Live marketplace advisor</span>
        </div>
        <button type="button" className="btn btn-ghost btn-icon btn-sm" onClick={handleClose} aria-label="Close assistant">
          <X size={18} />
        </button>
      </div>

      {/* Message thread */}
      <div className="chat-panel-body" aria-live="polite">
        {messages.map((msg, index) => (
          <div key={index} className={`chat-msg ${msg.isBot ? '' : 'me'}`} style={msg.isBot && (msg.listings?.length || msg.comparison || msg.price_insight || msg.alert_to_create) ? { maxWidth: '100%' } : undefined}>
            <div className="bubble" style={{ minWidth: 0 }}>
              {msg.isBot ? <ReactMarkdown>{msg.text}</ReactMarkdown> : msg.text}

              {/* Listing cards */}
              {msg.listings && msg.listings.length > 0 && (
                <div className="sa-results">
                  {msg.listings.map((item) => (
                    <button type="button" key={item.id} className="sa-item" onClick={() => openListing(item.id)}>
                      <span className="sa-thumb">
                        {item.image_url ? <img src={item.image_url} alt="" /> : <ShoppingBag size={20} aria-hidden="true" />}
                      </span>
                      <span className="sa-item-body">
                        <span className="sa-item-title">{item.title}</span>
                        <span className="price-tag sm"><span className="currency">LKR</span>{Number(item.price).toLocaleString('en-LK')}</span>
                        <span className="text-xs muted row" style={{ gap: 4 }}>
                          <MapPin size={11} aria-hidden="true" /> {item.location || 'Sri Lanka'}
                          {item.condition && <> · <span className="cap">{item.condition.replace('_', ' ')}</span></>}
                        </span>
                      </span>
                      {item.price_verdict && <VerdictBadge verdict={item.price_verdict} />}
                    </button>
                  ))}
                </div>
              )}

              {/* Side-by-side comparison */}
              {msg.comparison && msg.comparison.items && (
                <div className="sa-block">
                  <strong className="text-sm">Side-by-side comparison</strong>
                  <div className="sa-compare">
                    {msg.comparison.items.map((item) => {
                      const isCheapest = item.id === msg.comparison.cheapest_id;
                      return (
                        <button type="button" key={item.id} className={`sa-compare-card ${isCheapest ? 'best' : ''}`} onClick={() => openListing(item.id)}>
                          {isCheapest && <span className="badge badge-success" style={{ alignSelf: 'flex-start' }}>Cheapest</span>}
                          <strong className="text-sm">{item.title}</strong>
                          <span className="price-tag sm"><span className="currency">LKR</span>{Number(item.price).toLocaleString('en-LK')}</span>
                          <span className="text-xs muted">Condition: <b className="cap">{item.condition}</b></span>
                          <span className="text-xs muted">Location: <b>{item.location}</b></span>
                          {item.trust_score && <span className="text-xs muted">Trust: <b>{item.trust_score}/100</b></span>}
                          {item.fair_price && <span className="text-xs muted">Fair price: <b>{formatLKR(item.fair_price)}</b></span>}
                        </button>
                      );
                    })}
                  </div>
                </div>
              )}

              {/* Price insight */}
              {msg.price_insight && !msg.price_insight.error && (
                <div className="sa-block">
                  <div className="row-between">
                    <strong className="text-sm">Fair price: {msg.price_insight.title}</strong>
                    <VerdictBadge verdict={msg.price_insight.price_verdict} />
                  </div>
                  <dl className="sa-metrics">
                    <div><dt>Asking</dt><dd>{formatLKR(msg.price_insight.asking_price)}</dd></div>
                    <div><dt>Fair price</dt><dd>{msg.price_insight.fair_price ? formatLKR(msg.price_insight.fair_price) : 'N/A'}</dd></div>
                    <div><dt>Fair range</dt><dd>
                      {msg.price_insight.fair_range?.min
                        ? `${Number(msg.price_insight.fair_range.min).toLocaleString('en-LK')} – ${Number(msg.price_insight.fair_range.max).toLocaleString('en-LK')}`
                        : 'N/A'}
                    </dd></div>
                  </dl>
                  {msg.price_insight.explanation && <p className="text-xs" style={{ color: 'var(--text-2)' }}>{msg.price_insight.explanation}</p>}
                </div>
              )}

              {/* Suggested alert */}
              {msg.alert_to_create && (
                <div className="sa-block">
                  <strong className="text-sm row" style={{ gap: 6 }}><BellPlus size={15} aria-hidden="true" /> Suggested alert: {msg.alert_to_create.name}</strong>
                  <div className="row" style={{ gap: 6 }}>
                    {msg.alert_to_create.category && <span className="chip">Category: {msg.alert_to_create.category}</span>}
                    {msg.alert_to_create.brand && <span className="chip">Brand: {msg.alert_to_create.brand}</span>}
                    {msg.alert_to_create.max_price && <span className="chip">Max: {formatLKR(msg.alert_to_create.max_price)}</span>}
                    {msg.alert_to_create.location && <span className="chip">Location: {msg.alert_to_create.location}</span>}
                    {msg.alert_to_create.conditions && <span className="chip">Conditions: {msg.alert_to_create.conditions}</span>}
                  </div>
                  {createdAlerts[index] ? (
                    <span className="text-sm row" style={{ gap: 6, color: 'var(--success)', fontWeight: 600 }}>
                      <CheckCircle size={16} aria-hidden="true" /> Alert created – manage it in My Alerts.
                    </span>
                  ) : (
                    <div>
                      <Button size="sm" icon={BellPlus} loading={alertLoading[index]} onClick={() => handleCreateAlert(msg.alert_to_create, index)}>
                        {alertLoading[index] ? 'Saving alert…' : 'Create this alert'}
                      </Button>
                    </div>
                  )}
                </div>
              )}
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

      {/* Quick prompts before the first question */}
      {messages.length === 1 && !isLoading && (
        <div className="sa-prompts">
          {['Acoustic guitars under 50k', 'Is listing 7 a fair price?', 'Alert me for Yamaha keyboards'].map((p) => (
            <button type="button" key={p} className="chip sa-prompt" onClick={() => setInputValue(p)}>{p}</button>
          ))}
        </div>
      )}

      {/* Input bar */}
      <form className="chat-panel-input" onSubmit={handleSend}>
        <label htmlFor="sa-input" className="sr-only">Message the shopping assistant</label>
        <input
          id="sa-input"
          type="text"
          className="input"
          placeholder="e.g. find acoustic guitars under 50k"
          value={inputValue}
          onChange={(e) => setInputValue(e.target.value)}
          disabled={isLoading}
          autoFocus
        />
        <button type="submit" className="btn btn-primary btn-icon" disabled={!inputValue.trim() || isLoading} aria-label="Send">
          <Send size={18} />
        </button>
      </form>
    </div>
  );
};

export const ShoppingAssistantLauncher = ({ onClick }) => (
  <button type="button" className="assistant-fab" onClick={onClick} aria-label="Open shopping assistant" title="Shopping assistant">
    <Sparkles size={18} aria-hidden="true" />
    <span className="assistant-fab-label">Shopping Assistant</span>
  </button>
);

export default ShoppingAssistant;
