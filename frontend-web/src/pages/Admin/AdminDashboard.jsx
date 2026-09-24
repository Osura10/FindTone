import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { 
  Users, Store, ShieldCheck, CheckCircle2, Clock, 
  ArrowRight, Shield, UserCheck, AlertCircle, RefreshCw, Loader2, UserPlus, Check, ShieldAlert
} from 'lucide-react';
import { apiCall } from '../../services/api';
import AddAdminModal from '../../components/AddAdminModal';

const AdminDashboard = () => {
  const navigate = useNavigate();
  const [stats, setStats] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');
  const [isAddAdminOpen, setIsAddAdminOpen] = useState(false);
  const [toast, setToast] = useState('');

  const showToast = (msg) => {
    setToast(msg);
    setTimeout(() => setToast(''), 5000);
  };

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
    fetchStats();
  }, []);

  const handleAdminCreated = (newAdmin, message) => {
    showToast(message || 'Admin created successfully!');
    fetchStats();
  };

  if (loading) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '6rem 2rem', textAlign: 'center' }}>
        <Loader2 size={42} className="animate-spin" style={{ color: 'var(--primary-color)', margin: '0 auto 1rem' }} />
        <h2 style={{ fontSize: '1.5rem', color: 'var(--text-secondary)' }}>Loading Dashboard Overview...</h2>
      </div>
    );
  }

  if (error) {
    return (
      <div className="animate-fade-in-up" style={{ padding: '4rem 2rem', textAlign: 'center' }}>
        <div className="glass-panel" style={{ maxWidth: '500px', margin: '0 auto', padding: '2.5rem', border: '1px solid rgba(255, 77, 79, 0.3)' }}>
          <AlertCircle size={48} color="#ff4d4f" style={{ margin: '0 auto 1rem' }} />
          <h2 style={{ color: '#ff4d4f', marginBottom: '1rem' }}>Access Error</h2>
          <p style={{ color: 'var(--text-secondary)', marginBottom: '1.5rem' }}>{error}</p>
          <button className="btn btn-primary" onClick={fetchStats}>
            <RefreshCw size={18} /> Retry
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="animate-fade-in-up" style={{ padding: '1rem 0 4rem 0', maxWidth: '1100px', margin: '0 auto' }}>
      {/* Toast Notification */}
      {toast && (
        <div style={{
          position: 'fixed',
          top: '2rem',
          right: '2rem',
          zIndex: 99999,
          background: 'linear-gradient(135deg, rgba(16, 185, 129, 0.95), rgba(5, 150, 105, 0.98))',
          color: '#ffffff',
          padding: '1rem 1.5rem',
          borderRadius: '12px',
          boxShadow: '0 10px 30px rgba(0,0,0,0.5)',
          backdropFilter: 'blur(10px)',
          display: 'flex',
          alignItems: 'center',
          gap: '0.75rem',
          fontWeight: '500',
          border: '1px solid rgba(255,255,255,0.2)',
          animation: 'fadeInUp 0.3s ease'
        }}>
          <Check size={20} />
          <span>{toast}</span>
        </div>
      )}

      {/* Header */}
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2.5rem', flexWrap: 'wrap', gap: '1rem' }}>
        <div>
          <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem', marginBottom: '0.5rem' }}>
            <div style={{ padding: '0.5rem', background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.2), rgba(255, 0, 110, 0.2))', borderRadius: '10px' }}>
              <Shield size={24} color="var(--primary-color)" />
            </div>
            <h1 className="text-gradient" style={{ fontSize: '2.2rem', margin: 0, fontWeight: '800' }}>Admin Dashboard</h1>
          </div>
          <p style={{ color: 'var(--text-secondary)', margin: 0, fontSize: '1rem' }}>
            Manage platform users, verify shop and admin accounts, and oversee platform activity.
          </p>
        </div>

        <div style={{ display: 'flex', alignItems: 'center', gap: '0.75rem' }}>
          <button 
            onClick={() => setIsAddAdminOpen(true)}
            className="btn btn-primary" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '12px' }}
          >
            <UserPlus size={18} /> Add New Admin
          </button>

          <button 
            onClick={fetchStats}
            className="btn btn-outline" 
            style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', padding: '0.6rem 1.2rem', borderRadius: '12px' }}
          >
            <RefreshCw size={16} /> Refresh
          </button>
        </div>
      </div>

      {/* Grid of Main Stat Cards */}
      <div style={{
        display: 'grid',
        gridTemplateColumns: 'repeat(auto-fit, minmax(320px, 1fr))',
        gap: '2rem',
        marginBottom: '3rem'
      }}>

        {/* 1. BUYERS CARD */}
        <div 
          className="glass-panel"
          onClick={() => navigate('/dashboard/admin/buyers')}
          style={{
            padding: '2.2rem',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(0, 245, 212, 0.25)',
            background: 'linear-gradient(135deg, rgba(0, 245, 212, 0.06) 0%, rgba(18, 14, 28, 0.9) 100%)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 15px 35px rgba(0, 245, 212, 0.2)';
            e.currentTarget.style.borderColor = '#00f5d4';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(0, 245, 212, 0.25)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(0, 245, 212, 0.15)', borderRadius: '16px', color: '#00f5d4' }}>
              <Users size={32} />
            </div>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              color: '#00f5d4',
              background: 'rgba(0, 245, 212, 0.1)',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px'
            }}>
              View All <ArrowRight size={14} />
            </span>
          </div>

          <h3 style={{ margin: '0 0 0.5rem 0', fontSize: '1.15rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Registered Buyers
          </h3>
          <div style={{ fontSize: '3rem', fontWeight: '800', color: '#ffffff', letterSpacing: '-1px' }}>
            {stats?.totalBuyers ?? 0}
          </div>
          <p style={{ color: 'rgba(255, 255, 255, 0.6)', fontSize: '0.9rem', margin: '0.75rem 0 0 0' }}>
            Active verified shoppers exploring the marketplace.
          </p>
        </div>

        {/* 2. SHOPS CARD (APPROVED vs PENDING) */}
        <div 
          className="glass-panel"
          style={{
            padding: '2.2rem',
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 0, 110, 0.25)',
            background: 'linear-gradient(135deg, rgba(255, 0, 110, 0.06) 0%, rgba(18, 14, 28, 0.9) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255, 0, 110, 0.15)', borderRadius: '16px', color: 'var(--accent-color)' }}>
              <Store size={32} />
            </div>
            <button 
              onClick={() => navigate('/dashboard/admin/shops')}
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', borderRadius: '20px', borderColor: 'rgba(255, 0, 110, 0.4)', color: 'var(--accent-color)' }}
            >
              Manage Shops <ArrowRight size={14} />
            </button>
          </div>

          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Registered Shops
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Approved Shops Tile */}
            <div 
              onClick={() => navigate('/dashboard/admin/shops?status=approved')}
              style={{
                background: 'rgba(0, 245, 212, 0.08)',
                border: '1px solid rgba(0, 245, 212, 0.25)',
                padding: '1rem',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 245, 212, 0.16)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 245, 212, 0.08)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00f5d4', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={14} /> Approved
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                {stats?.approvedShops ?? 0}
              </div>
            </div>

            {/* Pending Shops Tile */}
            <div 
              onClick={() => navigate('/dashboard/admin/shops?status=pending')}
              style={{
                background: 'rgba(254, 228, 64, 0.08)',
                border: '1px solid rgba(254, 228, 64, 0.25)',
                padding: '1rem',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(254, 228, 64, 0.16)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(254, 228, 64, 0.08)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fee440', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                <Clock size={14} /> Pending
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                {stats?.pendingShops ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* 3. ADMINS CARD (APPROVED vs PENDING) */}
        <div 
          className="glass-panel"
          style={{
            padding: '2.2rem',
            borderRadius: '20px',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(123, 44, 191, 0.35)',
            background: 'linear-gradient(135deg, rgba(123, 44, 191, 0.08) 0%, rgba(18, 14, 28, 0.9) 100%)'
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(123, 44, 191, 0.2)', borderRadius: '16px', color: 'var(--primary-hover)' }}>
              <ShieldCheck size={32} />
            </div>
            <button 
              onClick={() => navigate('/dashboard/admin/admins')}
              className="btn btn-outline" 
              style={{ padding: '0.4rem 0.85rem', fontSize: '0.85rem', borderRadius: '20px', borderColor: 'rgba(123, 44, 191, 0.5)', color: 'var(--primary-hover)' }}
            >
              Manage Admins <ArrowRight size={14} />
            </button>
          </div>

          <h3 style={{ margin: '0 0 1rem 0', fontSize: '1.15rem', color: 'var(--text-secondary)', fontWeight: '500' }}>
            Platform Admins
          </h3>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem' }}>
            {/* Approved Admins Tile */}
            <div 
              onClick={() => navigate('/dashboard/admin/admins?status=approved')}
              style={{
                background: 'rgba(0, 245, 212, 0.08)',
                border: '1px solid rgba(0, 245, 212, 0.25)',
                padding: '1rem',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(0, 245, 212, 0.16)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(0, 245, 212, 0.08)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#00f5d4', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                <CheckCircle2 size={14} /> Approved
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                {stats?.approvedAdmins ?? 0}
              </div>
            </div>

            {/* Pending Admins Tile */}
            <div 
              onClick={() => navigate('/dashboard/admin/admins?status=pending')}
              style={{
                background: 'rgba(254, 228, 64, 0.08)',
                border: '1px solid rgba(254, 228, 64, 0.25)',
                padding: '1rem',
                borderRadius: '14px',
                cursor: 'pointer',
                transition: 'all 0.2s ease'
              }}
              onMouseOver={(e) => e.currentTarget.style.background = 'rgba(254, 228, 64, 0.16)'}
              onMouseOut={(e) => e.currentTarget.style.background = 'rgba(254, 228, 64, 0.08)'}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '0.4rem', color: '#fee440', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                <Clock size={14} /> Pending
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                {stats?.pendingAdmins ?? 0}
              </div>
            </div>
          </div>
        </div>

        {/* 4. FLAGGED LISTINGS CARD */}
        <div 
          className="glass-panel"
          onClick={() => navigate('/dashboard/admin/listings')}
          style={{
            padding: '2.2rem',
            borderRadius: '20px',
            cursor: 'pointer',
            transition: 'all 0.3s cubic-bezier(0.4, 0, 0.2, 1)',
            position: 'relative',
            overflow: 'hidden',
            border: '1px solid rgba(255, 107, 107, 0.25)',
            background: 'linear-gradient(135deg, rgba(255, 107, 107, 0.06) 0%, rgba(18, 14, 28, 0.9) 100%)'
          }}
          onMouseOver={(e) => {
            e.currentTarget.style.transform = 'translateY(-6px)';
            e.currentTarget.style.boxShadow = '0 15px 35px rgba(255, 107, 107, 0.2)';
            e.currentTarget.style.borderColor = '#ff6b6b';
          }}
          onMouseOut={(e) => {
            e.currentTarget.style.transform = 'translateY(0)';
            e.currentTarget.style.boxShadow = 'none';
            e.currentTarget.style.borderColor = 'rgba(255, 107, 107, 0.25)';
          }}
        >
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '1.5rem' }}>
            <div style={{ padding: '1rem', background: 'rgba(255, 107, 107, 0.15)', borderRadius: '16px', color: '#ff6b6b' }}>
              <ShieldAlert size={32} />
            </div>
            <span style={{ 
              display: 'inline-flex', 
              alignItems: 'center', 
              gap: '0.4rem', 
              fontSize: '0.85rem', 
              fontWeight: '600', 
              color: '#ff6b6b',
              background: 'rgba(255, 107, 107, 0.1)',
              padding: '0.35rem 0.85rem',
              borderRadius: '20px'
            }}>
              Review <ArrowRight size={14} />
            </span>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '1rem', marginTop: '1rem' }}>
            <div style={{
              background: 'rgba(255, 107, 107, 0.1)',
              border: '1px solid rgba(255, 107, 107, 0.25)',
              padding: '1rem',
              borderRadius: '14px'
            }}>
              <div style={{ color: '#ff6b6b', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Flagged / Review
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                {stats?.flaggedListings ?? 0}
              </div>
            </div>

            <div style={{
              background: 'rgba(254, 228, 64, 0.1)',
              border: '1px solid rgba(254, 228, 64, 0.25)',
              padding: '1rem',
              borderRadius: '14px'
            }}>
              <div style={{ color: '#fee440', fontSize: '0.8rem', fontWeight: '600', marginBottom: '0.25rem' }}>
                Pending AI Check
              </div>
              <div style={{ fontSize: '2rem', fontWeight: '800', color: '#fff' }}>
                {stats?.pendingChecks ?? 0}
              </div>
            </div>
          </div>
        </div>

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
