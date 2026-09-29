import React, { useState, useEffect } from 'react';
import { apiCall } from '../../services/api';
import { Banknote, Loader2, Package, Truck, CheckCircle } from 'lucide-react';
import { Link } from 'react-router-dom';

const Sales = () => {
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    fetchSales();
  }, []);

  const fetchSales = async () => {
    try {
      const data = await apiCall('/orders/sales');
      setOrders(data || []);
    } catch (err) {
      console.error(err);
    } finally {
      setLoading(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        <Loader2 size={32} className="animate-spin" style={{ margin: '0 auto 1rem' }} />
        <p>Loading your sales...</p>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '2rem' }}>
        <div style={{ padding: '0.5rem', background: 'rgba(16, 185, 129, 0.15)', borderRadius: '10px', color: '#10b981' }}>
          <Banknote size={24} />
        </div>
        <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>My Sales</h1>
      </div>

      {orders.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '24px' }}>
          <Package size={64} style={{ opacity: 0.2, margin: '0 auto 1.5rem', color: 'var(--text-secondary)' }} />
          <h2 style={{ marginBottom: '1rem' }}>No sales yet</h2>
          <p style={{ color: 'var(--text-secondary)' }}>When buyers purchase your items, the orders will appear here.</p>
        </div>
      ) : (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          {orders.map(order => (
            <div key={order.id} className="glass-panel" style={{ borderRadius: '16px', overflow: 'hidden', borderLeft: '4px solid #10b981' }}>
              <div style={{ background: 'rgba(255,255,255,0.05)', padding: '1rem 1.5rem', display: 'flex', justifyContent: 'space-between', alignItems: 'center', borderBottom: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', gap: '2rem' }}>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Date Sold</div>
                    <div style={{ fontWeight: 'bold' }}>{new Date(order.createdAt).toLocaleDateString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Amount</div>
                    <div style={{ fontWeight: 'bold', color: '#10b981' }}>LKR {order.amount.toLocaleString()}</div>
                  </div>
                  <div>
                    <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase' }}>Payment</div>
                    <div style={{ fontWeight: 'bold' }}>
                      {order.paymentMethod === 'CARD' ? `Card ending in ${order.cardLast4}` : 'Cash on Delivery'}
                    </div>
                  </div>
                </div>
                <div>
                  <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)', textTransform: 'uppercase', textAlign: 'right' }}>Order #</div>
                  <div style={{ fontWeight: 'bold', fontFamily: 'monospace' }}>{order.id.toString().padStart(6, '0')}</div>
                </div>
              </div>

              <div style={{ padding: '1.5rem', display: 'flex', gap: '2rem' }}>
                <Link to={`/dashboard/listings/${order.listingId}`} style={{ flexShrink: 0 }}>
                  <img src={order.listingImage || 'https://placehold.co/200x200?text=No+Photo'} alt="Item" style={{ width: '100px', height: '100px', borderRadius: '12px', objectFit: 'cover' }} />
                </Link>
                
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column' }}>
                  <Link to={`/dashboard/listings/${order.listingId}`} style={{ textDecoration: 'none', color: 'inherit' }}>
                    <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.2rem' }}>{order.listingTitle}</h3>
                  </Link>
                  <div style={{ display: 'inline-flex', alignItems: 'center', gap: '6px', background: 'rgba(16, 185, 129, 0.1)', color: '#10b981', padding: '4px 10px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold', alignSelf: 'flex-start' }}>
                    <CheckCircle size={14} /> {order.status === 'PAID' ? 'Payment Received' : 'COD Requested'}
                  </div>
                </div>
                
                <div style={{ width: '300px', background: 'rgba(0,0,0,0.2)', padding: '1rem', borderRadius: '12px' }}>
                  <h4 style={{ margin: '0 0 0.5rem 0', fontSize: '0.95rem', display: 'flex', alignItems: 'center', gap: '6px' }}>
                    <Truck size={16} /> Ship to Buyer
                  </h4>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    <div style={{ fontWeight: 'bold', color: '#fff' }}>{order.fullName}</div>
                    <div>{order.addressLine}</div>
                    <div>{order.city} {order.postalCode}</div>
                    <div style={{ marginTop: '0.5rem', display: 'flex', justifyContent: 'space-between' }}>
                      <span>Tel: {order.phone}</span>
                      <a href={`tel:${order.phone}`} style={{ color: 'var(--primary-hover)', textDecoration: 'none' }}>Call Buyer</a>
                    </div>
                  </div>
                  {order.notes && (
                    <div style={{ marginTop: '0.8rem', fontSize: '0.8rem', background: 'rgba(255,255,255,0.05)', padding: '8px', borderRadius: '6px', fontStyle: 'italic' }}>
                      "{order.notes}"
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
};

export default Sales;
