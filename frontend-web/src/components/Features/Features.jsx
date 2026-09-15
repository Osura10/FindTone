import React from 'react';
import { Camera, DollarSign, Store, ShieldCheck } from 'lucide-react';
import './Features.css';

const features = [
  {
    icon: <Camera className="feature-icon" />,
    title: 'Listing Quality Agent',
    description: 'Auto-detects instrument models from photos and ensures descriptions meet high standards.',
    delay: 'delay-100'
  },
  {
    icon: <DollarSign className="feature-icon" />,
    title: 'Fair Price Agent',
    description: 'Analyzes market trends to flag suspiciously cheap or overpriced listings in real-time.',
    delay: 'delay-200'
  },
  {
    icon: <Store className="feature-icon" />,
    title: 'Trade Matching',
    description: 'Intelligently connects buyers with local sellers and shops based on their specific needs.',
    delay: 'delay-300'
  },
  {
    icon: <ShieldCheck className="feature-icon" />,
    title: 'Trust & Fraud Check',
    description: 'Scans for stolen serial numbers, duplicate photos, and issues trust scores for all sellers.',
    delay: 'delay-400'
  }
];

const Features = () => {
  return (
    <section className="features-section" id="about">
      <div className="container">
        <div className="section-header">
          <h2 className="section-title">Powered by <span className="text-gradient">4 AI Agents</span></h2>
          <p className="section-subtitle">
            Our intelligent ecosystem works tirelessly in the background to ensure every trade is fair, safe, and exactly what you're looking for.
          </p>
        </div>
        
        <div className="features-grid">
          {features.map((feature, index) => (
            <div key={index} className={`feature-card glass-panel animate-fade-in-up ${feature.delay}`}>
              <div className="feature-icon-wrapper">
                {feature.icon}
              </div>
              <h3 className="feature-title">{feature.title}</h3>
              <p className="feature-desc">{feature.description}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default Features;
