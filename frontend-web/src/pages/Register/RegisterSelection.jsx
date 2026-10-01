import React from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Store, ShoppingBag, ArrowRight } from 'lucide-react';
import { AuthLayout } from '../../components/AuthLayout';

const RegisterSelection = () => {
  const navigate = useNavigate();

  return (
    <AuthLayout
      wide
      title="Join MusicMarket"
      subtitle="Choose how you want to use the platform."
      footer={<>Already have an account? <Link to="/login">Log in</Link></>}
    >
      <div className="role-grid">
        <button type="button" className="card role-card" onClick={() => navigate('/register/buyer')}>
          <span className="page-icon"><ShoppingBag size={22} aria-hidden="true" /></span>
          <h2>I&apos;m a buyer</h2>
          <p>I want to browse, search and buy musical instruments.</p>
          <ul>
            <li>Save listings and get price-drop alerts</li>
            <li>Sell your own gear too</li>
          </ul>
          <span className="cta">Continue as buyer <ArrowRight size={16} aria-hidden="true" /></span>
        </button>

        <button type="button" className="card role-card" onClick={() => navigate('/register/shop')}>
          <span className="page-icon"><Store size={22} aria-hidden="true" /></span>
          <h2>I run a shop</h2>
          <p>I represent a local shop and want to list inventory.</p>
          <ul>
            <li>Reach buyers near your store</li>
            <li>Verified shop profile</li>
          </ul>
          <span className="cta">Continue as shop <ArrowRight size={16} aria-hidden="true" /></span>
        </button>
      </div>
    </AuthLayout>
  );
};

export default RegisterSelection;
