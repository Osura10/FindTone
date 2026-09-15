import React, { useState, useEffect } from 'react';
import { Sparkles, ArrowRight, Music, Play } from 'lucide-react';
import './Hero.css';

import img1 from '../../assets/item_01.png';
import img2 from '../../assets/item_02.png';
import img3 from '../../assets/item_03.png';
import img4 from '../../assets/item_04.png';
import img5 from '../../assets/item_05.png';

const images = [img1, img2, img3, img4, img5];

const Hero = () => {
  const [currentImageIndex, setCurrentImageIndex] = useState(0);

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentImageIndex((prevIndex) => (prevIndex + 1) % images.length);
    }, 3000); // Change image every 3 seconds

    return () => clearInterval(interval);
  }, []);

  return (
    <section className="hero" id="browse">
      <div className="container hero-container">
        <div className="hero-content">
          <div className="badge animate-fade-in-up">
            <Sparkles size={16} className="badge-icon" />
            <span>AI-Powered Instrument Trading</span>
          </div>
          
          <h1 className="hero-title animate-fade-in-up delay-100">
            Find Your Perfect Tone <br />
            <span className="text-gradient-accent">Smarter & Faster</span>
          </h1>
          
          <p className="hero-subtitle animate-fade-in-up delay-200">
            The intelligent marketplace for buying, selling, and renting musical instruments. 
            Backed by 4 AI Agents to ensure fair prices, quality listings, and secure trades.
          </p>
          
          <div className="hero-cta animate-fade-in-up delay-300">
            <button className="btn btn-primary btn-lg">
              Start Exploring
              <ArrowRight size={20} />
            </button>
            <button className="btn btn-outline btn-lg">
              <Play size={20} />
              How it works
            </button>
          </div>

          <div className="hero-stats animate-fade-in-up delay-300">
            <div className="stat-item">
              <span className="stat-number">10k+</span>
              <span className="stat-label">Instruments</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">4</span>
              <span className="stat-label">AI Agents</span>
            </div>
            <div className="stat-item">
              <span className="stat-number">100%</span>
              <span className="stat-label">Secure Trades</span>
            </div>
          </div>
        </div>

        <div className="hero-visual animate-fade-in-up delay-200">

          
          <div className="hero-image-wrapper">
            {images.map((img, index) => (
              <img
                key={index}
                src={img}
                alt={`Instrument ${index + 1}`}
                className={`slider-image ${index === currentImageIndex ? 'active' : ''}`}
              />
            ))}
          </div>
        </div>
      </div>
    </section>
  );
};

export default Hero;
