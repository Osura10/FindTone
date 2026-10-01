import React from 'react';
import { UploadCloud, CheckCircle, TrendingUp, Handshake } from 'lucide-react';

const sellSteps = [
  { icon: UploadCloud, title: 'Post a listing', desc: 'Snap a few photos and add a quick description. Our AI helps auto-fill model details to save you time.' },
  { icon: CheckCircle, title: 'AI verification', desc: 'The Listing Quality & Fair Price agents review your post to make sure it looks great and is priced right.' },
  { icon: TrendingUp, title: 'Get matched', desc: 'Buyers with a matching alert are told straight away, and people who saved it hear about price drops.' },
  { icon: Handshake, title: 'Close the deal', desc: 'Buyers check out with cash on delivery or card, and you see every sale in your dashboard.' }
];

const SellInfo = () => (
  <section className="lp-section" id="sell">
    <div className="lp-container">
      <div className="lp-section-head">
        <span className="lp-kicker">Selling</span>
        <h2 className="lp-h2">How selling works</h2>
        <p className="lp-lead">Turn unused gear into cash. Our AI handles the heavy lifting.</p>
      </div>
      <ol className="lp-steps">
        {sellSteps.map((step, index) => (
          <li key={step.title} className="card lp-step">
            <span className="lp-step-num" aria-hidden="true">{index + 1}</span>
            <span className="lp-icon"><step.icon size={22} aria-hidden="true" /></span>
            <h3>{step.title}</h3>
            <p>{step.desc}</p>
          </li>
        ))}
      </ol>
    </div>
  </section>
);

export default SellInfo;
