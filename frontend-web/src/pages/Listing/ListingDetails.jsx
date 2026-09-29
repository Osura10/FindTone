import React, { useState, useEffect } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import { apiCall } from '../../services/api';
import {
  MapPin, CheckCircle, Shield, AlertTriangle, ArrowLeft, Trash2, Heart,
  Phone, MessageCircle, Info
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

  const [listing, setListing] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [userRole, setUserRole] = useState(null);
  const [userId, setUserId] = useState(null);
  const [wishlist, setWishlist] = useState([]);
  
  const [mainImage, setMainImage] = useState('');
  const [showConfirmDelete, setShowConfirmDelete] = useState(false);
  const [isDeleting, setIsDeleting] = useState(false);

  useEffect(() => {
    fetchListing();
    fetchUserAndWishlist();
  }, [id]);

  const fetchUserAndWishlist = async () => {
    try {
      const user = await apiCall('/auth/me');
      if (user) {
        setUserRole(user.role?.toLowerCase());
        setUserId(user.id);
        const wl = await apiCall('/wishlist');
        setWishlist((wl || []).map(w => w.listingId));
      }
    } catch (err) {
      console.log('Not logged in or error fetching user', err);
    }
  };

  const fetchListing = async () => {
    setLoading(true);
    try {
      const data = await apiCall(`/listings/${id}`);
      setListing(data);
      if (data.images && data.images.length > 0) {
        setMainImage(data.images[0].url);
      }
    } catch (err) {
      setError('Failed to load listing details.');
    } finally {
      setLoading(false);
    }
  };

  const toggleWishlist = async () => {
    if (!userId) {
      navigate('/login');
      return;
    }
    try {
      const listingIdInt = parseInt(id);
      if (wishlist.includes(listingIdInt)) {
        await apiCall(`/wishlist/${listingIdInt}`, { method: 'DELETE' });
        setWishlist(wishlist.filter(w => w !== listingIdInt));
      } else {
        await apiCall(`/wishlist/${listingIdInt}`, { method: 'POST' });
        setWishlist([...wishlist, listingIdInt]);
      }
    } catch (err) {
      alert(err.message || 'Failed to update wishlist');
    }
  };

  const handleDelete = async () => {
    setIsDeleting(true);
    try {
      await apiCall(`/listings/${id}`, { method: 'DELETE' });
      alert('Listing deleted successfully');
      navigate('/dashboard/items');
    } catch (err) {
      alert(err.message || 'Failed to delete listing');
      setIsDeleting(false);
      setShowConfirmDelete(false);
    }
  };

  if (loading) {
    return (
      <div style={{ textAlign: 'center', padding: '4rem 0', color: 'var(--text-secondary)' }}>
        <div className="spinner" style={{ margin: '0 auto 1rem auto' }}></div>
        <p>Loading details...</p>
      </div>
    );
  }

  if (error || !listing) {
    return (
      <div style={{ padding: '2rem', textAlign: 'center' }}>
        <h2 style={{ color: '#ff6b6b' }}>{error || 'Listing not found'}</h2>
        <button className="btn btn-outline" onClick={() => navigate(-1)} style={{ marginTop: '1rem' }}>
          Go Back
        </button>
      </div>
    );
  }

  const isOwner = userId === listing.sellerId;
  const isAdmin = userRole === 'admin';
  const canDelete = (isOwner || isAdmin) && listing.status !== 'SOLD';

  const fmt = (n) => Math.round(n).toLocaleString('en-LK');

  const getStatusBadge = (status) => {
    switch (status?.toUpperCase()) {
      case 'LIVE': return { bg: 'rgba(81, 207, 102, 0.2)', color: '#51cf66', label: 'LIVE' };
      case 'PENDING': return { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', label: 'PENDING' };
      case 'FLAGGED': return { bg: 'rgba(255, 146, 43, 0.2)', color: '#ff922b', label: 'Under Review' };
      case 'REJECTED': return { bg: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', label: 'REJECTED' };
      case 'SOLD': return { bg: 'rgba(134, 142, 150, 0.2)', color: '#adb5bd', label: 'SOLD' };
      default: return { bg: 'rgba(255, 255, 255, 0.1)', color: '#fff', label: status || 'UNKNOWN' };
    }
  };

  const getVerdictStyles = (verdict) => {
    switch (verdict?.toUpperCase()) {
      case 'SUSPICIOUSLY_LOW': return { color: '#ff6b6b' };
      case 'GREAT_DEAL': return { color: '#51cf66' };
      case 'FAIR': return { color: '#51cf66' };
      case 'SLIGHTLY_HIGH': return { color: '#ffd43b' };
      case 'OVERPRICED': return { color: '#ff6b6b' };
      default: return { color: '#adb5bd' };
    }
  };

  const statusStyle = getStatusBadge(listing.status);
  const verdictStyle = getVerdictStyles(listing.priceVerdict);

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0', maxWidth: '1000px', margin: '0 auto' }}>
      <button 
        onClick={() => navigate(-1)} 
        style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'none', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer', marginBottom: '1.5rem' }}
      >
        <ArrowLeft size={18} /> Back
      </button>

      <div style={{ display: 'flex', flexWrap: 'wrap', gap: '2rem' }}>
        {/* Left Column: Images */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1rem' }}>
          <div style={{ width: '100%', height: '400px', borderRadius: '12px', overflow: 'hidden', background: '#111', position: 'relative' }}>
            <img src={mainImage || 'https://placehold.co/600x400?text=No+Photo'} alt="Main" style={{ width: '100%', height: '100%', objectFit: 'cover' }} />
            <div style={{
              position: 'absolute', top: '16px', left: '16px',
              background: statusStyle.bg, color: statusStyle.color,
              padding: '6px 14px', borderRadius: '20px', fontSize: '0.85rem', fontWeight: 'bold'
            }}>
              {statusStyle.label}
            </div>
            {userId && !isOwner && listing.status === 'LIVE' && (
              <button
                onClick={toggleWishlist}
                style={{
                  position: 'absolute', top: '16px', right: '16px',
                  background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%',
                  width: '40px', height: '40px', display: 'flex', alignItems: 'center', justifyContent: 'center',
                  color: wishlist.includes(listing.id) ? '#ff006e' : '#fff',
                  cursor: 'pointer', transition: 'transform 0.2s'
                }}
              >
                <Heart size={22} fill={wishlist.includes(listing.id) ? '#ff006e' : 'none'} />
              </button>
            )}
          </div>
          {listing.images && listing.images.length > 1 && (
            <div style={{ display: 'flex', gap: '8px', overflowX: 'auto', paddingBottom: '8px' }}>
              {listing.images.map(img => (
                <img 
                  key={img.id} 
                  src={img.url} 
                  alt="Thumbnail" 
                  onClick={() => setMainImage(img.url)}
                  style={{
                    width: '80px', height: '80px', objectFit: 'cover', borderRadius: '8px', cursor: 'pointer',
                    border: mainImage === img.url ? '2px solid var(--primary)' : '2px solid transparent'
                  }} 
                />
              ))}
            </div>
          )}
        </div>

        {/* Right Column: Details */}
        <div style={{ flex: '1 1 400px', display: 'flex', flexDirection: 'column', gap: '1.5rem' }}>
          <div>
            <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', textTransform: 'uppercase', letterSpacing: '0.5px', marginBottom: '8px' }}>
              {listing.category} • {listing.brand}
            </div>
            <h1 style={{ fontSize: '2rem', margin: '0 0 0.5rem 0', fontWeight: 'bold' }}>{listing.title}</h1>
            <div style={{ display: 'flex', alignItems: 'baseline', gap: '12px' }}>
              <span style={{ fontSize: '2rem', fontWeight: '900', color: 'var(--primary-hover)' }}>LKR {fmt(listing.price)}</span>
              <span style={{ fontSize: '1rem', color: 'var(--text-secondary)' }}>{listing.listingType}</span>
            </div>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', background: 'rgba(255,255,255,0.03)', padding: '1.2rem', borderRadius: '12px' }}>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Condition</div>
              <div style={{ fontWeight: '600' }}>{listing.condition}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Year</div>
              <div style={{ fontWeight: '600' }}>{listing.year || 'N/A'}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Brand</div>
              <div style={{ fontWeight: '600' }}>{listing.brand}</div>
            </div>
            <div>
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Model</div>
              <div style={{ fontWeight: '600' }}>{listing.model}</div>
            </div>
          </div>

          {/* AI Info */}
          <div style={{ display: 'flex', flexDirection: 'column', gap: '1rem' }}>
            {listing.fairPrice && (
              <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
                  <Info size={18} style={{ color: 'var(--primary-hover)' }} />
                  <span style={{ fontWeight: 'bold' }}>Fair Price Analysis</span>
                  <span style={{ marginLeft: 'auto', color: verdictStyle.color, fontWeight: 'bold', fontSize: '0.9rem' }}>
                    {listing.priceVerdict?.replace('_', ' ')}
                  </span>
                </div>
                <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px' }}>
                  <div>
                    <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem' }}>Fair Range</div>
                    <div style={{ fontWeight: 'bold' }}>LKR {fmt(listing.fairPriceMin)} - {fmt(listing.fairPriceMax)}</div>
                  </div>
                </div>
                {listing.priceExplanation && (
                  <p style={{ margin: 0, fontSize: '0.9rem', color: 'var(--text-secondary)', lineHeight: 1.5 }}>
                    {listing.priceExplanation}
                  </p>
                )}
              </div>
            )}
            
            {listing.trustScore != null && (
              <div className="glass-panel" style={{ padding: '1rem 1.2rem', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', display: 'flex', alignItems: 'center', gap: '12px' }}>
                <Shield size={24} style={{ color: listing.trustScore >= 70 ? '#10b981' : listing.trustScore >= 40 ? '#f59e0b' : '#ef4444' }} />
                <div>
                  <div style={{ fontWeight: 'bold' }}>Trust Score: {listing.trustScore}/100</div>
                  <div style={{ fontSize: '0.85rem', color: 'var(--text-secondary)' }}>Based on listing details and seller history</div>
                </div>
              </div>
            )}
          </div>

          {/* Description */}
          <div>
            <h3 style={{ margin: '0 0 0.8rem 0' }}>Description</h3>
            <p style={{ whiteSpace: 'pre-wrap', color: '#eaeaea', lineHeight: 1.6, margin: 0 }}>
              {listing.description}
            </p>
          </div>

          {/* Location & Map */}
          {listing.location && (
            <div>
              <h3 style={{ margin: '0 0 0.8rem 0' }}>Location</h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '6px', color: 'var(--text-secondary)', marginBottom: '1rem' }}>
                <MapPin size={16} /> {listing.location}
              </div>
              {listing.latitude != null && listing.longitude != null && (
                <div style={{ height: '200px', width: '100%', borderRadius: '12px', overflow: 'hidden', border: '1px solid rgba(255,255,255,0.1)' }}>
                  <MapContainer center={[listing.latitude, listing.longitude]} zoom={14} style={{ height: '100%', width: '100%', zIndex: 1 }}>
                    <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" attribution='&copy; OpenStreetMap' />
                    <Marker position={[listing.latitude, listing.longitude]} />
                  </MapContainer>
                </div>
              )}
            </div>
          )}

          {/* Seller Info */}
          <div className="glass-panel" style={{ padding: '1.2rem', borderRadius: '12px', marginTop: '1rem' }}>
            <h4 style={{ margin: '0 0 1rem 0' }}>Seller Information</h4>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
              <div>
                <div style={{ fontWeight: 'bold', fontSize: '1.1rem' }}>{listing.sellerName}</div>
                <div style={{ color: 'var(--text-secondary)', fontSize: '0.85rem', textTransform: 'capitalize' }}>
                  {listing.sellerRole} • Member since {new Date(listing.sellerMemberSince).getFullYear()}
                </div>
              </div>
            </div>
            
            {listing.sellerPhone && (
              <div style={{ display: 'flex', gap: '1rem', marginTop: '1.2rem' }}>
                <a href={`tel:${listing.sellerPhone}`} className="btn" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: 'rgba(255,255,255,0.1)', color: '#fff', textDecoration: 'none' }}>
                  <Phone size={18} /> Call
                </a>
                <a href={`https://wa.me/${listing.sellerPhone.replace(/[^0-9]/g, '')}`} target="_blank" rel="noreferrer" className="btn btn-primary" style={{ flex: 1, display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '8px', background: '#25D366', color: '#fff', textDecoration: 'none' }}>
                  <MessageCircle size={18} /> WhatsApp
                </a>
              </div>
            )}
            {!listing.sellerPhone && userId && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Phone number not available.
              </div>
            )}
            {!userId && (
              <div style={{ color: 'var(--text-secondary)', fontSize: '0.9rem', marginTop: '1rem' }}>
                Log in to see seller contact info.
              </div>
            )}
          </div>

          {/* Actions */}
          <div style={{ display: 'flex', gap: '1rem', marginTop: '1rem' }}>
            {!isOwner && listing.status !== 'SOLD' && (
              <button className="btn btn-primary" style={{ flex: 1, opacity: 0.6, cursor: 'not-allowed' }} disabled>
                Buy now (Coming soon)
              </button>
            )}
            
            {canDelete && (
              <button 
                className="btn btn-outline" 
                style={{ flex: 1, color: '#ff6b6b', borderColor: '#ff6b6b' }}
                onClick={() => setShowConfirmDelete(true)}
              >
                <Trash2 size={18} style={{ marginRight: '8px' }} /> Delete Listing
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Confirm Delete Modal */}
      {showConfirmDelete && (
        <div style={{
          position: 'fixed', top: 0, left: 0, right: 0, bottom: 0,
          background: 'rgba(8, 6, 15, 0.8)', backdropFilter: 'blur(8px)',
          display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 999999, padding: '1rem'
        }}>
          <div className="glass-panel" style={{
            width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '24px',
            background: 'linear-gradient(145deg, rgba(30, 24, 45, 0.98), rgba(18, 14, 28, 0.99))',
            textAlign: 'center'
          }}>
            <AlertTriangle size={48} style={{ color: '#ff6b6b', margin: '0 auto 1rem auto' }} />
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Delete Listing?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>
              This cannot be undone. Are you sure you want to permanently delete this listing?
            </p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button className="btn btn-outline" onClick={() => setShowConfirmDelete(false)} style={{ flex: 1 }} disabled={isDeleting}>Cancel</button>
              <button className="btn btn-primary" style={{ flex: 1, background: '#ff6b6b' }} onClick={handleDelete} disabled={isDeleting}>
                {isDeleting ? 'Deleting...' : 'Yes, Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default ListingDetails;
