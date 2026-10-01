import React, { useCallback, useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import {
  Avatar, Badge, Button, Card, ErrorState, Input, Modal, PriceTag, Skeleton, StatusBadge, VerdictBadge, formatLKR
} from '../../components/ui';
import {
  MapPin, Shield, AlertTriangle, ArrowLeft, Trash2, Heart,
  Phone, MessageCircle, Info, Edit2, ShoppingCart, Sparkles
} from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';

import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
  iconUrl: icon,
  shadowUrl: iconShadow,
  iconSize: [25, 41],
  iconAnchor: [12, 41]
});
L.Marker.prototype.options.icon = DefaultIcon;

const ListingDetails = () => {
  const { id } = useParams();
  const navigate = useNavigate();

  const { currentUser } = useDashboard();
  const userId = currentUser?.id ?? null;
  const isAdmin = isAdminUser(currentUser);

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [inWishlist, setInWishlist] = useState(false);
  const [wishlistBusy, setWishlistBusy] = useState(false);

  const [mainImage, setMainImage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);
  const [deleteReason, setDeleteReason] = useState('');
  const [deleteError, setDeleteError] = useState('');

  const fetchListing = useCallback(async () => {
    try {
      const data = await apiCall(`/listings/${id}`);
      setListing(data);
      setMainImage(data.images?.[0]?.url || '');
      setError('');
    } catch (err) {
      setError(err.status === 404 ? 'This listing is not available.' : (err.message || 'Failed to load listing details.'));
    } finally {
      setLoading(false);
    }
  }, [id]);

  const fetchWishlist = useCallback(async () => {
    try {
      const wl = await apiCall('/wishlist');
      setInWishlist((wl || []).some((w) => w.listingId === Number(id)));
    } catch (err) {
      toast.error(`Could not load your wishlist: ${err.message}`);
    }
  }, [id]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchListing();
  }, [fetchListing]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentUser && !isAdmin) fetchWishlist();
  }, [currentUser, isAdmin, fetchWishlist]);

  const toggleWishlist = async () => {
    setWishlistBusy(true);
    try {
      await apiCall(`/wishlist/${id}`, { method: inWishlist ? 'DELETE' : 'POST' });
      toast.success(inWishlist ? 'Removed from wishlist' : 'Added to wishlist – you will be told about price drops');
      setInWishlist(!inWishlist);
    } catch (err) {
      toast.error(err.message || 'Failed to update wishlist');
    } finally {
      setWishlistBusy(false);
    }
  };

  const retry = () => {
    setLoading(true);
    fetchListing();
  };

  if (loading) {
    return (
      <div className="page" aria-busy="true" aria-label="Loading listing">
        <Skeleton width="80px" height="20px" />
        <div className="details-layout">
          <div className="stack"><Skeleton height="auto" style={{ aspectRatio: '4 / 3' }} radius="var(--radius-lg)" /><Skeleton height="120px" /></div>
          <div className="stack"><Skeleton height="28px" width="80%" /><Skeleton height="40px" width="45%" /><Skeleton height="220px" radius="var(--radius-lg)" /></div>
        </div>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div className="page page-narrow">
        <Card>
          <ErrorState message={error || 'Listing not found'} onRetry={retry} />
        </Card>
        <div><Button variant="secondary" icon={ArrowLeft} onClick={() => navigate(-1)}>Go back</Button></div>
      </div>
    );
  }

  const isOwner = userId != null && userId === listing.sellerId;
  const canDelete = isOwner || isAdmin;
  // Trust score and fair-price verdict: only the owner and admins (the API hides them for others).
  const showAi = isOwner || isAdmin;
  const adminDeletingOthers = isAdmin && !isOwner;

  const handleDelete = async () => {
    if (adminDeletingOthers && !deleteReason.trim()) {
      setDeleteError('Please give a reason. The seller will see it.');
      return;
    }
    setIsDeleting(true);
    setDeleteError('');
    try {
      const query = adminDeletingOthers ? `?reason=${encodeURIComponent(deleteReason.trim())}` : '';
      await apiCall(`/listings/${id}${query}`, { method: 'DELETE' });
      toast.success('Listing deleted');
      navigate(isAdmin ? '/dashboard/items' : '/dashboard/items?tab=mine', { replace: true });
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete listing');
      setIsDeleting(false);
    }
  };

  const sold = listing.status === 'SOLD';
  const images = listing.images || [];
  const specs = [
    ['Condition', listing.condition?.replace('_', ' ')],
    ['Brand', listing.brand],
    ['Model', listing.model],
    ['Year', listing.year || 'N/A'],
    ['Category', listing.category],
    ['Listing type', listing.listingType]
  ].filter(([, v]) => v);
  const trustTone = listing.trustScore >= 70 ? 'success' : listing.trustScore >= 40 ? 'warning' : 'danger';

  return (
    <div className="page">
      <div>
        <Button variant="ghost" size="sm" icon={ArrowLeft} onClick={() => navigate(-1)}>Back</Button>
      </div>

      <div className="details-layout">
        {/* Gallery (top left) */}
          <section className="stack-sm d-gallery" aria-label="Photos">
            <div className="gallery-main">
              <img src={mainImage || 'https://placehold.co/600x400?text=No+Photo'} alt={listing.title} />
              {sold && <span className="sold-ribbon" style={{ fontSize: 13, top: 26, right: -46, padding: '6px 56px' }}>SOLD OUT</span>}
              {images.length > 1 && (
                <span className="badge media-badge" style={{ position: 'absolute', bottom: 12, right: 12 }}>
                  {Math.max(1, images.findIndex((img) => img.url === mainImage) + 1)} / {images.length}
                </span>
              )}
            </div>
            {images.length > 1 && (
              <div className="thumbs" role="list">
                {images.map((img, i) => (
                  <button
                    key={img.id}
                    type="button"
                    role="listitem"
                    className={`thumb ${mainImage === img.url ? 'active' : ''}`}
                    onClick={() => setMainImage(img.url)}
                    aria-label={`Show photo ${i + 1}`}
                    aria-current={mainImage === img.url ? 'true' : undefined}
                  >
                    <img src={img.url} alt="" />
                  </button>
                ))}
              </div>
            )}
          </section>

        {/* Specs, description, location (bottom left; after the buy box on phones) */}
        <div className="stack d-info" style={{ gap: 'var(--space-6)' }}>
          <Card className="stack">
            <h2 className="section-title">Details</h2>
            <dl className="spec-grid">
              {specs.map(([label, value]) => (
                <div key={label} className="spec"><dt>{label}</dt><dd>{value}</dd></div>
              ))}
            </dl>
            <h2 className="section-title" style={{ marginTop: 'var(--space-2)' }}>Description</h2>
            <p style={{ whiteSpace: 'pre-wrap', color: 'var(--text-2)', lineHeight: 1.7 }}>{listing.description}</p>
          </Card>

          {listing.location && (
            <Card className="stack">
              <div className="row-between">
                <h2 className="section-title">Location</h2>
                <span className="text-sm muted row" style={{ gap: 6 }}><MapPin size={15} aria-hidden="true" /> {listing.location}</span>
              </div>
              {listing.latitude != null && listing.longitude != null && (
                <div className="map-box">
                  <MapContainer center={[listing.latitude, listing.longitude]} zoom={14} style={{ height: '100%', width: '100%' }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <Marker position={[listing.latitude, listing.longitude]} />
                  </MapContainer>
                </div>
              )}
            </Card>
          )}
        </div>

        {/* Right column: sticky buy box, seller card, AI info */}
        <aside className="buy-box stack d-aside">
          <Card className="stack">
            <div className="row-between" style={{ alignItems: 'flex-start' }}>
              <span className="text-xs muted" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                {[listing.category, listing.brand].filter(Boolean).join(' · ')}
              </span>
              <StatusBadge status={listing.status} />
            </div>
            <h1 style={{ fontSize: 'var(--text-2xl)', lineHeight: 1.25, letterSpacing: '-0.01em' }}>{listing.title}</h1>
            <div className="row" style={{ alignItems: 'baseline' }}>
              <PriceTag amount={listing.price} size="lg" />
              {listing.listingType && <span className="text-sm muted">{listing.listingType}</span>}
            </div>
            {listing.condition && (
              <div className="row" style={{ gap: 6 }}>
                <Badge variant="neutral" className="cap">{listing.condition.replace('_', ' ')}</Badge>
                {listing.year && <Badge variant="neutral">{listing.year}</Badge>}
              </div>
            )}

            <div className="stack-sm">
              {isOwner ? (
                <>
                  <div className="alert alert-info"><Info size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /><span>This is your listing.</span></div>
                  {listing.status !== 'SOLD' && (
                    <Button variant="secondary" size="lg" block icon={Edit2} onClick={() => navigate(`/dashboard/edit/${listing.id}`)}>Edit listing</Button>
                  )}
                </>
              ) : listing.status === 'LIVE' && !isAdmin && userId ? (
                <Button size="lg" block icon={ShoppingCart} data-testid="buy-now" onClick={() => navigate(`/dashboard/checkout/${listing.id}`)}>
                  Buy now
                </Button>
              ) : sold ? (
                <div className="alert alert-warning"><AlertTriangle size={18} aria-hidden="true" style={{ flexShrink: 0, marginTop: 1 }} /><span>This instrument has been sold.</span></div>
              ) : null}

              {userId && !isOwner && !isAdmin && listing.status === 'LIVE' && (
                <Button
                  variant="secondary"
                  size="lg"
                  block
                  data-testid="wishlist-toggle"
                  aria-label={inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                  disabled={wishlistBusy}
                  onClick={toggleWishlist}
                >
                  <Heart size={18} aria-hidden="true" fill={inWishlist ? 'currentColor' : 'none'} style={{ color: inWishlist ? '#e11d48' : undefined }} />
                  {inWishlist ? 'Remove from wishlist' : 'Add to wishlist'}
                </Button>
              )}

              {canDelete && (
                <Button variant="danger-outline" block icon={Trash2} data-testid="delete-listing" onClick={() => { setDeleteError(''); setShowConfirmDelete(true); }}>
                  Delete listing
                </Button>
              )}
            </div>
          </Card>

          {/* Seller card */}
          <Card className="stack">
            <h2 className="section-title" style={{ fontSize: 'var(--text-base)' }}>Seller</h2>
            <div className="row" style={{ flexWrap: 'nowrap' }}>
              <Avatar name={listing.sellerName || ''} size={48} />
              <div style={{ minWidth: 0 }}>
                <div className="truncate" style={{ fontWeight: 700 }}>{listing.sellerName}</div>
                <div className="text-sm muted">
                  {listing.sellerRole === 'shop' ? 'Shop' : 'Private seller'}{listing.sellerMemberSince ? ` · member since ${new Date(listing.sellerMemberSince).getFullYear()}` : ''}
                </div>
              </div>
            </div>
            {listing.sellerPhone && !isAdmin && (
              <>
                <div className="row text-sm" style={{ gap: 8 }}><Phone size={15} aria-hidden="true" className="muted" /> <strong>{listing.sellerPhone}</strong></div>
                <div className="row" style={{ gap: 8 }}>
                  <a href={`tel:${listing.sellerPhone}`} className="btn btn-secondary grow"><Phone size={16} aria-hidden="true" /> Call</a>
                  <a href={`https://wa.me/${listing.sellerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="btn grow btn-whatsapp">
                    <MessageCircle size={16} aria-hidden="true" /> WhatsApp
                  </a>
                </div>
              </>
            )}
            {!listing.sellerPhone && userId && !isAdmin && <p className="text-sm muted">Phone number not available.</p>}
            {!userId && !isAdmin && <p className="text-sm muted">Log in to see seller contact info.</p>}
          </Card>

          {/* AI info: owner and admin only */}
          {showAi && (
            <Card className="stack" data-testid="ai-info">
              <div className="row-between">
                <h2 className="section-title row" style={{ fontSize: 'var(--text-base)', gap: 8 }}><Sparkles size={16} aria-hidden="true" color="var(--primary-text)" /> AI check</h2>
                <span className="text-xs muted">Only you{isAdmin ? ' (admin)' : ''} can see this</span>
              </div>
              {listing.trustScore != null && (
                <div className="stack-sm" style={{ gap: 6 }}>
                  <div className="row-between text-sm">
                    <span className="row" style={{ gap: 6 }}><Shield size={16} aria-hidden="true" color={`var(--${trustTone})`} /> Trust score</span>
                    <strong>{listing.trustScore}/100</strong>
                  </div>
                  <div className="meter" role="meter" aria-valuemin={0} aria-valuemax={100} aria-valuenow={listing.trustScore} aria-label="Trust score">
                    <span style={{ width: `${listing.trustScore}%`, background: `var(--${trustTone})` }} />
                  </div>
                  {listing.trustWarning && <span className="text-xs" style={{ color: 'var(--warning)' }}>Live with a low-trust warning.</span>}
                </div>
              )}
              {listing.priceVerdict && (
                <div className="stack-sm" style={{ gap: 6 }}>
                  <div className="row-between text-sm">
                    <span>Fair price</span>
                    <VerdictBadge verdict={listing.priceVerdict} />
                  </div>
                  <div className="text-sm">
                    {listing.fairPriceMin != null
                      ? <>Fair range <strong>{formatLKR(listing.fairPriceMin)} – {formatLKR(listing.fairPriceMax)}</strong></>
                      : <span className="muted">No reference price found</span>}
                  </div>
                  {listing.priceExplanation && <p className="text-sm muted" style={{ lineHeight: 1.55 }}>{listing.priceExplanation}</p>}
                </div>
              )}
              {isAdmin && listing.aiReason && (
                <pre className="ai-reason">{listing.aiReason}</pre>
              )}
            </Card>
          )}
        </aside>
      </div>

      {/* Confirm delete */}
      <Modal
        isOpen={showConfirmDelete}
        onClose={() => !isDeleting && setShowConfirmDelete(false)}
        title="Delete listing?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setShowConfirmDelete(false)} disabled={isDeleting}>Cancel</Button>
            <Button variant="danger" data-testid="confirm-delete" onClick={handleDelete} loading={isDeleting}>
              {isDeleting ? 'Deleting…' : 'Yes, delete'}
            </Button>
          </>
        }
      >
        <div className="stack">
          <p>This cannot be undone. “<strong>{listing.title}</strong>” will be permanently removed.</p>
          {adminDeletingOthers && (
            <Input
              label="Reason for deletion"
              required
              hint="Sent to the seller."
              data-testid="delete-reason"
              placeholder="e.g. Photos belong to another seller"
              value={deleteReason}
              onChange={(e) => setDeleteReason(e.target.value)}
            />
          )}
          {deleteError && <ErrorState compact message={deleteError} />}
        </div>
      </Modal>
    </div>
  );
};

export default ListingDetails;
