import React from 'react';
import Header from '../../components/Header/Header';
import Hero from '../../components/Hero/Hero';
import SellInfo from '../../components/SellInfo/SellInfo';
import ShopInfo from '../../components/ShopInfo/ShopInfo';
import Features from '../../components/Features/Features';
import './Landing.css';
import robotImg from '../../assets/robot.png';

const Landing = () => {
  return (
    <div className="landing-page">
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
        <div className="gradient-sphere sphere-3"></div>
      </div>
      
      <Header />
      
      <main>
        <Hero />
        <SellInfo />
        <ShopInfo />
        <Features />
      </main>

      <footer className="footer glass-panel">
        <div className="container">
          <p>© 2026 MusicMarket. AI-Powered Musical Instrument Trading & Shop Platform.</p>
        </div>
      </footer>

      <div className="floating-robot-container">
        <img src={robotImg} alt="Robot Assistant" className="floating-robot" />
        <p className="robot-text">Ask me about MusicMarket</p>
      </div>
    </div>
  );
};

export default Landing;
