import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import { ShieldCheck, User, Mail, Phone, CreditCard, X, Loader2, KeyRound, Check } from 'lucide-react';
import { apiCall } from '../services/api';

const AddAdminModal = ({ isOpen, onClose, onAdminCreated }) => {
  const [formData, setFormData] = useState({
    name: '',
    email: '',
    phoneNumber: '',
    nicCardNumber: ''
  });
  const [errors, setErrors] = useState({});
  const [loading, setLoading] = useState(false);
  const [globalError, setGlobalError] = useState('');

  if (!isOpen) return null;

  const validate = () => {
    const errs = {};
    if (!formData.name.trim()) errs.name = 'Full Name is required';
    if (!formData.email.trim()) errs.email = 'Email address is required';
    else if (!formData.email.includes('@') || !formData.email.includes('.')) errs.email = 'Enter a valid email address';
    
    if (!formData.phoneNumber.trim()) errs.phoneNumber = 'Phone number is required';
    if (!formData.nicCardNumber.trim()) errs.nicCardNumber = 'NIC Card number is required';

    setErrors(errs);
    return Object.keys(errs).length === 0;
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setGlobalError('');

    if (!validate()) return;

    try {
      setLoading(true);
      const res = await apiCall('/admin/create-admin', {
        method: 'POST',
        body: JSON.stringify({
          name: formData.name.trim(),
          email: formData.email.trim(),
          phoneNumber: formData.phoneNumber.trim(),
          nicCardNumber: formData.nicCardNumber.trim()
        })
      });

      if (onAdminCreated) {
        onAdminCreated(res.admin, `Admin "${formData.name}" created successfully! Initial password is set to NIC: ${formData.nicCardNumber}`);
      }
      onClose();
    } catch (err) {
      console.error(err);
      setGlobalError(err.message || 'Failed to create administrator.');
    } finally {
      setLoading(false);
    }
  };

  return createPortal(
    <div 
      style={{
        position: 'fixed',
        top: 0,
        left: 0,
        right: 0,
        bottom: 0,
        background: 'rgba(8, 6, 15, 0.75)',
        backdropFilter: 'blur(8px)',
        WebkitBackdropFilter: 'blur(8px)',
        display: 'flex',
        justifyContent: 'center',
        alignItems: 'center',
        zIndex: 99999,
        padding: '1.5rem',
        animation: 'fadeInUp 0.25s cubic-bezier(0.16, 1, 0.3, 1)'
      }}
      onClick={() => !loading && onClose()}
    >
      <div 
        className="glass-panel"
        style={{
          width: '100%',
          maxWidth: '520px',
          padding: '2.5rem',
          position: 'relative',
          borderRadius: '24px',
          border: '1px solid rgba(123, 44, 191, 0.35)',
          background: 'linear-gradient(145deg, rgba(30, 24, 48, 0.98), rgba(18, 14, 28, 0.99))',
          boxShadow: '0 25px 60px rgba(0, 0, 0, 0.7), 0 0 30px rgba(123, 44, 191, 0.25)',
          maxHeight: '90vh',
          overflowY: 'auto'
        }}
        onClick={(e) => e.stopPropagation()}
      >
        {/* Top accent line */}
        <div style={{
          position: 'absolute',
          top: 0,
          left: 0,
          right: 0,
          height: '4px',
          background: 'linear-gradient(90deg, var(--primary-color), var(--accent-color))'
        }} />

        {/* Close button */}
        <button
          onClick={onClose}
          disabled={loading}
          style={{
            position: 'absolute',
            top: '1.25rem',
            right: '1.25rem',
            background: 'rgba(255, 255, 255, 0.06)',
            border: '1px solid rgba(255, 255, 255, 0.1)',
            color: 'var(--text-secondary)',
            borderRadius: '50%',
            width: '36px',
            height: '36px',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            cursor: 'pointer',
            transition: 'all 0.2s ease'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.15)';
            e.currentTarget.style.color = '#fff';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.background = 'rgba(255, 255, 255, 0.06)';
            e.currentTarget.style.color = 'var(--text-secondary)';
          }}
        >
          <X size={18} />
        </button>

        {/* Modal Header */}
        <div style={{ display: 'flex', alignItems: 'center', gap: '0.85rem', marginBottom: '1.5rem' }}>
          <div style={{
            padding: '0.75rem',
            borderRadius: '14px',
            background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.3), rgba(255, 0, 110, 0.2))',
            color: 'var(--primary-hover)',
            border: '1px solid rgba(123, 44, 191, 0.4)'
          }}>
            <ShieldCheck size={26} />
          </div>
          <div>
            <h2 style={{ margin: 0, fontSize: '1.5rem', fontWeight: '800' }}>Add New Admin</h2>
            <p style={{ margin: 0, fontSize: '0.88rem', color: 'var(--text-secondary)' }}>
              Provision an authorized platform administrator account
            </p>
          </div>
        </div>

        {/* Informative notice about default password */}
        <div style={{
          background: 'rgba(123, 44, 191, 0.12)',
          border: '1px solid rgba(123, 44, 191, 0.35)',
          borderRadius: '12px',
          padding: '0.85rem 1rem',
          marginBottom: '1.5rem',
          display: 'flex',
          alignItems: 'flex-start',
          gap: '0.75rem',
          fontSize: '0.86rem',
          color: 'rgba(255, 255, 255, 0.9)'
        }}>
          <KeyRound size={18} color="var(--primary-hover)" style={{ flexShrink: 0, marginTop: '2px' }} />
          <div>
            <strong style={{ color: 'var(--primary-hover)', display: 'block', marginBottom: '0.2rem' }}>
              Automatic Password Assignment
            </strong>
            The default password will automatically be set to the Admin's <strong>NIC Card Number</strong>. The admin will be prompted to change their password upon their first login.
          </div>
        </div>

        {globalError && (
          <div style={{
            backgroundColor: 'rgba(255, 77, 79, 0.15)',
            color: '#ff4d4f',
            padding: '0.85rem 1rem',
            borderRadius: '10px',
            marginBottom: '1.25rem',
            border: '1px solid rgba(255, 77, 79, 0.35)',
            fontSize: '0.88rem'
          }}>
            {globalError}
          </div>
        )}

        <form onSubmit={handleSubmit} noValidate style={{ display: 'flex', flexDirection: 'column', gap: '1.15rem' }}>
          
          {/* Full Name */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <User size={14} color="var(--primary-hover)" /> Admin Full Name
            </label>
            <input 
              type="text"
              className="form-control"
              placeholder="e.g. Alexander Pierce"
              value={formData.name}
              onChange={(e) => {
                setFormData({ ...formData, name: e.target.value });
                setErrors((prev) => ({ ...prev, name: '' }));
              }}
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: errors.name ? '1px solid #ff4d4f' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.95rem'
              }}
            />
            {errors.name && <small style={{ color: '#ff4d4f', marginTop: '0.3rem', display: 'block' }}>{errors.name}</small>}
          </div>

          {/* Email Address */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Mail size={14} color="var(--accent-color)" /> Email Address
            </label>
            <input 
              type="email"
              className="form-control"
              placeholder="e.g. admin@musicmarket.com"
              value={formData.email}
              onChange={(e) => {
                setFormData({ ...formData, email: e.target.value });
                setErrors((prev) => ({ ...prev, email: '' }));
              }}
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: errors.email ? '1px solid #ff4d4f' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.95rem'
              }}
            />
            {errors.email && <small style={{ color: '#ff4d4f', marginTop: '0.3rem', display: 'block' }}>{errors.email}</small>}
          </div>

          {/* Phone Number */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <Phone size={14} color="#00f5d4" /> Phone Number
            </label>
            <input 
              type="tel"
              className="form-control"
              placeholder="e.g. +94 77 123 4567"
              value={formData.phoneNumber}
              onChange={(e) => {
                setFormData({ ...formData, phoneNumber: e.target.value });
                setErrors((prev) => ({ ...prev, phoneNumber: '' }));
              }}
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: errors.phoneNumber ? '1px solid #ff4d4f' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.95rem'
              }}
            />
            {errors.phoneNumber && <small style={{ color: '#ff4d4f', marginTop: '0.3rem', display: 'block' }}>{errors.phoneNumber}</small>}
          </div>

          {/* NIC Card Number */}
          <div className="form-group" style={{ marginBottom: 0 }}>
            <label style={{ fontSize: '0.85rem', fontWeight: '600', color: 'var(--text-secondary)', marginBottom: '0.4rem', display: 'flex', alignItems: 'center', gap: '0.4rem' }}>
              <CreditCard size={14} color="#fee440" /> NIC Card Number (Acts as Default Password)
            </label>
            <input 
              type="text"
              className="form-control"
              placeholder="e.g. 199812345678 or 981234567V"
              value={formData.nicCardNumber}
              onChange={(e) => {
                setFormData({ ...formData, nicCardNumber: e.target.value });
                setErrors((prev) => ({ ...prev, nicCardNumber: '' }));
              }}
              style={{
                padding: '0.8rem 1rem',
                borderRadius: '12px',
                background: 'rgba(255, 255, 255, 0.05)',
                border: errors.nicCardNumber ? '1px solid #ff4d4f' : '1px solid rgba(255, 255, 255, 0.15)',
                color: '#fff',
                fontSize: '0.95rem'
              }}
            />
            {errors.nicCardNumber && <small style={{ color: '#ff4d4f', marginTop: '0.3rem', display: 'block' }}>{errors.nicCardNumber}</small>}
          </div>

          {/* Modal Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            <button 
              type="button" 
              className="btn btn-outline" 
              onClick={onClose} 
              disabled={loading}
              style={{ flex: 1, borderRadius: '12px' }}
            >
              Cancel
            </button>
            <button 
              type="submit" 
              className="btn btn-primary" 
              disabled={loading}
              style={{ flex: 1, borderRadius: '12px', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '0.5rem' }}
            >
              {loading ? <Loader2 size={18} className="animate-spin" /> : <><ShieldCheck size={18} /> Create Admin</>}
            </button>
          </div>
        </form>
      </div>
    </div>,
    document.body
  );
};

export default AddAdminModal;
