import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import toast from 'react-hot-toast';
import { Users, Store, ShieldCheck, ArrowRight, Shield, RefreshCw, UserPlus, ShieldAlert, Clock, Sparkles } from 'lucide-react';
import { apiCall } from '../../services/api';
import AddAdminModal from '../../components/AddAdminModal';
import { Button, Card, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import { HBarChart, StackedBarChart } from '../../components/charts/BarCharts';

/** Clickable KPI tile. */
const Kpi = ({ label, value, icon: Icon, tone, hint, onClick }) => (
  <button type="button" className="card stat-card kpi" onClick={onClick}>
    <span className="label">
      <span className="icon" style={tone ? { background: `var(--${tone}-soft)`, color: `var(--${tone})` } : undefined}><Icon size={18} aria-hidden="true" /></span>
      {label}
    </span>
    <span className="value">{Number(value ?? 0).toLocaleString('en-LK')}</span>
    {hint && <span className="text-xs muted">{hint}</span>}
  </button>
);

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);

  const fetchStats = async () => {
    try {
      setLoading(true);
      setError('');
      const data = await apiCall('/admin/stats');
      setStats(data);
    } catch (err) {
      console.error(err);
      setError(err.message || 'Failed to load administrator statistics.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchStats();
  }, []);

  const handleAdminCreated = (newAdmin, message) => {
    toast.success(message || 'Admin created successfully!');
    fetchStats();
  };

  const header = (
    <PageHeader
      icon={Shield}
      title="Admin dashboard"
      subtitle="Verify shops and admins, review risky listings and keep an eye on the platform."
      actions={
        <>
          <Button variant="secondary" icon={RefreshCw} onClick={fetchStats} loading={loading && !!stats}>Refresh</Button>
          <Button icon={UserPlus} onClick={() => setIsAddAdminOpen(true)}>Add new admin</Button>
        </>
      }
    />
  );

  if (loading && !stats) {
    return (
      <div className="page" aria-busy="true" aria-label="Loading dashboard">
        {header}
        <div className="stat-grid">{[0, 1, 2, 3].map((i) => <Skeleton key={i} height="118px" radius="var(--radius-lg)" />)}</div>
        <div className="dash-grid"><Skeleton height="240px" radius="var(--radius-lg)" /><Skeleton height="240px" radius="var(--radius-lg)" /></div>
      </div>
    );
  }

  if (error && !stats) {
    return (
      <div className="page">
        {header}
        <Card><ErrorState message={error} onRetry={fetchStats} /></Card>
      </div>
    );
  }

  const s = stats || {};
  const shops = (s.approvedShops ?? 0) + (s.pendingShops ?? 0);
  const admins = (s.approvedAdmins ?? 0) + (s.pendingAdmins ?? 0);
  const toReview = (s.flaggedListings ?? 0) + (s.pendingChecks ?? 0);
  const pendingAccounts = (s.pendingShops ?? 0) + (s.pendingAdmins ?? 0);

  return (
    <div className="page">
      {header}
      {error && <ErrorState compact message={error} onRetry={fetchStats} />}

      {/* KPI row */}
      <div className="stat-grid">
        <Kpi label="Registered buyers" value={s.totalBuyers} icon={Users} onClick={() => navigate('/dashboard/admin/buyers')} hint="Active shoppers" />
        <Kpi label="Shops" value={shops} icon={Store} onClick={() => navigate('/dashboard/admin/shops')} hint={`${s.approvedShops ?? 0} verified · ${s.pendingShops ?? 0} waiting`} />
        <Kpi label="Platform admins" value={admins} icon={ShieldCheck} onClick={() => navigate('/dashboard/admin/admins')} hint={`${s.approvedAdmins ?? 0} approved · ${s.pendingAdmins ?? 0} waiting`} />
        <Kpi label="Listings to review" value={toReview} icon={ShieldAlert} tone={toReview > 0 ? 'danger' : 'success'} onClick={() => navigate('/dashboard/admin/listings')} hint={`${s.flaggedListings ?? 0} flagged · ${s.pendingChecks ?? 0} awaiting AI`} />
      </div>

      <div className="dash-grid">
        <Card className="stack">
          <div className="row-between">
            <div>
              <h2 className="section-title">Users by role</h2>
              <p className="text-sm muted">{(s.totalUsers ?? (s.totalBuyers ?? 0) + shops + admins).toLocaleString('en-LK')} accounts in total</p>
            </div>
          </div>
          <HBarChart
            title="Users by role"
            unit="accounts"
            data={[
              { label: 'Buyers', value: s.totalBuyers ?? 0, onClick: () => navigate('/dashboard/admin/buyers') },
              { label: 'Shops', value: shops, onClick: () => navigate('/dashboard/admin/shops') },
              { label: 'Admins', value: admins, onClick: () => navigate('/dashboard/admin/admins') }
            ]}
          />
        </Card>

        <Card className="stack">
          <div className="row-between">
            <div>
              <h2 className="section-title">Account verification</h2>
              <p className="text-sm muted">{pendingAccounts > 0 ? `${pendingAccounts} account${pendingAccounts === 1 ? '' : 's'} waiting for approval` : 'Everyone is verified'}</p>
            </div>
          </div>
          <StackedBarChart
            title="Approved and pending accounts by role"
            series={[
              { key: 'approved', label: 'Approved', color: 'var(--chart-1)' },
              { key: 'pending', label: 'Pending', color: 'var(--chart-2)' }
            ]}
            rows={[
              { label: 'Shops', values: { approved: s.approvedShops ?? 0, pending: s.pendingShops ?? 0 }, onClick: (k) => navigate(`/dashboard/admin/shops?status=${k}`) },
              { label: 'Admins', values: { approved: s.approvedAdmins ?? 0, pending: s.pendingAdmins ?? 0 }, onClick: (k) => navigate(`/dashboard/admin/admins?status=${k}`) }
            ]}
          />
        </Card>
      </div>

      <div className="dash-grid">
        {/* Moderation */}
        <Card className="stack">
          <div className="row-between">
            <h2 className="section-title">Moderation</h2>
            <Button variant="secondary" size="sm" onClick={() => navigate('/dashboard/admin/listings')}>Open review queue <ArrowRight size={14} aria-hidden="true" /></Button>
          </div>
          <div className="mod-tiles">
            <button type="button" className="mod-tile" onClick={() => navigate('/dashboard/admin/listings')}>
              <span className="mod-icon" style={{ background: 'var(--danger-soft)', color: 'var(--danger)' }}><ShieldAlert size={18} aria-hidden="true" /></span>
              <span><strong className="mod-num">{s.flaggedListings ?? 0}</strong><span className="text-sm muted">Flagged / under review</span></span>
            </button>
            <button type="button" className="mod-tile" onClick={() => navigate('/dashboard/admin/listings')}>
              <span className="mod-icon" style={{ background: 'var(--warning-soft)', color: 'var(--warning)' }}><Clock size={18} aria-hidden="true" /></span>
              <span><strong className="mod-num">{s.pendingChecks ?? 0}</strong><span className="text-sm muted">Waiting for the AI check</span></span>
            </button>
          </div>
          <p className="text-xs muted row" style={{ gap: 6, flexWrap: 'nowrap', alignItems: 'flex-start' }}>
            <Sparkles size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /> Listings with a trust score under 40, duplicate photos or extreme prices land here automatically.
          </p>
        </Card>

        {/* Quick actions */}
        <Card className="stack">
          <h2 className="section-title">Quick actions</h2>
          <div className="quick-links">
            {[
              { label: 'Verify pending shops', count: s.pendingShops, to: '/dashboard/admin/shops?status=pending', icon: Store },
              { label: 'Approve pending admins', count: s.pendingAdmins, to: '/dashboard/admin/admins?status=pending', icon: ShieldCheck },
              { label: 'Browse all listings', to: '/dashboard/items', icon: Users }
            ].map((q) => (
              <button key={q.label} type="button" className="quick-link" onClick={() => navigate(q.to)}>
                <q.icon size={16} aria-hidden="true" className="muted" />
                <span className="grow">{q.label}</span>
                {q.count > 0 && <span className="badge badge-warning">{q.count}</span>}
                <ArrowRight size={15} aria-hidden="true" className="muted" />
              </button>
            ))}
          </div>
        </Card>
      </div>

      <AddAdminModal
        isOpen={isAddAdminOpen}
        onClose={() => setIsAddAdminOpen(false)}
        onAdminCreated={handleAdminCreated}
      />
    </div>
  );
};

export default AdminDashboard;
