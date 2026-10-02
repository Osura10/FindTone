import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Bot, Music2 } from 'lucide-react';
import Header from '../../components/Header/Header';
import Hero from '../../components/Hero/Hero';
import SellInfo from '../../components/SellInfo/SellInfo';
import ShopInfo from '../../components/ShopInfo/ShopInfo';
import Features from '../../components/Features/Features';
import ChatBot from '../../components/ChatBot/ChatBot';
import './Landing.css';

const Landing = () => {
  const [isChatOpen, setIsChatOpen] = useState(false);

  return (
    <div className="landing-page">
      <a href="#main" className="skip-link">Skip to content</a>
      <Header />

      <main id="main">
        <Hero />
        <SellInfo />
        <ShopInfo />
        <Features />

        <section className="lp-section">
          <div className="lp-container">
            <div className="lp-cta">
              <div>
                <h2 className="lp-h2" style={{ color: '#fff' }}>Ready to find your sound?</h2>
                <p style={{ color: 'rgba(255,255,255,0.85)' }}>Join free as a buyer, or register your shop in two minutes.</p>
              </div>
              <div className="row" style={{ gap: 12 }}>
                <Link to="/register/buyer" className="btn btn-lg lp-cta-primary">Create free account</Link>
                <Link to="/login" className="btn btn-lg lp-cta-ghost">Log in</Link>
              </div>
            </div>
          </div>
        </section>
      </main>

      <footer className="lp-footer">
        <div className="lp-container row-between">
          <span className="brand" style={{ fontSize: 'var(--text-base)' }}>
            <span className="brand-mark" style={{ width: 26, height: 26 }}><Music2 size={14} aria-hidden="true" /></span>MusicMarket
          </span>
          <p className="text-sm muted">© 2026 MusicMarket · AI-powered musical instrument marketplace</p>
        </div>
      </footer>

      {!isChatOpen && (
        <button type="button" className="assistant-fab" onClick={() => setIsChatOpen(true)} aria-label="Ask the MusicMarket assistant">
          <Bot size={20} aria-hidden="true" />
          <span className="assistant-fab-label">Ask about MusicMarket</span>
        </button>
      )}

      {isChatOpen && <ChatBot onClose={() => setIsChatOpen(false)} />}
    </div>
  );
};

export default Landing;
