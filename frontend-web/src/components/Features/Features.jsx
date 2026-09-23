import React from 'react';
import { FileCheck, Search, MessageSquare, Sparkles } from 'lucide-react';
import './Features.css';

const features = [
  {
    icon: <FileCheck className="feature-icon" />,
    title: 'Listing Creation & Verification Agent',
    description: 'Helps shops create complete and accurate instrument listings from the details they provide. It verifies the information using available tools, identifies missing or incorrect details, and prepares the listing for human approval before publishing.',
    delay: 'delay-100'
  },
  {
    icon: <Search className="feature-icon" />,
    title: 'Smart Item Search & Matching Agent',
    description: 'Helps buyers find suitable instruments based on their search or requirements. It understands the buyer\'s request and searches the MusicMarket database to find relevant items based on category, price, condition, location, and other requirements.',
    delay: 'delay-200'
  },
  {
    icon: <MessageSquare className="feature-icon" />,
    title: 'MusicMarket Information & RAG Agent',
    description: 'Acts as an AI assistant for the website. It uses RAG to answer questions about MusicMarket and its features, and web search to provide useful information about musical instruments, brands, models, and other music-related topics.',
    delay: 'delay-300'
  },
  {
    icon: <Sparkles className="feature-icon" />,
    title: 'User Interest & Personalized Recommendation Agent',
    description: 'Learns from users\' searches and interactions to understand their interests. It stores and updates these interests and recommends relevant instrument listings to each user based on their interests and previous activity.',
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
