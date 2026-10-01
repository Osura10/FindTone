import React from 'react';
import { FileCheck, Search, MessageSquare, Sparkles } from 'lucide-react';

const features = [
  {
    icon: FileCheck,
    title: 'Listing Creation & Verification Agent',
    description: 'Helps sellers create complete and accurate instrument listings. It verifies the details, spots missing or incorrect information, checks photos and price, and sends risky listings to an admin before they go live.'
  },
  {
    icon: Search,
    title: 'Smart Item Search & Matching Agent',
    description: "Helps buyers find suitable instruments. It understands the buyer's request and searches MusicMarket by category, price, condition, location and other needs."
  },
  {
    icon: MessageSquare,
    title: 'MusicMarket Information & RAG Agent',
    description: 'An AI assistant for the website. It uses RAG to answer questions about MusicMarket, and web search for information about instruments, brands and models.'
  },
  {
    icon: Sparkles,
    title: 'User Interest & Personalized Recommendation Agent',
    description: "Learns from users' searches and saved alerts to understand their interests, and recommends relevant listings to each user."
  }
];

const Features = () => (
  <section className="lp-section" id="about">
    <div className="lp-container">
      <div className="lp-section-head">
        <span className="lp-kicker">Under the hood</span>
        <h2 className="lp-h2">Powered by 4 AI agents</h2>
        <p className="lp-lead">They work in the background so every trade is fair, safe and exactly what you are looking for.</p>
      </div>
      <div className="lp-features">
        {features.map((f) => (
          <article key={f.title} className="card lp-feature">
            <span className="lp-icon"><f.icon size={22} aria-hidden="true" /></span>
            <h3>{f.title}</h3>
            <p>{f.description}</p>
          </article>
        ))}
      </div>
    </div>
  </section>
);

export default Features;
