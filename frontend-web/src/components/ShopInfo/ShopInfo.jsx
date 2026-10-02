import React from 'react';
import { useNavigate } from 'react-router-dom';
import { MapPin, Inbox, Tag, Repeat, Star } from 'lucide-react';

const shopFeatures = [
  { icon: MapPin, title: 'Local discovery', desc: 'Buyers see nearby shop inventory on a map when searching, driving foot traffic to your store.' },
  { icon: Repeat, title: 'Instant alerts', desc: 'Buyers set alerts like "Yamaha guitar under 80k" – your matching listing reaches them first.' },
  { icon: Tag, title: 'Fair-price help', desc: 'Every listing gets a fair price range from real market data, so you can price to sell.' },
  { icon: Inbox, title: 'Orders in one place', desc: 'Track every sale, buyer contact and delivery address from your shop dashboard.' }
];

const ShopInfo = () => {
  const navigate = useNavigate();
  return (
    <section className="lp-section lp-section-alt" id="shops">
      <div className="lp-container lp-split">
        <div>
          <span className="lp-kicker">For shops</span>
          <h2 className="lp-h2">Your smart digital storefront</h2>
          <p className="lp-lead">Expand your local reach and turn casual browsers into loyal customers.</p>
          <div className="lp-feature-list">
            {shopFeatures.map((f) => (
              <div key={f.title} className="lp-feature-row">
                <span className="lp-icon"><f.icon size={20} aria-hidden="true" /></span>
                <div>
                  <h3>{f.title}</h3>
                  <p>{f.desc}</p>
                </div>
              </div>
            ))}
          </div>
          <button type="button" className="btn btn-primary btn-lg" onClick={() => navigate('/register/shop')}>Register your shop</button>
        </div>

        {/* Illustration of a shop profile */}
        <div className="card lp-mock" aria-hidden="true">
          <div className="lp-mock-banner" />
          <div className="lp-mock-body">
            <div className="lp-mock-avatar">KM</div>
            <strong style={{ fontSize: 'var(--text-lg)' }}>Kandy Music House</strong>
            <span className="text-sm muted row" style={{ gap: 6 }}>
              <MapPin size={14} /> Kandy · 2.4 km away · <Star size={14} fill="currentColor" /> 4.9
            </span>
            <div className="lp-mock-grid">
              {['#c4b5fd', '#fbcfe8', '#a7f3d0', '#fde68a'].map((c) => (
                <div key={c} className="lp-mock-item"><span style={{ background: c }} /><i /><b /></div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default ShopInfo;
