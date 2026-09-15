import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import './Register.css';

const ShopRegistration = () => {
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
            <h2>Shop Registration</h2>
            <p className="register-subtitle mt-2">Create your account to list your shop's inventory.</p>
          </div>
          
          <form>
            <div className="form-group">
              <label>Shop Name</label>
              <input type="text" className="form-control" placeholder="Enter shop name" />
            </div>
            <div className="form-group">
              <label>Owner Name</label>
              <input type="text" className="form-control" placeholder="Enter owner's full name" />
            </div>
            <div className="form-group">
              <label>Email</label>
              <input type="email" className="form-control" placeholder="Enter shop email" />
            </div>
            <div className="form-group">
              <label>Phone Number</label>
              <input type="tel" className="form-control" placeholder="Enter shop phone number" />
            </div>
            <div className="form-group">
              <label>Address</label>
              <input type="text" className="form-control" placeholder="Enter shop physical address" />
            </div>
            <div className="form-group">
              <label>Shop Registration ID</label>
              <input type="text" className="form-control" placeholder="Enter business registration ID" />
            </div>
            <div className="form-group">
              <label>NIC Card Number</label>
              <input type="text" className="form-control" placeholder="Enter owner's NIC" />
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

export default ShopRegistration;
