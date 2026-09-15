import React from 'react';
import { UploadCloud, CheckCircle, TrendingUp, Handshake } from 'lucide-react';
import './SellInfo.css';

const sellSteps = [
  {
    icon: <UploadCloud className="sell-icon" />,
    title: 'Post a Listing',
    desc: 'Snap a few photos and add a quick description. Our AI helps auto-fill model details to save you time.'
  },
  {
    icon: <CheckCircle className="sell-icon" />,
    title: 'AI Verification',
    desc: 'The Listing Quality & Fair Price Agents review your post to ensure it looks great and is priced right.'
  },
  {
    icon: <TrendingUp className="sell-icon" />,
    title: 'Get Matched',
    desc: 'We instantly notify buyers looking for your specific instrument and nearby shops that might want to trade.'
  },
  {
    icon: <Handshake className="sell-icon" />,
    title: 'Secure the Trade',
    desc: 'Chat securely, finalize the deal, and rest easy knowing all buyers pass our Trust & Fraud Check.'
  }
];

const SellInfo = () => {
  return (
    <section className="sell-info-section" id="sell">
      <div className="container">
        <div className="sell-header">
          <h2 className="section-title">How <span className="text-gradient">Selling</span> Works</h2>
          <p className="section-subtitle">
            Turn your unused gear into cash or trades seamlessly. Our AI handles the heavy lifting.
          </p>
        </div>

        <div className="sell-steps-container">
          {sellSteps.map((step, index) => (
            <div key={index} className="sell-step animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
              <div className="sell-step-number glass-panel">{index + 1}</div>
              <div className="sell-icon-wrapper">
                {step.icon}
              </div>
              <h3 className="sell-step-title">{step.title}</h3>
              <p className="sell-step-desc">{step.desc}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
};

export default SellInfo;
