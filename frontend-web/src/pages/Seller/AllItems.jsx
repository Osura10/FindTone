import React, { useCallback, useEffect, useState } from 'react';
import { useLocation, useNavigate, useSearchParams } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Search, Package, PlusCircle, RefreshCw, ShoppingBag, Store, Heart, Edit2, MapPin, Trash2, AlertTriangle, SlidersHorizontal, Tag } from 'lucide-react';
import { apiCall } from '../../services/api';
import { useDashboard, isAdminUser } from '../../hooks/useDashboard';
import {
  Button, Card, EmptyState, ErrorState, Input, Modal, PageHeader, PriceTag, Select, Skeleton,
  StatusBadge, Tabs, TrustBadge, VerdictBadge, formatLKR, verdictInfo
} from '../../components/ui';

const PAGE_SIZE = 1000;
const CONDITIONS = ['new', 'like_new', 'excellent', 'good', 'fair', 'poor', 'for_parts'];
const EMPTY_FILTERS = { q: '', category: '', brand: '', condition: '', minPrice: '', maxPrice: '' };
const PLACEHOLDER = 'https://placehold.co/400x300?text=No+Photo';
const prettyCondition = (c) => (c ? c.replace('_', ' ') : '');

const AllItems = () => {
  const navigate = useNavigate();
  const location = useLocation();
  const [searchParams, setSearchParams] = useSearchParams();
  const { currentUser } = useDashboard();
  const isAdmin = isAdminUser(currentUser);
  const activeTab = !isAdmin && searchParams.get('tab') === 'mine' ? 'mine' : 'marketplace';
  const urlQuery = searchParams.get('q') || '';

  const [items, setItems] = useState([]);
  const [page, setPage] = useState(1);
  const [totalPages, setTotalPages] = useState(1);
  const [totalCount, setTotalCount] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [filters, setFilters] = useState({ ...EMPTY_FILTERS, q: urlQuery });
  const [appliedFilters, setAppliedFilters] = useState({ ...EMPTY_FILTERS, q: urlQuery });
  const [showFilters, setShowFilters] = useState(false); // only matters on small screens
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
      setTotalCount(data.totalCount ?? null);
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

  // The navbar search sends "?q=..." – copy it into the search box and run the search.
  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    setFilters((f) => (f.q === urlQuery ? f : { ...f, q: urlQuery }));
    setAppliedFilters((f) => (f.q === urlQuery ? f : { ...f, q: urlQuery }));
  }, [urlQuery]);

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
    setShowFilters(false);
  };

  const clearFilters = () => {
    setFilters(EMPTY_FILTERS);
    setAppliedFilters(EMPTY_FILTERS);
    if (urlQuery) setSearchParams({});
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
      toast.success(`Price updated to ${formatLKR(dto.price)}. Status: ${dto.status}${dto.priceVerdict ? ` · ${verdictInfo(dto.priceVerdict).label}` : ''}`, { duration: 6000 });
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

  const activeFilterCount = Object.entries(appliedFilters).filter(([k, v]) => k !== 'q' && String(v).trim() !== '').length;
  const setFilter = (key) => (e) => setFilters({ ...filters, [key]: e.target.value });

  // ── Pieces ─────────────────────────────────────────────────────────────────

  const listingCard = (item) => {
    const isOwn = currentUser && item.sellerId === currentUser.id;
    const sold = item.status === 'SOLD';
    const saved = wishlist.includes(item.id);
    return (
      <article
        key={item.id}
        data-testid={`listing-card-${item.id}`}
        className={`card card-hover listing-card ${sold ? 'is-sold' : ''}`}
        onClick={() => navigate(`/dashboard/listings/${item.id}`)}
      >
        <div className="listing-media">
          <img src={item.firstImageUrl || PLACEHOLDER} alt={item.title} loading="lazy" />
          {sold && <span className="sold-ribbon">SOLD OUT</span>}
          <div className="overlay-top">
            <div className="row" style={{ gap: 6 }}>
              {item.condition && <span className="badge badge-neutral media-badge">{prettyCondition(item.condition)}</span>}
              {isOwn && <span className="badge badge-primary media-badge">Your listing</span>}
            </div>
            {/* Wishlist heart: not for admins, not on your own listing */}
            {currentUser && !isAdmin && !isOwn && item.status === 'LIVE' && (
              <button
                type="button"
                className={`heart-btn ${saved ? 'on' : ''}`}
                aria-label={saved ? 'Remove from wishlist' : 'Add to wishlist'}
                aria-pressed={saved}
                data-testid={`wishlist-${item.id}`}
                onClick={(e) => toggleWishlist(item.id, e)}
              >
                <Heart size={17} fill={saved ? 'currentColor' : 'none'} />
              </button>
            )}
          </div>
        </div>
        <div className="listing-body">
          <span className="text-xs muted truncate" style={{ textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            {[item.category, item.brand].filter(Boolean).join(' · ')}
          </span>
          <h3 className="listing-title" title={item.title}>{item.title}</h3>
          <div className="row-between" style={{ marginTop: 'auto', paddingTop: 6, alignItems: 'baseline' }}>
            <PriceTag amount={item.price} size="md" />
            {item.listingType && item.listingType !== 'Sell' && <span className="text-xs muted">{item.listingType}</span>}
          </div>
          {item.location && (
            <span className="listing-meta"><MapPin size={12} aria-hidden="true" /><span className="truncate">{item.location}</span></span>
          )}
          {isAdmin && (
            <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 6 }}>
              <StatusBadge status={item.status} />
              <TrustBadge score={item.trustScore} />
              {item.priceVerdict && <VerdictBadge verdict={item.priceVerdict} />}
            </div>
          )}
        </div>
      </article>
    );
  };

  // Owner row: status, trust, verdict and actions – only the seller (and admins) see these.
  const ownerRow = (item) => {
    const sold = item.status === 'SOLD';
    return (
      <article key={item.id} data-testid={`listing-card-${item.id}`} className="card owner-item" onClick={() => navigate(`/dashboard/listings/${item.id}`)}>
        <div className="owner-thumb">
          <img src={item.firstImageUrl || PLACEHOLDER} alt="" loading="lazy" />
        </div>
        <div className="owner-info">
          <h3 className="listing-title" title={item.title}>{item.title}</h3>
          <span className="text-xs muted truncate">{[item.category, item.brand, item.model].filter(Boolean).join(' · ')}</span>
          <div className="row" style={{ gap: 6, flexWrap: 'wrap', marginTop: 4 }}>
            <StatusBadge status={item.status} />
            <TrustBadge score={item.trustScore} />
            {item.priceVerdict && <VerdictBadge verdict={item.priceVerdict} />}
          </div>
          {item.trustScore != null && item.trustScore >= 40 && item.trustScore < 70 && (
            <span className="text-xs row" style={{ gap: 4, color: 'var(--warning)' }}><AlertTriangle size={12} aria-hidden="true" /> Live with a low-trust warning</span>
          )}
        </div>
        <div className="owner-price">
          <PriceTag amount={item.price} size="md" />
          {item.fairPriceMin != null && item.fairPriceMax != null && (
            <span className="text-xs muted">Fair: {formatLKR(item.fairPriceMin)} – {formatLKR(item.fairPriceMax)}</span>
          )}
        </div>
        <div className="owner-actions" onClick={(e) => e.stopPropagation()}>
          {sold ? (
            <span className="text-sm muted">Sold items cannot be edited.</span>
          ) : (
            <>
              <Button variant="secondary" size="sm" icon={Edit2} data-testid={`edit-${item.id}`} onClick={() => navigate(`/dashboard/edit/${item.id}`)}>Edit</Button>
              <Button variant="secondary" size="sm" icon={Tag} onClick={() => setPriceModal({ listingId: item.id, currentPrice: item.price, newPrice: String(item.price), saving: false, error: '' })}>Price</Button>
              <Button variant="danger-outline" size="sm" icon={Trash2} iconOnly aria-label="Delete listing" onClick={() => setDeleteTarget(item)} />
            </>
          )}
        </div>
      </article>
    );
  };

  const filterPanel = (
    <aside className={`filter-panel ${showFilters ? '' : 'closed'}`} aria-label="Filters">
      <Card as="form" onSubmit={applyFilters} className="stack">
        <div className="row-between">
          <h2 className="section-title" style={{ fontSize: 'var(--text-base)' }}>Filters</h2>
          {activeFilterCount > 0 && <Button variant="ghost" size="sm" onClick={clearFilters}>Clear all</Button>}
        </div>
        <Input label="Category" placeholder="e.g. Acoustic Guitar" value={filters.category} onChange={setFilter('category')} />
        <Input label="Brand" placeholder="e.g. Yamaha" value={filters.brand} onChange={setFilter('brand')} />
        <Select
          label="Condition"
          value={filters.condition}
          onChange={setFilter('condition')}
          placeholder="Any condition"
          options={CONDITIONS.map((c) => ({ value: c, label: prettyCondition(c) }))}
        />
        <div className="field">
          <span className="field-label">Price (LKR)</span>
          <div className="range-row">
            <input className="input" type="number" min="0" placeholder="Min" value={filters.minPrice} onChange={setFilter('minPrice')} aria-label="Minimum price" />
            <span className="muted" aria-hidden="true">–</span>
            <input className="input" type="number" min="0" placeholder="Max" value={filters.maxPrice} onChange={setFilter('maxPrice')} aria-label="Maximum price" />
          </div>
        </div>
        <div className="row" style={{ gap: 8 }}>
          <Button type="submit" block>Apply filters</Button>
          <Button variant="secondary" onClick={clearFilters}>Clear</Button>
        </div>
      </Card>
    </aside>
  );

  const skeletonGrid = (
    <div className="listing-grid" aria-busy="true" aria-label="Loading listings">
      {Array.from({ length: 8 }).map((_, i) => (
        <div key={i} className="card listing-card">
          <Skeleton height="auto" style={{ aspectRatio: '4 / 3' }} radius="0" />
          <div className="listing-body"><Skeleton width="50%" height="10px" /><Skeleton width="90%" /><Skeleton width="40%" height="20px" /></div>
        </div>
      ))}
    </div>
  );

  // ── Render ─────────────────────────────────────────────────────────────────

  return (
    <div className="page">
      <PageHeader
        title={activeTab === 'mine' ? 'My Listings' : isAdmin ? 'All listings' : 'Marketplace'}
        subtitle={activeTab === 'mine'
          ? 'Status, trust score and fair-price verdict of your listings – only you can see these.'
          : 'Browse instruments from sellers across Sri Lanka'}
        actions={
          <>
            <Button variant="secondary" icon={RefreshCw} onClick={reload} loading={loading} aria-label="Refresh listings">
              <span className="hide-sm">Refresh</span>
            </Button>
            {!isAdmin && <Button icon={PlusCircle} onClick={() => navigate('/dashboard/create')}>Sell an instrument</Button>}
          </>
        }
      />

      {!isAdmin && (
        <Tabs
          ariaLabel="Listing views"
          value={activeTab}
          onChange={setTab}
          tabs={[
            { id: 'marketplace', label: 'Marketplace', icon: ShoppingBag },
            { id: 'mine', label: 'My Listings', icon: Store, count: activeTab === 'mine' && !loading ? items.length : undefined }
          ]}
        />
      )}

      {activeTab === 'marketplace' ? (
        <div className="market-layout">
          {filterPanel}
          <section className="stack" aria-label="Listings">
            <form onSubmit={applyFilters} className="row" style={{ gap: 8 }} role="search">
              <div className="input-icon-wrap grow">
                <Search size={16} aria-hidden="true" />
                <input className="input" type="search" placeholder="Search title, brand, model or category…" value={filters.q} onChange={setFilter('q')} aria-label="Search marketplace" />
              </div>
              <Button type="submit">Search</Button>
              <Button
                variant="secondary"
                className="only-mobile"
                icon={SlidersHorizontal}
                aria-label="Filters"
                aria-expanded={showFilters}
                onClick={() => setShowFilters((v) => !v)}
              >
                {activeFilterCount > 0 ? activeFilterCount : null}
              </Button>
            </form>

            {!loading && !error && (
              <p className="text-sm muted" aria-live="polite">
                {totalCount != null ? `${totalCount} instrument${totalCount === 1 ? '' : 's'}` : `${items.length} shown`}
                {appliedFilters.q && <> for “<strong style={{ color: 'var(--text)' }}>{appliedFilters.q}</strong>”</>}
              </p>
            )}

            {error && <ErrorState compact message={error} onRetry={reload} />}

            {loading && items.length === 0 ? skeletonGrid : visibleItems.length > 0 ? (
              <div className="listing-grid">{visibleItems.map(listingCard)}</div>
            ) : !error && (
              <Card>
                <EmptyState
                  icon={Package}
                  title="No instruments match your search"
                  description="Try a different keyword or clear the filters."
                  action={<Button variant="secondary" onClick={clearFilters}>Clear filters</Button>}
                />
              </Card>
            )}


          </section>
        </div>
      ) : (
        <section className="stack" aria-label="My listings">
          <div className="input-icon-wrap" style={{ maxWidth: 420 }}>
            <Search size={16} aria-hidden="true" />
            <input className="input" type="search" placeholder="Search my listings…" value={mineSearch} onChange={(e) => setMineSearch(e.target.value)} aria-label="Search my listings" />
          </div>

          {error && <ErrorState compact message={error} onRetry={reload} />}

          {loading && items.length === 0 ? (
            <div className="stack-sm">{Array.from({ length: 3 }).map((_, i) => <Skeleton key={i} height="104px" radius="var(--radius-lg)" />)}</div>
          ) : visibleItems.length > 0 ? (
            <div className="stack-sm">{visibleItems.map(ownerRow)}</div>
          ) : !error && (
            <Card>
              <EmptyState
                icon={Package}
                title={mineSearch ? 'No listings match your search' : "You haven't posted any instruments yet"}
                description={mineSearch ? 'Try another keyword.' : 'Post your first instrument – our AI checks it and it goes live in seconds.'}
                action={!mineSearch && <Button icon={PlusCircle} onClick={() => navigate('/dashboard/create')}>Create your first post</Button>}
              />
            </Card>
          )}
        </section>
      )}

      {/* Price modal */}
      <Modal
        isOpen={!!priceModal}
        onClose={() => !priceModal?.saving && setPriceModal(null)}
        title="Change price"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setPriceModal(null)} disabled={priceModal?.saving}>Cancel</Button>
            <Button onClick={savePrice} loading={priceModal?.saving} disabled={Number(priceModal?.newPrice) === Number(priceModal?.currentPrice)}>
              {priceModal?.saving ? 'Saving…' : 'Save price'}
            </Button>
          </>
        }
      >
        {priceModal && (
          <div className="stack">
            <Input
              id="new-price"
              type="number"
              min="1"
              label="New price (LKR)"
              hint={`Now ${formatLKR(priceModal.currentPrice)}. Buyers who saved it are told about price drops.`}
              value={priceModal.newPrice}
              onChange={(e) => setPriceModal((p) => ({ ...p, newPrice: e.target.value }))}
            />
            {priceModal.error && <ErrorState compact message={priceModal.error} />}
            {priceModal.saving && <p className="text-sm muted">Saving and re-checking the price with AI…</p>}
          </div>
        )}
      </Modal>

      {/* Delete confirm */}
      <Modal
        isOpen={!!deleteTarget}
        onClose={() => !deleting && setDeleteTarget(null)}
        title="Delete listing?"
        size="sm"
        footer={
          <>
            <Button variant="secondary" onClick={() => setDeleteTarget(null)} disabled={deleting}>Cancel</Button>
            <Button variant="danger" onClick={confirmDelete} loading={deleting}>{deleting ? 'Deleting…' : 'Delete'}</Button>
          </>
        }
      >
        <p>“<strong>{deleteTarget?.title}</strong>” will be removed from the marketplace. This cannot be undone.</p>
      </Modal>
    </div>
  );
};

export default AllItems;
