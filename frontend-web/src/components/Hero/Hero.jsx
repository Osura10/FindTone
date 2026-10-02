import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Sparkles, ArrowRight, ShieldCheck, BadgeCheck, Tag } from 'lucide-react';

import img1 from '../../assets/item_01.png';
import img2 from '../../assets/item_02.png';
import img3 from '../../assets/item_03.png';
import img4 from '../../assets/item_04.png';
import img5 from '../../assets/item_05.png';

const images = [img1, img2, img3, img4, img5];

const Hero = () => {
  const navigate = useNavigate();
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="lp-hero" id="browse">
      <div className="lp-container lp-hero-grid">
        <div className="lp-hero-copy">
          <span className="badge badge-primary lp-eyebrow">
            <Sparkles size={14} aria-hidden="true" /> AI-powered instrument marketplace
          </span>
          <h1 className="lp-hero-title">
            Find your perfect tone, <span className="lp-accent">smarter and safer.</span>
          </h1>
          <p className="lp-hero-sub">
            Buy and sell musical instruments across Sri Lanka. Four AI agents check every listing for a fair price,
            real photos and trusted sellers – before it goes live.
          </p>
          <div className="row" style={{ gap: 12 }}>
            <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/register')}>
              Start exploring <ArrowRight size={18} aria-hidden="true" />
            </button>
            <a href="#sell" className="btn btn-secondary btn-lg">How it works</a>
          </div>
          <ul className="lp-trust-list">
            <li><ShieldCheck size={16} aria-hidden="true" /> Trust-checked sellers</li>
            <li><Tag size={16} aria-hidden="true" /> Fair-price verdicts</li>
            <li><BadgeCheck size={16} aria-hidden="true" /> Cash on delivery</li>
          </ul>
        </div>

        <div className="lp-hero-visual">
          <div className="lp-hero-frame">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={index === currentImageIndex ? 'Instrument for sale on MusicMarket' : ''}
                aria-hidden={index === currentImageIndex ? undefined : 'true'}
                className={`lp-slide ${index === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>
          <div className="lp-float-card lp-float-1 card">
            <span className="badge badge-success badge-dot">Fair price</span>
            <strong>Yamaha F310</strong>
            <span className="price-tag sm"><span className="currency">LKR</span>33,000</span>
          </div>
          <div className="lp-float-card lp-float-2 card">
            <span className="row" style={{ gap: 6 }}><ShieldCheck size={16} color="var(--success)" aria-hidden="true" /> <strong>Trust 92/100</strong></span>
            <span className="text-xs muted">Verified by AI in 4s</span>
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
