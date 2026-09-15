import React from 'react';
import { MapPin, Inbox, Tag, Repeat } from 'lucide-react';
import './ShopInfo.css';

const shopFeatures = [
  {
    icon: <MapPin className="shop-icon" />,
    title: 'Local Discovery',
    desc: 'Buyers see nearby shop inventory when searching for instruments, driving foot traffic to your physical store.'
  },
  {
    icon: <Repeat className="shop-icon" />,
    title: 'Trade-in Matches',
    desc: 'Our AI notifies your shop when a user is selling an instrument that matches what you typically buy or trade.'
  },
  {
    icon: <Tag className="shop-icon" />,
    title: 'Bulk Listings',
    desc: 'Easily sync your existing inventory to MusicMarket with our specialized shop dashboard tools.'
  },
  {
    icon: <Inbox className="shop-icon" />,
    title: 'Direct Inquiries',
    desc: 'Customers can message your shop directly to ask about stock, setup services, or trade-in evaluations.'
  }
];

const ShopInfo = () => {
  return (
    <section className="shop-info-section" id="shops">
      <div className="container">
        <div className="shop-layout">
          <div className="shop-text-content">
            <h2 className="section-title">For <span className="text-gradient">Local Shops</span></h2>
            <p className="shop-subtitle">
              Expand your local reach and turn casual browsers into loyal customers. MusicMarket acts as your smart, digital storefront.
            </p>
            <div className="shop-features-list">
              {shopFeatures.map((feature, index) => (
                <div key={index} className="shop-feature-item animate-fade-in-up" style={{ animationDelay: `${index * 100}ms` }}>
                  <div className="shop-feature-icon-wrapper">
                    {feature.icon}
                  </div>
                  <div className="shop-feature-text">
                    <h4>{feature.title}</h4>
                    <p>{feature.desc}</p>
                  </div>
                </div>
              ))}
            </div>
            <button className="btn btn-primary shop-cta-btn">Claim Your Shop Profile</button>
          </div>
          
          <div className="shop-visual-content glass-panel animate-fade-in-up delay-200">
            <div className="shop-mockup-header">
              <div className="mockup-dot red"></div>
              <div className="mockup-dot yellow"></div>
              <div className="mockup-dot green"></div>
            </div>
            <div className="shop-mockup-body">
              <div className="mockup-shop-banner"></div>
              <div className="mockup-shop-avatar"></div>
              <h3 className="mockup-shop-title">Downtown Guitars</h3>
              <p className="mockup-shop-meta">📍 2.4 miles away • ⭐ 4.9/5</p>
              
              <div className="mockup-inventory">
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
                <div className="mockup-item"></div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopInfo;
