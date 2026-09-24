import React, { useEffect, useState } from 'react';
import { createPortal } from 'react-dom';
import { 
  ShieldAlert, Image as ImageIcon, CheckCircle, XCircle, RefreshCw, 
  AlertTriangle, Check, Loader2, DollarSign, User as UserIcon, Tag
} from 'lucide-react';
import { apiCall } from '../../services/api';

const AdminFlaggedListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Modals
  const [photosModal, setPhotosModal] = useState({ isOpen: false, images: [], title: '' });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, listingId: null, note: '', title: '' });
  
  const [feedback, setFeedback] = useState({ type: '', text: '' });

  const showToast = (type, text) => {
    setFeedback({ type, text });
    setTimeout(() => setFeedback({ type: '', text: '' }), 4000);
  };

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/admin/listings/flagged');
      setListings(Array.isArray(data) ? data : []);
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to load flagged listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchListings();
  }, []);

  const handleApprove = async (id) => {
    try {
      setActionLoadingId(id);
      await apiCall(`/admin/listings/${id}/review`, {
        method: 'PUT',
        body: JSON.stringify({ approve: true, note: '' })
      });
      showToast('success', 'Listing approved successfully.');
      fetchListings();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to approve listing.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleReject = async () => {
    if (!rejectModal.listingId) return;
    try {
      setActionLoadingId(rejectModal.listingId);
      await apiCall(`/admin/listings/${rejectModal.listingId}/review`, {
        method: 'PUT',
        body: JSON.stringify({ approve: false, note: rejectModal.note })
      });
      showToast('success', 'Listing rejected successfully.');
      setRejectModal({ isOpen: false, listingId: null, note: '', title: '' });
      fetchListings();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to reject listing.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const handleRecheck = async (id) => {
    try {
      setActionLoadingId(`recheck-${id}`);
      await apiCall(`/admin/listings/${id}/recheck`, {
        method: 'POST'
      });
      showToast('success', 'Listing re-checked successfully.');
      fetchListings();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to recheck listing.');
    } finally {
      setActionLoadingId(null);
    }
  };

  const getStatusBadge = (status) => {
    const s = (status || '').toUpperCase();
    if (s === 'FLAGGED') return { bg: 'rgba(239, 68, 68, 0.15)', color: '#ef4444', border: '1px solid rgba(239, 68, 68, 0.3)', label: 'FLAGGED' };
    if (s === 'PENDING') return { bg: 'rgba(245, 158, 11, 0.15)', color: '#f59e0b', border: '1px solid rgba(245, 158, 11, 0.3)', label: 'PENDING' };
    return { bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', border: '1px solid rgba(255, 255, 255, 0.2)', label: s };
  };

  const getVerdictBadge = (verdict) => {
    switch (verdict?.toUpperCase()) {
      case 'SUSPICIOUSLY_LOW': return { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Suspicious' };
      case 'GREAT_DEAL':       return { bg: 'rgba(81,207,102,0.2)',  color: '#51cf66', border: 'rgba(81,207,102,0.4)',  label: 'Great Deal' };
      case 'FAIR':             return { bg: 'rgba(81,207,102,0.2)',  color: '#51cf66', border: 'rgba(81,207,102,0.4)',  label: 'Fair' };
      case 'SLIGHTLY_HIGH':    return { bg: 'rgba(255,212,59,0.2)',  color: '#ffd43b', border: 'rgba(255,212,59,0.4)',  label: 'Slightly High' };
      case 'OVERPRICED':       return { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Overpriced' };
      default:                 return { bg: 'rgba(134,142,150,0.2)', color: '#adb5bd', border: 'rgba(134,142,150,0.4)', label: verdict || 'UNKNOWN' };
    }
  };

  const getTrustColor = (score) => {
    if (score < 40) return '#ef4444'; // red
    if (score < 70) return '#f59e0b'; // amber
    return '#10b981'; // green
  };

  const fmtLkr = (n) => n != null ? `LKR ${Math.round(n).toLocaleString()}` : null;

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1100px', margin: '0 auto' }}>
      
      {/* Toast Notification */}
      {feedback.text && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 99999,
          background: feedback.type === 'error'
            ? 'linear-gradient(135deg, rgba(220, 38, 38, 0.9), rgba(185, 28, 28, 0.95))'
            : 'linear-gradient(135deg, rgba(16, 185, 129, 0.9), rgba(5, 150, 105, 0.95))',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: '500',
          border: '1px solid rgba(255,255,255,0.2)'
        }}>
          {feedback.type === 'error' ? <AlertTriangle size={20} /> : <Check size={20} />}
          <span>{feedback.text}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'rgba(239, 68, 68, 0.15)', borderRadius: '10px', color: '#ef4444' }}>
              <ShieldAlert size={24} />
            </div>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Flagged Listings</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '0.95rem' }}>
            Review listings flagged by the Trust & Fraud AI for suspicious activity.
          </p>
        </div>

        <button 
          onClick={fetchListings} 
          className="btn btn-outline" 
          style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', borderRadius: '12px', fontSize: '0.85rem' }}
        >
          <RefreshCw size={16} className={loading ? 'animate-spin' : ''} /> Refresh List
        </button>
      </div>

      {/* Content Grid */}
      {loading ? (
        <div style={{ padding: '5rem 2rem', textAlign: 'center' }}>
          <Loader2 size={36} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
          <p style={{ color: 'var(--text-secondary)' }}>Loading flagged listings...</p>
        </div>
      ) : listings.length === 0 ? (
        <div className="glass-panel" style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: '20px' }}>
          <ShieldAlert size={48} style={{ color: 'var(--text-secondary)', margin: '0 auto 1rem', opacity: 0.5 }} />
          <h3 style={{ margin: 0, fontSize: '1.25rem', color: 'var(--text-secondary)' }}>No listings need review</h3>
          <p style={{ color: 'rgba(255, 255, 255, 0.4)', marginTop: '0.5rem', fontSize: '0.9rem' }}>
            All flagged listings have been processed.
          </p>
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '1.5rem' }}>
          {listings.map((item) => {
            const statusBadge = getStatusBadge(item.status || (item.trustScore < 70 ? 'FLAGGED' : 'PENDING'));
            const verdictBadge = getVerdictBadge(item.priceVerdict);
            const trustColor = getTrustColor(item.trustScore);
            const imageUrl = item.firstImageUrl || 'https://placehold.co/300x200?text=No+Photo';

            return (
              <div 
                key={item.id}
                className="glass-panel"
                style={{
                  padding: '1.5rem',
                  borderRadius: '20px',
                  border: '1px solid rgba(255, 255, 255, 0.1)',
                  display: 'flex',
                  gap: '1.5rem',
                  flexDirection: 'row',
                  alignItems: 'stretch'
                }}
              >
                {/* Left: Image & Photos Button */}
                <div style={{ width: '200px', display: 'flex', flexDirection: 'column', gap: '0.75rem', flexShrink: 0 }}>
                  <div style={{ 
                    width: '100%', 
                    height: '150px', 
                    borderRadius: '12px', 
                    overflow: 'hidden', 
                    background: '#111'
                  }}>
                    <img src={imageUrl} alt={item.title} style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
                  </div>
                  <button 
                    className="btn btn-outline"
                    onClick={() => setPhotosModal({ isOpen: true, images: item.imageUrls || [], title: item.title })}
                    style={{ fontSize: '0.8rem', padding: '0.4rem' }}
                  >
                    <ImageIcon size={14} style={{ marginRight: '0.4rem' }} /> View all photos
                  </button>
                </div>

                {/* Middle: Details */}
                <div style={{ flex: 1, display: 'flex', flexDirection: 'column', justifyContent: 'space-between' }}>
                  <div>
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start' }}>
                      <div>
                        <div style={{ display: 'flex', gap: '0.5rem', alignItems: 'center', marginBottom: '0.25rem' }}>
                          <span style={{ 
                            background: statusBadge.bg, 
                            color: statusBadge.color, 
                            border: statusBadge.border, 
                            padding: '0.2rem 0.5rem', 
                            borderRadius: '12px', 
                            fontSize: '0.7rem', 
                            fontWeight: '700' 
                          }}>
                            {statusBadge.label}
                          </span>
                          {item.priceVerdict && (
                            <span style={{ 
                              background: verdictBadge.bg, 
                              color: verdictBadge.color, 
                              border: verdictBadge.border, 
                              padding: '0.2rem 0.5rem', 
                              borderRadius: '12px', 
                              fontSize: '0.7rem', 
                              fontWeight: '700' 
                            }}>
                              {verdictBadge.label}
                            </span>
                          )}
                        </div>
                        <h3 style={{ margin: 0, fontSize: '1.2rem', fontWeight: '700' }}>{item.title}</h3>
                        <p style={{ margin: '0.25rem 0', color: 'var(--text-secondary)', fontSize: '0.9rem' }}>
                          {item.category} • {item.brand} {item.model}
                        </p>
                      </div>
                      <div style={{ textAlign: 'right' }}>
                        <div style={{ fontSize: '1.25rem', fontWeight: '800', color: 'var(--primary-hover)' }}>
                          {fmtLkr(item.price)}
                        </div>
                        {item.fairPriceMin && item.fairPriceMax && (
                          <div style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                            Fair: {fmtLkr(item.fairPriceMin)} - {fmtLkr(item.fairPriceMax)}
                          </div>
                        )}
                      </div>
                    </div>
                    
                    <div style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.75rem', fontSize: '0.85rem', color: 'rgba(255,255,255,0.7)' }}>
                      <UserIcon size={14} /> Seller: <span style={{ color: '#fff', fontWeight: '500' }}>{item.sellerName}</span> (ID: {item.sellerId})
                    </div>

                    <div style={{ marginTop: '1rem' }}>
                      <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8rem', marginBottom: '0.25rem' }}>
                        <span>Trust Score</span>
                        <span style={{ fontWeight: '700', color: trustColor }}>{item.trustScore}/100</span>
                      </div>
                      <div style={{ width: '100%', height: '6px', background: 'rgba(255,255,255,0.1)', borderRadius: '3px', overflow: 'hidden' }}>
                        <div style={{ width: `${Math.min(100, Math.max(0, item.trustScore || 0))}%`, height: '100%', background: trustColor }} />
                      </div>
                    </div>

                    {item.aiReason && (
                      <div style={{ 
                        marginTop: '1rem', 
                        padding: '0.75rem', 
                        background: 'rgba(0,0,0,0.2)', 
                        borderLeft: `3px solid ${trustColor}`,
                        borderRadius: '0 8px 8px 0',
                        fontSize: '0.85rem',
                        color: 'rgba(255,255,255,0.85)',
                        whiteSpace: 'pre-wrap'
                      }}>
                        <strong>AI Analysis:</strong><br/>
                        {item.aiReason}
                      </div>
                    )}
                  </div>
                </div>

                {/* Right: Actions */}
                <div style={{ 
                  display: 'flex', 
                  flexDirection: 'column', 
                  gap: '0.75rem', 
                  justifyContent: 'center',
                  width: '140px',
                  borderLeft: '1px solid rgba(255,255,255,0.1)',
                  paddingLeft: '1.5rem'
                }}>
                  <button
                    className="btn"
                    onClick={() => handleApprove(item.id)}
                    disabled={actionLoadingId !== null}
                    style={{ background: '#10b981', color: '#fff', fontSize: '0.85rem', padding: '0.6rem' }}
                  >
                    {actionLoadingId === item.id ? <Loader2 size={16} className="animate-spin mx-auto" /> : <><CheckCircle size={16} /> Approve</>}
                  </button>
                  <button
                    className="btn"
                    onClick={() => setRejectModal({ isOpen: true, listingId: item.id, note: '', title: item.title })}
                    disabled={actionLoadingId !== null}
                    style={{ background: '#ef4444', color: '#fff', fontSize: '0.85rem', padding: '0.6rem' }}
                  >
                    <XCircle size={16} /> Reject
                  </button>
                  <button
                    className="btn btn-outline"
                    onClick={() => handleRecheck(item.id)}
                    disabled={actionLoadingId !== null}
                    style={{ fontSize: '0.85rem', padding: '0.6rem', marginTop: '0.5rem' }}
                  >
                    {actionLoadingId === `recheck-${item.id}` ? <Loader2 size={16} className="animate-spin mx-auto" /> : <><RefreshCw size={14} /> Re-check</>}
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* Reject Modal */}
      {rejectModal.isOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(8, 6, 15, 0.75)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '1.5rem'
        }} onClick={() => !actionLoadingId && setRejectModal({ isOpen: false, listingId: null, note: '', title: '' })}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '24px',
            border: '1px solid rgba(239, 68, 68, 0.4)',
            background: 'linear-gradient(145deg, rgba(30, 24, 45, 0.98), rgba(18, 14, 28, 0.99))',
          }} onClick={e => e.stopPropagation()}>
            <h3 style={{ marginTop: 0, color: '#ef4444', display: 'flex', alignItems: 'center', gap: '0.5rem' }}>
              <XCircle size={20} /> Reject Listing
            </h3>
            <p style={{ fontSize: '0.9rem', color: 'var(--text-secondary)' }}>
              Rejecting "{rejectModal.title}". Please provide a short reason for the seller.
            </p>
            <textarea
              value={rejectModal.note}
              onChange={e => setRejectModal({ ...rejectModal, note: e.target.value })}
              placeholder="e.g. Scammer, duplicate listing, fake item..."
              style={{
                width: '100%', padding: '0.75rem', borderRadius: '8px', 
                background: 'rgba(0,0,0,0.2)', border: '1px solid rgba(255,255,255,0.1)',
                color: '#fff', outline: 'none', minHeight: '80px', marginBottom: '1.5rem'
              }}
            />
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setRejectModal({ isOpen: false, listingId: null, note: '', title: '' })} style={{ flex: 1 }}>Cancel</button>
              <button className="btn" onClick={handleReject} disabled={actionLoadingId !== null} style={{ flex: 1, background: '#ef4444', color: '#fff' }}>
                {actionLoadingId === rejectModal.listingId ? <Loader2 size={16} className="animate-spin mx-auto" /> : 'Confirm Reject'}
              </button>
            </div>
          </div>
        </div>,
        document.body
      )}

      {/* Photos Modal */}
      {photosModal.isOpen && createPortal(
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(8, 6, 15, 0.9)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '2rem'
        }} onClick={() => setPhotosModal({ isOpen: false, images: [], title: '' })}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '800px', maxHeight: '90vh', display: 'flex', flexDirection: 'column',
            borderRadius: '24px', overflow: 'hidden'
          }} onClick={e => e.stopPropagation()}>
            <div style={{ padding: '1.5rem', borderBottom: '1px solid rgba(255,255,255,0.1)', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
              <h3 style={{ margin: 0 }}>Photos: {photosModal.title}</h3>
              <button onClick={() => setPhotosModal({ isOpen: false, images: [], title: '' })} style={{ background: 'none', border: 'none', color: '#fff', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
            </div>
            <div style={{ padding: '1.5rem', overflowY: 'auto', display: 'flex', flexWrap: 'wrap', gap: '1rem', justifyContent: 'center' }}>
              {photosModal.images.length === 0 ? (
                <p style={{ color: 'var(--text-secondary)' }}>No photos available.</p>
              ) : (
                photosModal.images.map((url, i) => (
                  <img key={i} src={url} alt={`Listing ${i}`} style={{ maxWidth: '100%', maxHeight: '400px', borderRadius: '8px', objectFit: 'contain' }} />
                ))
              )}
            </div>
          </div>
        </div>,
        document.body
      )}
    </div>
  );
};

export default AdminFlaggedListings;
