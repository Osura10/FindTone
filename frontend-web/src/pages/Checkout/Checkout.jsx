import React, { useCallback, useEffect, useRef, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import { Button, Card, ErrorState, Input, PageHeader, PriceTag, Skeleton, Textarea, formatLKR } from '../../components/ui';
import { validateCheckout } from '../../utils/checkoutValidation';

import { ShieldCheck, Truck, CreditCard, Banknote, CheckCircle, ArrowLeft, Info, Lock } from 'lucide-react';

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
      <div className="page" aria-busy="true" aria-label="Loading checkout">
        <Skeleton height="36px" width="260px" />
        <div className="checkout-layout">
          <div className="stack"><Skeleton height="300px" radius="var(--radius-lg)" /><Skeleton height="220px" radius="var(--radius-lg)" /></div>
          <Skeleton height="360px" radius="var(--radius-lg)" />
        </div>
      </div>
    );
  }

  if (error && !listing) {
    return (
      <div className="page page-narrow">
        <Card><ErrorState message={error} onRetry={() => { setLoading(true); fetchListing(); }} /></Card>
        <div><Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>Go back</Button></div>
      </div>
    );
  }

  const cover = listing.images?.[0]?.url || 'https://placehold.co/100x100?text=No+Photo';

  if (success) {
    return (
      <div className="page" style={{ maxWidth: 560 }}>
        <Card className="stack text-center" style={{ alignItems: 'center', padding: 'var(--space-10) var(--space-6)' }}>
          <span className="success-icon"><CheckCircle size={36} aria-hidden="true" /></span>
          <div>
            <h1 className="page-title">Order placed!</h1>
            <p className="muted" style={{ marginTop: 8 }}>
              Thank you for your purchase. Your order <strong data-testid="order-id" style={{ color: 'var(--text)' }}>#{success.orderId}</strong> has been created
              ({success.status === 'PAID' ? 'paid by card' : 'cash on delivery'}).
            </p>
          </div>
          <div className="summary-item w-100" style={{ textAlign: 'left' }}>
            <img src={cover} alt="" />
            <div style={{ minWidth: 0 }}>
              <div className="truncate" style={{ fontWeight: 650 }}>{listing.title}</div>
              <PriceTag amount={listing.price} size="sm" />
              <div className="text-xs muted" style={{ marginTop: 4 }}>Deliver to {formData.fullName} · {formData.addressLine}, {formData.city}</div>
            </div>
          </div>
          <div className="row w-100" style={{ gap: 8 }}>
            <Button variant="secondary" className="grow" onClick={() => navigate('/dashboard/items')}>Keep browsing</Button>
            <Button className="grow" onClick={() => navigate('/dashboard/orders')}>View my orders</Button>
          </div>
        </Card>
      </div>
    );
  }

  const payOption = (method, Icon, title, text) => {
    const selected = formData.paymentMethod === method;
    return (
      <div
        role="radio"
        aria-checked={selected}
        tabIndex={0}
        data-testid={method === 'CARD' ? 'pay-card' : 'pay-cod'}
        className={`pay-option ${selected ? 'selected' : ''}`}
        onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') { e.preventDefault(); setFormData(prev => ({ ...prev, paymentMethod: method })); } }}
        onClick={() => setFormData(prev => ({ ...prev, paymentMethod: method }))}
      >
        <span className="pay-radio" aria-hidden="true" />
        <Icon size={22} aria-hidden="true" />
        <span className="stack" style={{ gap: 0 }}>
          <strong className="text-sm">{title}</strong>
          <span className="text-xs muted">{text}</span>
        </span>
      </div>
    );
  };

  return (
    <div className="page">
      <div>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>Back to listing</Button>
      </div>
      <PageHeader title="Checkout" subtitle="Your details go only to the seller for delivery." icon={Lock} />

      {error && (
        <div className="alert alert-danger" role="alert">
          <ShieldCheck size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /> <span className="grow">{error}</span>
        </div>
      )}

      <div className="checkout-layout">
        {/* Left: form */}
        <form onSubmit={handleSubmit} id="checkout-form" noValidate className="stack" style={{ gap: 'var(--space-5)' }}>
          <Card as="section" className="stack">
            <h2 className="section-title row" style={{ gap: 8 }}><Truck size={18} aria-hidden="true" color="var(--primary-text)" /> Delivery information</h2>
            <div className="form-grid">
              <Input label="Full name" required name="fullName" autoComplete="name" value={formData.fullName} onChange={handleInputChange} />
              <Input label="Phone number" required type="tel" name="phone" autoComplete="tel" value={formData.phone} onChange={handleInputChange} placeholder="e.g. 0712345678" />
              <Input label="Address line" required name="addressLine" autoComplete="street-address" value={formData.addressLine} onChange={handleInputChange} fieldClassName="span-2" />
              <Input label="City" required name="city" autoComplete="address-level2" value={formData.city} onChange={handleInputChange} />
              <Input label="Postal code" hint="Optional" name="postalCode" autoComplete="postal-code" value={formData.postalCode} onChange={handleInputChange} />
              <Textarea label="Delivery notes" hint="Optional" name="notes" rows={3} value={formData.notes} onChange={handleInputChange} fieldClassName="span-2" />
            </div>
          </Card>

          <Card as="section" className="stack">
            <h2 className="section-title row" style={{ gap: 8 }}><Banknote size={18} aria-hidden="true" color="var(--primary-text)" /> Payment method</h2>
            <div className="pay-options" role="radiogroup" aria-label="Payment method">
              {payOption('CARD', CreditCard, 'Card payment', 'Visa, Mastercard')}
              {payOption('COD', Banknote, 'Cash on delivery', 'Pay when it arrives')}
            </div>

            {formData.paymentMethod === 'CARD' && (
              <div className="stack animate-fade-in-up">
                <div className="alert alert-info">
                  <Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} />
                  <span><strong>Demo mode</strong> – use card <code>1234 1234 1234 1234</code>, any future expiry (MM/YY) and any 3-digit CVV. Only the last 4 digits are stored.</span>
                </div>
                <div className="form-grid">
                  <Input label="Card number" required name="card.number" inputMode="numeric" autoComplete="cc-number" value={formData.card.number} onChange={handleInputChange} placeholder="0000 0000 0000 0000" style={{ letterSpacing: '0.1em' }} fieldClassName="span-2" />
                  <Input label="Card holder name" required name="card.holderName" autoComplete="cc-name" value={formData.card.holderName} onChange={handleInputChange} fieldClassName="span-2" />
                  <Input label="Expiry" required name="card.expiry" inputMode="numeric" autoComplete="cc-exp" value={formData.card.expiry} onChange={handleInputChange} placeholder="MM/YY" />
                  <Input label="CVV" required type="password" name="card.cvv" inputMode="numeric" autoComplete="cc-csc" value={formData.card.cvv} onChange={handleInputChange} placeholder="•••" />
                </div>
              </div>
            )}
          </Card>
        </form>

        {/* Right: order summary */}
        <aside className="buy-box">
          <Card className="stack">
            <h2 className="section-title">Order summary</h2>
            <div className="summary-item">
              <img src={cover} alt="" />
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 650, lineHeight: 1.3 }}>{listing.title}</div>
                <div className="text-xs muted cap" style={{ marginTop: 2 }}>{listing.condition?.replace('_', ' ')} · {listing.sellerName}</div>
              </div>
            </div>
            <dl className="summary-lines">
              <div><dt>Subtotal</dt><dd>{formatLKR(listing.price)}</dd></div>
              <div><dt>Delivery</dt><dd style={{ color: 'var(--success)' }}>Free</dd></div>
              <div className="total"><dt>Total</dt><dd><PriceTag amount={listing.price} size="md" /></dd></div>
            </dl>
            <Button
              type="submit"
              form="checkout-form"
              data-testid="place-order"
              size="lg"
              block
              icon={ShieldCheck}
              loading={submitting}
              disabled={listing.status !== 'LIVE'}
            >
              {submitting ? 'Processing…' : `Place order · ${formatLKR(listing.price)}`}
            </Button>
            <p className="text-xs muted row" style={{ justifyContent: 'center', gap: 4 }}>
              <Lock size={12} aria-hidden="true" /> Secure transaction
            </p>
          </Card>
        </aside>
      </div>
    </div>
  );
};

export default Checkout;
