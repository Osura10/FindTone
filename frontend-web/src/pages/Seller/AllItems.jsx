import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Package, PlusCircle, RefreshCw, ShoppingBag, Store, Heart, Edit2, XCircle, MapPin, Trash2, AlertTriangle, SlidersHorizontal } from 'lucide-react';
import { MapContainer, TileLayer, Marker } from 'react-leaflet';
import L from 'leaflet';
import 'leaflet/dist/leaflet.css';
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import { ErrorState, Skeleton } from '../../components/ui';

L.Marker.prototype.options.icon = L.icon({ iconUrl: icon, shadowUrl: iconShadow, iconSize: [25, 41], iconAnchor: [12, 41] });

const PAGE_SIZE = 12;
const CONDITIONS = ['new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'];
const EMPTY_FILTERS = { q: '', category: '', brand: '', condition: '', minPrice: '', maxPrice: '' };

const STATUS_BADGES = {
  LIVE: { bg: 'rgba(81, 207, 102, 0.2)', color: '#51cf66', border: 'rgba(81, 207, 102, 0.4)', label: 'LIVE' },
  PENDING: { bg: 'rgba(245, 158, 11, 0.2)', color: '#f59e0b', border: 'rgba(245, 158, 11, 0.4)', label: 'PENDING' },
  FLAGGED: { bg: 'rgba(255, 146, 43, 0.2)', color: '#ff922b', border: 'rgba(255, 146, 43, 0.4)', label: 'Under Review' },
  REJECTED: { bg: 'rgba(255, 107, 107, 0.2)', color: '#ff6b6b', border: 'rgba(255, 107, 107, 0.4)', label: 'REJECTED' },
  SOLD: { bg: 'rgba(134, 142, 150, 0.2)', color: '#adb5bd', border: 'rgba(134, 142, 150, 0.4)', label: 'SOLD' }
};

