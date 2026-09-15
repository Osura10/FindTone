import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Register.css';

const BuyerRegistration = () => {
  return (
    <div className="register-page">
      <div className="bg-gradients">
        <div className="gradient-sphere sphere-1"></div>
        <div className="gradient-sphere sphere-2"></div>
      </div>
      
      <div className="container">
        <div className="register-form-container glass-panel">
          <Link to="/register" className="back-btn">
            <ArrowLeft size={16} />
            Back to Options
          </Link>
          <div className="text-center mb-4">
            <h2>Buyer Registration</h2>
            <p className="register-subtitle mt-2">Create your account to start buying instruments.</p>
          </div>
          
          <form>
            <div className="form-group">
              <label>Name</label>
              <input type="text" className="form-control" placeholder="Enter your full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" placeholder="Enter your email" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" className="form-control" placeholder="Enter your phone number" />
            </div>
            <div className="form-group">
              <label>NIC Card Number</label>
              <input type="text" className="form-control" placeholder="Enter your NIC" />
            </div>
            <div className="form-group">
              <label>Password</label>
              <input type="password" className="form-control" placeholder="Create a password" />
            </div>
            <div className="form-group">
              <label>Confirm Password</label>
              <input type="password" className="form-control" placeholder="Confirm your password" />
            </div>
            
            <button type="button" className="btn btn-primary w-100 mt-3">Register</button>
          </form>
        </div>
      </div>
    </div>
  );
};

export default BuyerRegistration;
