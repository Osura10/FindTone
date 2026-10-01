import { Link } from 'react-router-dom';
import React, { useEffect, useState } from 'react';
import toast from 'react-hot-toast';
import { ShieldAlert, Image as ImageIcon, CheckCircle, XCircle, RefreshCw, User as UserIcon } from 'lucide-react';
import { apiCall } from '../../services/api';
import {
  Badge, Button, Card, EmptyState, ErrorState, Modal, PageHeader, PriceTag, Skeleton, StatusBadge, Textarea, VerdictBadge, formatLKR
} from '../../components/ui';

const AdminFlaggedListings = () => {
  const [listings, setListings] = useState([]);
  const [loading, setLoading] = useState(true);
  const [actionLoadingId, setActionLoadingId] = useState(null);
  
  // Modals
  const [photosModal, setPhotosModal] = useState({ isOpen: false, images: [], title: '' });
  const [rejectModal, setRejectModal] = useState({ isOpen: false, listingId: null, note: '', title: '' });
  
  const [loadError, setLoadError] = useState('');

  // Success / error messages use the app-wide toaster.
  const showToast = (type, text) => (type === 'error' ? toast.error(text) : toast.success(text));

  const fetchListings = async () => {
    try {
      setLoading(true);
      const data = await apiCall('/admin/listings/flagged');
      setListings(Array.isArray(data) ? data : []);
      setLoadError('');
    } catch (err) {
      console.error(err);
      setLoadError(err.message || 'Failed to load flagged listings');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
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

  const recheckAllPending = async () => {
    try {
      setLoading(true);
      const res = await apiCall('/admin/listings/recheck-pending', { method: 'POST' });
      showToast('success', res.message || 'Re-checked pending listings.');
      fetchListings();
    } catch (err) {
      console.error(err);
      showToast('error', err.message || 'Failed to re-check pending listings.');
      setLoading(false);
    }
  };

  const trustTone = (score) => (score == null ? 'text-3' : score < 40 ? 'danger' : score < 70 ? 'warning' : 'success');
  const closeReject = () => setRejectModal({ isOpen: false, listingId: null, note: '', title: '' });
  const busy = actionLoadingId !== null;

  return (
    <div className="page">
      <PageHeader
        icon={ShieldAlert}
        title="Review queue"
        subtitle="Listings held back by the Trust & Fraud AI. Approve to publish, reject with a note for the seller."
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={recheckAllPending} disabled={loading}>Re-check all pending</Button>
            <Button variant="secondary" icon={RefreshCw} onClick={fetchListings} loading={loading}>Refresh</Button>
          </>
        }
      />

      {!loading && listings.length > 0 && (
        <div className="row" style={{ gap: 8 }}>
          <Badge variant="danger" dot>{listings.filter((l) => (l.status || '').toUpperCase() === 'FLAGGED').length} flagged</Badge>
          <Badge variant="warning" dot>{listings.filter((l) => (l.status || '').toUpperCase() === 'PENDING').length} AI check pending / failed</Badge>
        </div>
      )}

      {loadError && <ErrorState compact message={loadError} onRetry={fetchListings} />}

      {loading ? (
        <div className="stack" aria-busy="true" aria-label="Loading review queue">
          {[0, 1, 2].map((i) => <Skeleton key={i} height="220px" radius="var(--radius-lg)" />)}
        </div>
      ) : listings.length === 0 && !loadError ? (
        <Card>
          <EmptyState icon={CheckCircle} title="No listings need review" description="All flagged listings have been processed. Nice work!" />
        </Card>
      ) : (
        <div className="stack">
          {listings.map((item) => {
            const status = (item.status || '').toUpperCase();
            const tone = trustTone(item.trustScore);
            const imageUrl = item.firstImageUrl || 'https://placehold.co/300x200?text=No+Photo';

            return (
              <Card key={item.id} as="article" className="review-item">
                {/* Photo */}
                <div className="review-media">
                  <img src={imageUrl} alt={item.title} />
                  <button type="button" className="badge media-badge review-photos" onClick={() => setPhotosModal({ isOpen: true, images: item.imageUrls || [], title: item.title })}>
                    <ImageIcon size={12} aria-hidden="true" /> {(item.imageUrls || []).length || 1} photo{(item.imageUrls || []).length === 1 ? '' : 's'}
                  </button>
                </div>

                {/* Details */}
                <div className="stack-sm" style={{ minWidth: 0, gap: 10 }}>
                  <div className="row-between" style={{ alignItems: 'flex-start' }}>
                    <div style={{ minWidth: 0 }}>
                      <div className="row" style={{ gap: 6, marginBottom: 4 }}>
                        {status === 'FLAGGED'
                          ? <Badge variant="danger" dot>Flagged</Badge>
                          : status === 'PENDING' ? <Badge variant="warning" dot>AI check pending / failed</Badge> : <StatusBadge status={status} />}
                        {item.priceVerdict && <VerdictBadge verdict={item.priceVerdict} />}
                      </div>
                      <h3 style={{ fontSize: 'var(--text-lg)', lineHeight: 1.3 }}>
                        <Link to={`/dashboard/listings/${item.id}`} style={{ color: 'inherit' }} title="Open details (view / delete)">{item.title}</Link>
                      </h3>
                      <p className="text-sm muted">{[item.category, item.brand, item.model].filter(Boolean).join(' · ')}</p>
                    </div>
                    <div style={{ textAlign: 'right' }}>
                      <PriceTag amount={item.price} size="md" />
                      {item.fairPriceMin && item.fairPriceMax && (
                        <div className="text-xs muted">Fair: {formatLKR(item.fairPriceMin)} – {formatLKR(item.fairPriceMax)}</div>
                      )}
                    </div>
                  </div>

                  <span className="text-sm row" style={{ gap: 6 }}>
                    <UserIcon size={14} aria-hidden="true" className="muted" /> <span className="muted">Seller</span> <strong>{item.sellerName}</strong> <span className="muted">(ID {item.sellerId})</span>
                  </span>

                  <div className="stack-sm" style={{ gap: 4 }}>
                    <div className="row-between text-xs">
                      <span className="muted">Trust score</span>
                      <strong style={{ color: `var(--${tone})` }}>{item.trustScore != null ? `${item.trustScore}/100` : 'Not checked'}</strong>
                    </div>
                    <div className="meter" role="meter" aria-label="Trust score" aria-valuemin={0} aria-valuemax={100} aria-valuenow={item.trustScore ?? 0}>
                      {item.trustScore != null && <span style={{ width: `${Math.min(100, Math.max(0, item.trustScore))}%`, background: `var(--${tone})` }} />}
                    </div>
                  </div>

                  {item.aiReason && (
                    <div className="ai-reason" style={{ borderLeft: `3px solid var(--${tone === 'text-3' ? 'border-strong' : tone})` }}>
                      <strong style={{ color: 'var(--text)' }}>AI analysis</strong>{'\n'}{item.aiReason}
                    </div>
                  )}
                </div>

                {/* Actions */}
                <div className="review-actions">
                  <Button className="btn-success" icon={CheckCircle} loading={actionLoadingId === item.id} disabled={busy} onClick={() => handleApprove(item.id)}>Approve</Button>
                  <Button variant="danger" icon={XCircle} disabled={busy} onClick={() => setRejectModal({ isOpen: true, listingId: item.id, note: '', title: item.title })}>Reject</Button>
                  <Button variant="secondary" icon={RefreshCw} loading={actionLoadingId === `recheck-${item.id}`} disabled={busy} onClick={() => handleRecheck(item.id)}>Re-check</Button>
                </div>
              </Card>
            );
          })}
        </div>
      )}

      {/* Reject modal */}
      <Modal
        isOpen={rejectModal.isOpen}
        onClose={() => !busy && closeReject()}
        title="Reject listing"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={closeReject} disabled={busy}>Cancel</Button>
            <Button variant="danger" onClick={handleReject} loading={actionLoadingId === rejectModal.listingId} disabled={busy}>Confirm reject</Button>
          </>
        }
      >
        <div className="stack">
          <p className="text-sm muted">Rejecting “<strong style={{ color: 'var(--text)' }}>{rejectModal.title}</strong>”. Give a short reason – the seller will see it.</p>
          <Textarea
            label="Reason"
            rows={3}
            value={rejectModal.note}
            onChange={(e) => setRejectModal({ ...rejectModal, note: e.target.value })}
            placeholder="e.g. Scammer, duplicate listing, fake item…"
          />
        </div>
      </Modal>

      {/* Photos modal */}
      <Modal
        isOpen={photosModal.isOpen}
        onClose={() => setPhotosModal({ isOpen: false, images: [], title: '' })}
        title={`Photos: ${photosModal.title}`}
        size="lg"
      >
        {photosModal.images.length === 0 ? (
          <p className="muted">No photos available.</p>
        ) : (
          <div className="photo-review-grid">
            {photosModal.images.map((url, i) => (
              <img key={i} src={url} alt={`Listing photo ${i + 1}`} />
            ))}
          </div>
        )}
      </Modal>
    </div>
  );
};

export default AdminFlaggedListings;
