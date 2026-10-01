import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import { ErrorState } from '../../components/ui';
import { validateCheckout } from '../../utils/checkoutValidation';

import { ShieldCheck, Truck, CreditCard, Banknote, CheckCircle, ArrowLeft, Loader2 } from 'lucide-react';

const Checkout = () => {
  const { listingId } = useParams();
  const navigate = useNavigate();

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');
  const [success, setSuccess] = useState(null);

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    addressLine: '',
    city: '',
    postalCode: '',
    notes: '',
    paymentMethod: 'CARD', // or 'COD'
    card: {
      number: '',
      holderName: '',
      expiry: '',
      cvv: ''
    }
  });

  const { currentUser } = useDashboard();
  const submittingRef = useRef(false); // blocks a second click before React re-renders

  // Admins cannot buy: send them back to the listing details page.
  useEffect(() => {
    if (isAdminUser(currentUser)) {
      toast.error('Admin accounts cannot place orders.');
      navigate(`/dashboard/listings/${listingId}`, { replace: true });
    }
  }, [currentUser, listingId, navigate]);

  const fetchListing = useCallback(async () => {
    try {
      const data = await apiCall(`/listings/${listingId}`);
      setListing(data);
      setError(data.status !== 'LIVE' ? 'This item is no longer available for purchase.' : '');
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      setError(err.message || 'Failed to load listing.');
    } finally {
      setLoading(false);
    }
  }, [listingId, navigate]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchListing();
  }, [fetchListing]);

  const handleInputChange = (e) => {
    const { name, value } = e.target;
    if (name.startsWith('card.')) {
      const field = name.split('.')[1];
      if (field === 'number') {
        // Auto-spacing for card number
        let formatted = value.replace(/\s+/g, '').replace(/[^0-9]/gi, '');
        let spaced = formatted.match(/.{1,4}/g)?.join(' ') || '';
        setFormData(prev => ({ ...prev, card: { ...prev.card, number: spaced.substring(0, 19) } }));
      } else if (field === 'expiry') {
        let formatted = value.replace(/\s+/g, '').replace(/[^0-9/]/gi, '');
        if (formatted.length === 2 && !formatted.includes('/') && formData.card.expiry.length < 2) {
            formatted += '/';
        }
        setFormData(prev => ({ ...prev, card: { ...prev.card, expiry: formatted.substring(0, 5) } }));
      } else if (field === 'cvv') {
        setFormData(prev => ({ ...prev, card: { ...prev.card, cvv: value.replace(/[^0-9]/g, '').substring(0, 3) } }));
      } else {
        setFormData(prev => ({ ...prev, card: { ...prev.card, [field]: value } }));
      }
    } else {
      setFormData(prev => ({ ...prev, [name]: value }));
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (submittingRef.current) return;
    const problem = validateCheckout(formData);
    if (problem) {
      setError(problem);
      return;
    }

    const payload = {
      listingId: Number(listingId),
      paymentMethod: formData.paymentMethod,
      fullName: formData.fullName.trim(),
      phone: formData.phone.trim(),
      addressLine: formData.addressLine.trim(),
      city: formData.city.trim(),
      postalCode: formData.postalCode.trim() || null,
      notes: formData.notes.trim() || null,
      card: formData.paymentMethod === 'CARD'
        ? {
            number: formData.card.number.replace(/[\s-]/g, ''),
            holderName: formData.card.holderName.trim(),
            expiry: formData.card.expiry.trim(),
            cvv: formData.card.cvv
          }
        : null
    };

    submittingRef.current = true;
    setSubmitting(true);
    setError('');
    try {
      const res = await apiCall('/orders', { method: 'POST', body: JSON.stringify(payload) });
      setSuccess({ orderId: res.orderId, status: res.status });
    } catch (err) {
      if (err.status === 401) {
        navigate('/login', { replace: true });
        return;
      }
      // Show exactly what the backend said (e.g. "This item has already been sold.").
      setError(err.message || 'Could not place your order. Please try again.');
      if (err.status === 409) setListing((prev) => (prev ? { ...prev, status: 'SOLD' } : prev));
    } finally {
      submittingRef.current = false;
      setSubmitting(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Loading checkout...</p>
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0' }}>
        <ErrorState message={error} onRetry={() => { setLoading(true); fetchListing(); }} />
        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>Go Back</button>
      </div>
    );
  }

  if (success) {
    return (
      <div className="animate-fade-in-up" style={{ maxWidth: '600px', margin: '4rem auto', textAlign: 'center' }}>
        <div className="glass-panel" style={{ padding: '3rem', borderRadius: '24px' }}>
          <CheckCircle size={64} style={{ color: '#10b981', margin: '0 auto 1rem auto' }} />
          <h1 style={{ marginBottom: '0.5rem', color: '#10b981' }}>Order Placed!</h1>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '2rem' }}>
            Thank you for your purchase. Your order <strong data-testid="order-id">#{success.orderId}</strong> has been created
            ({success.status === 'PAID' ? 'paid by card' : 'cash on delivery'}).
          </p>
          <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1.5rem', borderRadius: '12px', textAlign: 'left', marginBottom: '2rem' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '1rem', marginBottom: '1rem' }}>
              <img src={listing.images?.[0]?.url || 'https://placehold.co/100x100?text=No+Photo'} alt="Item" style={{ width: '60px', height: '60px', borderRadius: '8px', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: 'bold' }}>{listing.title}</div>
                <div style={{ color: 'var(--primary-hover)', fontWeight: 'bold' }}>LKR {listing.price.toLocaleString()}</div>
              </div>
            </div>
            <div style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              <div><strong>Deliver to:</strong> {formData.fullName}</div>
              <div>{formData.addressLine}, {formData.city}</div>
            </div>
          </div>
          <button className="btn btn-primary" onClick={() => navigate('/dashboard/orders')} style={{ width: '100%' }}>
            View My Orders
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ maxWidth: '1000px', margin: '0 auto', padding: '1rem 0 4rem' }}>
      <button
        onClick={() => navigate(-1)}
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={18} /> Back to listing
      </button>

      <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: '0 0 2rem 0', fontWeight: '800' }}>Secure Checkout</h1>

      {error && (
        <div style={{ background: 'rgba(239, 68, 68, 0.1)', border: '1px solid rgba(239, 68, 68, 0.3)', padding: '1rem', borderRadius: '12px', color: '#ff6b6b', marginBottom: '2rem', display: 'flex', alignItems: 'center', gap: '12px' }}>
          <ShieldCheck size={24} /> {error}
        </div>
      )}

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 350px', gap: '2rem' }}>
        {/* Left Col: Form */}
        <div>
          <form onSubmit={handleSubmit} id="checkout-form" noValidate>
            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', marginBottom: '2rem' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Truck size={20} color="var(--primary-hover)" /> Delivery Information
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Full Name</label>
                  <input type="text" name="fullName" value={formData.fullName} onChange={handleInputChange} className="input-field" required style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Phone Number</label>
                  <input type="tel" name="phone" value={formData.phone} onChange={handleInputChange} className="input-field" required style={{ width: '100%' }} placeholder="e.g. 0712345678" />
                </div>
              </div>

              <div style={{ marginBottom: '1rem' }}>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Address Line</label>
                <input type="text" name="addressLine" value={formData.addressLine} onChange={handleInputChange} className="input-field" required style={{ width: '100%' }} />
              </div>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '1rem' }}>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>City</label>
                  <input type="text" name="city" value={formData.city} onChange={handleInputChange} className="input-field" required style={{ width: '100%' }} />
                </div>
                <div>
                  <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Postal Code (Optional)</label>
                  <input type="text" name="postalCode" value={formData.postalCode} onChange={handleInputChange} className="input-field" style={{ width: '100%' }} />
                </div>
              </div>

              <div>
                <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Delivery Notes (Optional)</label>
                <textarea name="notes" value={formData.notes} onChange={handleInputChange} className="input-field" rows="3" style={{ width: '100%', resize: 'vertical' }}></textarea>
              </div>
            </div>

            <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px' }}>
              <h3 style={{ margin: '0 0 1.5rem 0', display: 'flex', alignItems: 'center', gap: '8px' }}>
                <Banknote size={20} color="var(--primary-hover)" /> Payment Method
              </h3>

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginBottom: '2rem' }}>
                <div
                  role="radio"
                  aria-checked={formData.paymentMethod === 'CARD'}
                  tabIndex={0}
                  data-testid="pay-card"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFormData(prev => ({ ...prev, paymentMethod: 'CARD' })); }}
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'CARD' }))}
                  style={{
                    border: formData.paymentMethod === 'CARD' ? '2px solid var(--primary-hover)' : '2px solid rgba(255,255,255,0.1)',
                    background: formData.paymentMethod === 'CARD' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0,0,0,0.2)',
                    padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  <CreditCard size={32} color={formData.paymentMethod === 'CARD' ? 'var(--primary-hover)' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: formData.paymentMethod === 'CARD' ? 'bold' : 'normal', color: formData.paymentMethod === 'CARD' ? '#fff' : 'var(--text-secondary)' }}>Card Payment</span>
                </div>
                <div
                  role="radio"
                  aria-checked={formData.paymentMethod === 'COD'}
                  tabIndex={0}
                  data-testid="pay-cod"
                  onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') setFormData(prev => ({ ...prev, paymentMethod: 'COD' })); }}
                  onClick={() => setFormData(prev => ({ ...prev, paymentMethod: 'COD' }))}
                  style={{
                    border: formData.paymentMethod === 'COD' ? '2px solid var(--primary-hover)' : '2px solid rgba(255,255,255,0.1)',
                    background: formData.paymentMethod === 'COD' ? 'rgba(168, 85, 247, 0.1)' : 'rgba(0,0,0,0.2)',
                    padding: '1.5rem', borderRadius: '12px', cursor: 'pointer', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '8px', transition: 'all 0.2s'
                  }}
                >
                  <Banknote size={32} color={formData.paymentMethod === 'COD' ? 'var(--primary-hover)' : 'var(--text-secondary)'} />
                  <span style={{ fontWeight: formData.paymentMethod === 'COD' ? 'bold' : 'normal', color: formData.paymentMethod === 'COD' ? '#fff' : 'var(--text-secondary)' }}>Cash on Delivery</span>
                </div>
              </div>

              {formData.paymentMethod === 'CARD' && (
                <div className="animate-fade-in-up">
                  <div style={{ background: 'rgba(168, 85, 247, 0.1)', border: '1px solid rgba(168, 85, 247, 0.3)', padding: '1rem', borderRadius: '8px', marginBottom: '1.5rem', fontSize: '0.9rem', color: '#e9d5ff' }}>
                    <strong>Demo mode</strong> - use card <code>1234 1234 1234 1234</code>, any future expiry (MM/YY), any 3-digit CVV. Only the last 4 digits are stored.
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Card Number</label>
                    <input type="text" name="card.number" value={formData.card.number} onChange={handleInputChange} className="input-field" required style={{ width: '100%', letterSpacing: '2px' }} placeholder="0000 0000 0000 0000" />
                  </div>

                  <div style={{ marginBottom: '1rem' }}>
                    <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Card Holder Name</label>
                    <input type="text" name="card.holderName" value={formData.card.holderName} onChange={handleInputChange} className="input-field" required style={{ width: '100%' }} />
                  </div>

                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>Expiry</label>
                      <input type="text" name="card.expiry" value={formData.card.expiry} onChange={handleInputChange} className="input-field" required style={{ width: '100%' }} placeholder="MM/YY" />
                    </div>
                    <div>
                      <label style={{ display: 'block', marginBottom: '0.5rem', fontSize: '0.9rem', color: 'var(--text-secondary)' }}>CVV</label>
                      <input type="password" name="card.cvv" value={formData.card.cvv} onChange={handleInputChange} className="input-field" required style={{ width: '100%', letterSpacing: '4px' }} placeholder="•••" />
                    </div>
                  </div>
                </div>
              )}
            </div>
          </form>
        </div>

        {/* Right Col: Summary */}
        <div>
          <div className="glass-panel" style={{ padding: '2rem', borderRadius: '16px', position: 'sticky', top: '2rem' }}>
            <h3 style={{ margin: '0 0 1.5rem 0' }}>Order Summary</h3>

            <div style={{ display: 'flex', gap: '1rem', marginBottom: '1.5rem' }}>
              <img src={listing.images?.[0]?.url || 'https://placehold.co/100x100?text=No+Photo'} alt="Item" style={{ width: '80px', height: '80px', borderRadius: '12px', objectFit: 'cover' }} />
              <div>
                <div style={{ fontWeight: '600', fontSize: '1.1rem', marginBottom: '4px', lineHeight: 1.2 }}>{listing.title}</div>
                <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>{listing.condition}</div>
              </div>
            </div>

            <div style={{ borderTop: '1px solid rgba(255,255,255,0.1)', borderBottom: '1px solid rgba(255,255,255,0.1)', padding: '1rem 0', margin: '1.5rem 0' }}>
              <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '0.5rem' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Subtotal</span>
                <span>LKR {listing.price.toLocaleString()}</span>
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between' }}>
                <span style={{ color: 'var(--text-secondary)' }}>Shipping</span>
                <span style={{ color: '#10b981' }}>Free</span>
              </div>
            </div>

            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end', marginBottom: '2rem' }}>
              <span style={{ fontSize: '1.2rem', fontWeight: 'bold' }}>Total</span>
              <span style={{ fontSize: '1.8rem', fontWeight: '900', color: 'var(--primary-hover)', lineHeight: 1 }}>LKR {listing.price.toLocaleString()}</span>
            </div>

            <button
              type="submit"
              form="checkout-form"
              data-testid="place-order"
              className="btn btn-primary"
              disabled={submitting || listing.status !== 'LIVE'}
              style={{ width: '100%', padding: '1rem', fontSize: '1.1rem', display: 'flex', justifyContent: 'center', alignItems: 'center', gap: '8px' }}
            >
              {submitting ? <Loader2 size={20} className="animate-spin" /> : <ShieldCheck size={20} />}
              {submitting ? 'Processing...' : `Place Order • LKR ${listing.price.toLocaleString()}`}
            </button>

            <div style={{ textAlign: 'center', marginTop: '1rem', fontSize: '0.8rem', color: 'var(--text-secondary)', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px' }}>
              <ShieldCheck size={14} /> Secure transaction
            </div>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Checkout;