const VERDICT_BADGES = {
  SUSPICIOUSLY_LOW: { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Suspiciously low' },
  GREAT_DEAL: { bg: 'rgba(81,207,102,0.2)', color: '#51cf66', border: 'rgba(81,207,102,0.4)', label: 'Great deal' },
  FAIR: { bg: 'rgba(81,207,102,0.2)', color: '#51cf66', border: 'rgba(81,207,102,0.4)', label: 'Fair price' },
  SLIGHTLY_HIGH: { bg: 'rgba(255,212,59,0.2)', color: '#ffd43b', border: 'rgba(255,212,59,0.4)', label: 'Slightly high' },
  OVERPRICED: { bg: 'rgba(255,107,107,0.2)', color: '#ff6b6b', border: 'rgba(255,107,107,0.4)', label: 'Overpriced' },
  UNKNOWN: { bg: 'rgba(134,142,150,0.2)', color: '#adb5bd', border: 'rgba(134,142,150,0.4)', label: 'No price data' }
};

const trustBadge = (score) => {
  if (score == null) return { bg: 'rgba(134,142,150,0.2)', color: '#adb5bd', border: 'rgba(134,142,150,0.4)', label: 'Not checked' };
  if (score < 40) return { bg: 'rgba(239,68,68,0.2)', color: '#ef4444', border: 'rgba(239,68,68,0.4)', label: `Trust ${score}/100` };
  if (score < 70) return { bg: 'rgba(245,158,11,0.2)', color: '#f59e0b', border: 'rgba(245,158,11,0.4)', label: `Trust ${score}/100 ⚠` };
  return { bg: 'rgba(16,185,129,0.2)', color: '#10b981', border: 'rgba(16,185,129,0.4)', label: `Trust ${score}/100` };
};

const fmtLkr = (n) => (n != null ? `LKR ${Math.round(n).toLocaleString()}` : '');

const Badge = ({ style, children }) => (
  <div style={{ background: style.bg, color: style.color, border: `1px solid ${style.border}`, padding: '0.25rem 0.75rem', borderRadius: '20px', fontSize: '0.75rem', fontWeight: 700 }}>
    {children ?? style.label}
  </div>
);

const AllItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useDashboard();
  const isAdmin = isAdminUser(currentUser);
  const activeTab = !isAdmin && searchParams.get('tab') === 'mine' ? 'mine' : 'marketplace';

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState(EMPTY_FILTERS);
  const [appliedFilters, setAppliedFilters] = useState(EMPTY_FILTERS);
  const [showFilters, setShowFilters] = useState(false);
  const [mineSearch, setMineSearch] = useState('');
  const [wishlist, setWishlist] = useState([]);
  const [priceModal, setPriceModal] = useState(null);   // { listingId, currentPrice, newPrice, saving }
  const [deleteTarget, setDeleteTarget] = useState(null); // listing to delete
  const [deleting, setDeleting] = useState(false);

  // ── Loading ────────────────────────────────────────────────────────────────

  const loadMarketplace = useCallback(async (pageToLoad, f) => {
    const params = new URLSearchParams({ page: String(pageToLoad), pageSize: String(PAGE_SIZE) });
    Object.entries(f).forEach(([k, v]) => { if (String(v).trim() !== '') params.set(k, String(v).trim()); });
    try {
      const data = await apiCall(`/listings?${params.toString()}`);
      setItems((prev) => (pageToLoad === 1 ? data.items : [...prev, ...data.items]));
      setPage(pageToLoad);
      setTotalPages(data.totalPages || 1);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load marketplace listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadMine = useCallback(async () => {
    try {
      const data = await apiCall('/listings/mine');
      setItems(Array.isArray(data) ? data : []);
      setTotalPages(1);
      setError('');
    } catch (err) {
      setError(err.message || 'Unable to load your listings.');
    } finally {
      setLoading(false);
    }
  }, []);

  const loadWishlist = useCallback(async () => {
    try {
      const data = await apiCall('/wishlist');
      setWishlist((data || []).map((w) => w.listingId));
    } catch (err) {
      toast.error(`Could not load your wishlist: ${err.message}`);
    }
  }, []);

  const reload = useCallback(() => {
    setLoading(true);
    if (activeTab === 'mine') loadMine();
    else loadMarketplace(1, appliedFilters);
  }, [activeTab, appliedFilters, loadMine, loadMarketplace]);

  // Reload when the tab or filters change, and when coming back from create/edit (location.key).
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    reload();
  }, [reload, location.key]);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    if (currentUser && !isAdmin) loadWishlist();
  }, [currentUser, isAdmin, loadWishlist]);

  const setTab = (tab) => setSearchParams(tab === 'mine' ? { tab: 'mine' } : {});

  // ── Actions ────────────────────────────────────────────────────────────────

  const applyFilters = (e) => {
    e?.preventDefault();
    if (filters.minPrice && filters.maxPrice && Number(filters.maxPrice) < Number(filters.minPrice)) {
      toast.error('Max price must be greater than min price.');
      return;
    }
    setAppliedFilters({ ...filters });
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
  };

  const toggleWishlist = async (listingId, e) => {
    e.stopPropagation();
    const saved = wishlist.includes(listingId);
    try {
      await apiCall(`/wishlist/${listingId}`, { method: saved ? 'DELETE' : 'POST' });
      setWishlist((prev) => (saved ? prev.filter((w) => w !== listingId) : [...prev, listingId]));
      toast.success(saved ? 'Removed from wishlist' : 'Added to wishlist – you will be told about price drops');
    } catch (err) {
      toast.error(err.message || 'Failed to update wishlist');
    }
  };

  const savePrice = async () => {
    const newPrice = Number(priceModal.newPrice);
    if (!newPrice || newPrice <= 0) {
      setPriceModal((p) => ({ ...p, error: 'Price must be greater than 0.' }));
      return;
    }
    setPriceModal((p) => ({ ...p, saving: true, error: '' }));
    try {
      const dto = await apiCall(`/listings/${priceModal.listingId}/price`, { method: 'PUT', body: JSON.stringify({ newPrice }) });
      toast.success(`Price updated to ${fmtLkr(dto.price)}. Status: ${dto.status}${dto.priceVerdict ? ` · ${(VERDICT_BADGES[dto.priceVerdict] || VERDICT_BADGES.UNKNOWN).label}` : ''}`, { duration: 6000 });
      setPriceModal(null);
      reload();
    } catch (err) {
      setPriceModal((p) => ({ ...p, saving: false, error: err.message || 'Failed to update price.' }));
    }
  };

  const confirmDelete = async () => {
    setDeleting(true);
    try {
      await apiCall(`/listings/${deleteTarget.id}`, { method: 'DELETE' });
      toast.success('Listing deleted');
      setItems((prev) => prev.filter((i) => i.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      toast.error(err.message || 'Failed to delete the listing.');
    } finally {
      setDeleting(false);
    }
  };

  // My Listings is small, so it is searched in the browser; the marketplace is searched by the API.
  const visibleItems = activeTab === 'mine' && mineSearch.trim()
    ? items.filter((i) => [i.title, i.brand, i.model, i.category].some((v) => v?.toLowerCase().includes(mineSearch.trim().toLowerCase())))
    : items;

  const showAi = activeTab === 'mine' || isAdmin; // trust/verdict only for the owner and admins
  const filterInput = { padding: '0.6rem 0.8rem', borderRadius: '8px', background: 'rgba(255,255,255,0.1)', border: '1px solid rgba(255,255,255,0.25)', color: '#fff', width: '100%', boxSizing: 'border-box' };

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0', maxWidth: '1200px', margin: '0 auto' }}>
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', marginBottom: '2rem', gap: '1.25rem' }}>
        <h1 className="text-gradient" style={{ fontSize: '2.5rem', margin: 0, fontWeight: '800' }}>
          {activeTab === 'mine' ? 'My Listings' : 'Marketplace'}
        </h1>
        <p style={{ color: 'var(--text-secondary)', margin: 0, textAlign: 'center' }}>
          {activeTab === 'mine' ? 'Status, trust score and fair-price verdict of your listings (only you can see these)' : 'Browse instruments from sellers across Sri Lanka'}
        </p>

        {!isAdmin && (
          <div role="tablist" style={{ display: 'flex', gap: '0.5rem', background: 'rgba(0,0,0,0.3)', padding: '0.4rem', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.1)' }}>
            <button role="tab" aria-selected={activeTab === 'marketplace'} onClick={() => setTab('marketplace')}
              className={`btn ${activeTab === 'marketplace' ? 'btn-primary' : ''}`} style={activeTab === 'marketplace' ? {} : { background: 'transparent', color: 'var(--text-secondary)' }}>
              <ShoppingBag size={16} /> Marketplace
            </button>
            <button role="tab" aria-selected={activeTab === 'mine'} onClick={() => setTab('mine')}
              className={`btn ${activeTab === 'mine' ? 'btn-primary' : ''}`} style={activeTab === 'mine' ? {} : { background: 'transparent', color: 'var(--text-secondary)' }}>
              <Store size={16} /> My Listings
            </button>
          </div>
        )}

        {/* Search */}
        <form onSubmit={applyFilters} style={{ display: 'flex', gap: '12px', width: '100%', maxWidth: '700px' }}>
          <div className="glass-panel" style={{ display: 'flex', alignItems: 'center', padding: '0.75rem 1.5rem', flex: 1, borderRadius: '30px' }}>
            <Search size={22} style={{ color: 'var(--text-secondary)', marginRight: '1rem' }} />
            {activeTab === 'mine' ? (
              <input type="text" placeholder="Search my listings..." value={mineSearch} onChange={(e) => setMineSearch(e.target.value)} aria-label="Search my listings"
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '1rem' }} />
            ) : (
              <input type="text" placeholder="Search title, brand, model or category..." value={filters.q} onChange={(e) => setFilters({ ...filters, q: e.target.value })} aria-label="Search marketplace"
                style={{ background: 'transparent', border: 'none', color: 'white', outline: 'none', width: '100%', fontSize: '1rem' }} />
            )}
          </div>
          {activeTab === 'marketplace' && (
            <>
              <button type="submit" className="btn btn-primary" style={{ borderRadius: '30px' }}>Search</button>
              <button type="button" title="Filters" aria-label="Filters" onClick={() => setShowFilters((v) => !v)} className="btn btn-outline" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, justifyContent: 'center' }}>
                <SlidersHorizontal size={18} />
              </button>
            </>
          )}
          <button type="button" onClick={reload} title="Refresh listings" aria-label="Refresh listings" className="btn btn-outline" style={{ borderRadius: '50%', width: '48px', height: '48px', padding: 0, justifyContent: 'center' }}>
            <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
          </button>
        </form>

        {activeTab === 'marketplace' && showFilters && (
          <form onSubmit={applyFilters} className="glass-panel" style={{ width: '100%', maxWidth: '700px', padding: '1rem', borderRadius: '16px', display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(150px, 1fr))', gap: '0.75rem' }}>
            <input style={filterInput} placeholder="Category" value={filters.category} onChange={(e) => setFilters({ ...filters, category: e.target.value })} aria-label="Category filter" />
            <input style={filterInput} placeholder="Brand" value={filters.brand} onChange={(e) => setFilters({ ...filters, brand: e.target.value })} aria-label="Brand filter" />
            <select style={{ ...filterInput, background: '#1f1b2e' }} value={filters.condition} onChange={(e) => setFilters({ ...filters, condition: e.target.value })} aria-label="Condition filter">
              <option value="">Any condition</option>
              {CONDITIONS.map((c) => <option key={c} value={c}>{c.replace('_', ' ')}</option>)}
            </select>
            <input style={filterInput} type="number" min="0" placeholder="Min LKR" value={filters.minPrice} onChange={(e) => setFilters({ ...filters, minPrice: e.target.value })} aria-label="Minimum price" />
            <input style={filterInput} type="number" min="0" placeholder="Max LKR" value={filters.maxPrice} onChange={(e) => setFilters({ ...filters, maxPrice: e.target.value })} aria-label="Maximum price" />
            <div style={{ display: 'flex', gap: '0.5rem' }}>
              <button type="submit" className="btn btn-primary" style={{ flex: 1 }}>Apply</button>
              <button type="button" className="btn btn-outline" onClick={clearFilters}>Clear</button>
            </div>
          </form>
        )}
      </div>

      {error && <ErrorState compact message={error} onRetry={reload} />}

      {loading && items.length === 0 ? (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {Array.from({ length: 6 }).map((_, i) => <Skeleton key={i} height="320px" borderRadius="14px" />)}
        </div>
      ) : (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(260px, 1fr))', gap: '1.5rem' }}>
          {visibleItems.map((item) => {
            const isOwn = currentUser && item.sellerId === currentUser.id;
            const status = STATUS_BADGES[item.status] || { bg: 'rgba(255,255,255,0.1)', color: '#fff', border: 'rgba(255,255,255,0.2)', label: item.status };
            const verdict = item.priceVerdict ? (VERDICT_BADGES[item.priceVerdict] || VERDICT_BADGES.UNKNOWN) : null;
            return (
              <div key={item.id} data-testid={`listing-card-${item.id}`} className="glass-panel"
                style={{ overflow: 'hidden', display: 'flex', flexDirection: 'column', borderRadius: '14px', border: '1px solid rgba(255,255,255,0.15)', cursor: 'pointer' }}
                onClick={() => navigate(`/dashboard/listings/${item.id}`)}>
                <div style={{ height: '180px', width: '100%', overflow: 'hidden', position: 'relative', background: '#111' }}>
                  <img src={item.firstImageUrl || 'https://placehold.co/400x300?text=No+Photo'} alt={item.title}
                    style={{ width: '100%', height: '100%', objectFit: 'cover', filter: item.status === 'SOLD' ? 'grayscale(100%)' : 'none' }} />
                  {item.status === 'SOLD' && (
                    <div style={{ position: 'absolute', top: '50%', left: '50%', transform: 'translate(-50%, -50%) rotate(-15deg)', background: 'rgba(239, 68, 68, 0.9)', color: '#fff', padding: '6px 20px', fontSize: '1.2rem', fontWeight: '900', border: '2px solid #fff', borderRadius: '6px' }}>
                      SOLD
                    </div>
                  )}

                  {/* Wishlist heart: not for admins, not on your own listing */}
                  {currentUser && !isAdmin && !isOwn && activeTab === 'marketplace' && item.status === 'LIVE' && (
                    <button type="button" aria-label={wishlist.includes(item.id) ? 'Remove from wishlist' : 'Add to wishlist'} data-testid={`wishlist-${item.id}`}
                      onClick={(e) => toggleWishlist(item.id, e)}
                      style={{ position: 'absolute', top: '10px', left: '10px', background: 'rgba(0,0,0,0.5)', border: 'none', borderRadius: '50%', width: '32px', height: '32px', display: 'flex', alignItems: 'center', justifyContent: 'center', color: wishlist.includes(item.id) ? '#ff006e' : '#fff', cursor: 'pointer' }}>
                      <Heart size={18} fill={wishlist.includes(item.id) ? '#ff006e' : 'none'} />
                    </button>
                  )}

                  <div style={{ position: 'absolute', top: '10px', right: '10px', display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '4px' }}>
                    {(activeTab === 'mine' || isAdmin) && <Badge style={status} />}
                    {showAi && <Badge style={trustBadge(item.trustScore)} />}
                    {showAi && verdict && <Badge style={verdict} />}
                  </div>

                  {item.condition && (
                    <div style={{ position: 'absolute', bottom: '10px', left: '10px', background: 'rgba(0,0,0,0.75)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>
                      {item.condition.replace('_', ' ')}
                    </div>
                  )}
                  {isOwn && activeTab === 'marketplace' && (
                    <div style={{ position: 'absolute', bottom: '10px', right: '10px', background: 'rgba(168,85,247,0.85)', color: '#fff', padding: '0.2rem 0.6rem', borderRadius: '6px', fontSize: '0.75rem' }}>Your listing</div>
                  )}
                </div>

                <div style={{ padding: '1.25rem', display: 'flex', flexDirection: 'column', gap: '0.5rem', flex: 1 }}>
                  <div style={{ color: 'var(--text-secondary)', fontSize: '0.8rem', textTransform: 'uppercase', letterSpacing: '0.5px' }}>
                    {item.category} • {item.brand}
                  </div>
                  <h3 style={{ fontSize: '1.1rem', margin: 0, fontWeight: '600', color: '#fff', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }} title={item.title}>
                    {item.title}
                  </h3>
                  <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'baseline', marginTop: 'auto', paddingTop: '0.5rem' }}>
                    <p style={{ color: 'var(--primary-hover, #a855f7)', fontSize: '1.2rem', fontWeight: '800', margin: 0 }}>{fmtLkr(item.price)}</p>
                    <span style={{ fontSize: '0.8rem', color: 'var(--text-secondary)' }}>{item.listingType || 'Sell'}</span>
                  </div>
                  {showAi && item.fairPriceMin != null && item.fairPriceMax != null && (
                    <div style={{ fontSize: '0.78rem', color: 'var(--text-secondary)' }}>Fair: {fmtLkr(item.fairPriceMin)} – {fmtLkr(item.fairPriceMax)}</div>
                  )}
                  {activeTab === 'mine' && item.trustScore != null && item.trustScore >= 40 && item.trustScore < 70 && (
                    <div style={{ fontSize: '0.78rem', color: '#f59e0b', display: 'flex', gap: '4px', alignItems: 'center' }}><AlertTriangle size={12} /> Live with a low-trust warning</div>
                  )}
                  {item.location && (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8rem', color: 'var(--text-secondary)' }}>
                      <MapPin size={12} /> {item.location}
                    </div>
                  )}

                  {item.latitude != null && item.longitude != null && (
                    <div style={{ height: '100px', width: '100%', borderRadius: '6px', overflow: 'hidden', marginTop: '0.5rem', border: '1px solid rgba(255,255,255,0.1)' }}>
                      <MapContainer center={[item.latitude, item.longitude]} zoom={13} style={{ height: '100%', width: '100%', zIndex: 1 }} zoomControl={false} dragging={false} scrollWheelZoom={false} doubleClickZoom={false} attributionControl={false}>
                        <TileLayer url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png" />
                        <Marker position={[item.latitude, item.longitude]} />
                      </MapContainer>
                    </div>
                  )}

                  {activeTab === 'mine' && (
                    <div style={{ display: 'flex', gap: '0.5rem', marginTop: '0.75rem' }} onClick={(e) => e.stopPropagation()}>
                      {item.status !== 'SOLD' && (
                        <>
                          <button type="button" className="btn btn-outline" data-testid={`edit-${item.id}`} onClick={() => navigate(`/dashboard/edit/${item.id}`)} style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                            <Edit2 size={14} /> Edit
                          </button>
                          <button type="button" className="btn btn-outline" onClick={() => setPriceModal({ listingId: item.id, currentPrice: item.price, newPrice: String(item.price), saving: false, error: '' })} style={{ flex: 1, padding: '0.4rem', fontSize: '0.85rem', justifyContent: 'center' }}>
                            <Edit2 size={14} /> Price
                          </button>
                          <button type="button" className="btn btn-outline" aria-label="Delete listing" onClick={() => setDeleteTarget(item)} style={{ padding: '0.4rem 0.6rem', color: '#ff6b6b', borderColor: 'rgba(255,107,107,0.4)' }}>
                            <Trash2 size={14} />
                          </button>
                        </>
                      )}
                      {item.status === 'SOLD' && <span style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Sold items cannot be edited.</span>}
                    </div>
                  )}
                </div>
              </div>
            );
          })}

          {visibleItems.length === 0 && !loading && !error && (
            <div style={{ gridColumn: '1 / -1', textAlign: 'center', padding: '4rem 1rem', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '1rem' }}>
              <Package size={48} style={{ color: 'var(--text-secondary)', opacity: 0.6 }} />
              <h3 style={{ margin: 0, color: '#eaeaea' }}>
                {activeTab === 'mine' ? "You haven't posted any instruments yet" : 'No instruments match your search.'}
              </h3>
              {activeTab === 'mine' && (
                <button type="button" className="btn btn-primary" onClick={() => navigate('/dashboard/create')}>
                  <PlusCircle size={18} /> Create your first post
                </button>
              )}
            </div>
          )}
        </div>
      )}

      {activeTab === 'marketplace' && page < totalPages && !error && (
        <div style={{ textAlign: 'center', marginTop: '2rem' }}>
          <button type="button" className="btn btn-outline" disabled={loading} onClick={() => { setLoading(true); loadMarketplace(page + 1, appliedFilters); }}>
            {loading ? 'Loading...' : 'Load more'}
          </button>
        </div>
      )}

      {/* Price modal */}
      {priceModal && (
        <div role="dialog" aria-modal="true" onClick={() => !priceModal.saving && setPriceModal(null)}
          style={{ position: 'fixed', inset: 0, background: 'rgba(8, 6, 15, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-panel" onClick={(e) => e.stopPropagation()} style={{ width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '24px', background: 'linear-gradient(145deg, rgba(30, 24, 45, 0.98), rgba(18, 14, 28, 0.99))' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '1.5rem' }}>
              <h3 style={{ margin: 0 }}>Change price</h3>
              <button type="button" aria-label="Close" onClick={() => setPriceModal(null)} disabled={priceModal.saving} style={{ background: 'transparent', border: 'none', color: 'var(--text-secondary)', cursor: 'pointer' }}>
                <XCircle size={24} />
              </button>
            </div>
            <label htmlFor="new-price" style={{ display: 'block', color: 'var(--text-secondary)', fontSize: '0.9rem', marginBottom: '0.5rem' }}>
              New price (LKR) – now {fmtLkr(priceModal.currentPrice)}
            </label>
            <input id="new-price" type="number" min="1" className="input-field" value={priceModal.newPrice}
              onChange={(e) => setPriceModal((p) => ({ ...p, newPrice: e.target.value }))} style={{ width: '100%', marginBottom: '1rem' }} />
            {priceModal.error && <ErrorState compact message={priceModal.error} />}
            {priceModal.saving && <p style={{ color: 'var(--text-secondary)', fontSize: '0.85rem' }}>Saving and re-checking the price with AI…</p>}
            <button type="button" className="btn btn-primary" style={{ width: '100%' }} onClick={savePrice}
              disabled={priceModal.saving || Number(priceModal.newPrice) === Number(priceModal.currentPrice)}>
              {priceModal.saving ? 'Saving...' : 'Save price'}
            </button>
          </div>
        </div>
      )}

      {/* Delete confirm */}
      {deleteTarget && (
        <div role="dialog" aria-modal="true" style={{ position: 'fixed', inset: 0, background: 'rgba(8, 6, 15, 0.8)', display: 'flex', justifyContent: 'center', alignItems: 'center', zIndex: 9999, padding: '1rem' }}>
          <div className="glass-panel" style={{ width: '100%', maxWidth: '400px', padding: '2rem', borderRadius: '24px', textAlign: 'center', background: 'linear-gradient(145deg, rgba(30, 24, 45, 0.98), rgba(18, 14, 28, 0.99))' }}>
            <AlertTriangle size={40} style={{ color: '#ff6b6b', marginBottom: '0.75rem' }} />
            <h3 style={{ margin: '0 0 0.5rem 0' }}>Delete “{deleteTarget.title}”?</h3>
            <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>This cannot be undone.</p>
            <div style={{ display: 'flex', gap: '1rem' }}>
              <button type="button" className="btn btn-outline" style={{ flex: 1 }} onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</button>
              <button type="button" className="btn btn-primary" style={{ flex: 1, background: '#ff6b6b' }} onClick={confirmDelete} disabled={deleting}>
                {deleting ? 'Deleting...' : 'Delete'}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default AllItems;
