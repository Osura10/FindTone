import React, { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { apiCall } from '../services/api';

const Dashboard = () => {
  const [data, setData] = useState(null);
  const [error, setError] = useState('');
  const [loading, setLoading] = useState(true);
  const navigate = useNavigate();

  useEffect(() => {
    const fetchDashboard = async () => {
      const role = localStorage.getItem('role');
      if (!role) {
        navigate('/login');
        return;
      }

      try {
        const response = await apiCall(`/dashboard/${role}`);
        setData(response);
      } catch (err) {
        setError(err.message || 'Failed to fetch dashboard data');
      } finally {
        setLoading(false);
      }
    };

    fetchDashboard();
  }, [navigate]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    localStorage.removeItem('role');
    navigate('/login');
  };

  if (loading) return <div className="container mt-5 text-center"><h2>Loading...</h2></div>;

  if (error) {
    return (
      <div className="container mt-5 text-center">
        <h2 style={{ color: 'red' }}>Error</h2>
        <p>{error}</p>
        <button className="btn btn-primary" onClick={handleLogout}>Back to Login</button>
      </div>
    );
  }

  return (
    <div style={{ minHeight: '100vh', display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', backgroundColor: '#f0f2f5' }}>
      <div style={{ backgroundColor: 'white', padding: '3rem', borderRadius: '1rem', boxShadow: '0 10px 25px rgba(0,0,0,0.1)', textAlign: 'center', maxWidth: '600px', width: '100%' }}>
        <h1 style={{ color: '#2c3e50', marginBottom: '1rem', textTransform: 'capitalize' }}>{data?.role} Dashboard</h1>
        <div style={{ backgroundColor: '#e8f4fd', padding: '2rem', borderRadius: '0.5rem', marginBottom: '2rem' }}>
          <h2 style={{ color: '#0984e3', margin: 0, fontWeight: '500' }}>{data?.message}</h2>
        </div>
        <button 
          onClick={handleLogout}
          style={{ padding: '0.75rem 2rem', backgroundColor: '#e74c3c', color: 'white', border: 'none', borderRadius: '0.5rem', cursor: 'pointer', fontSize: '1rem', fontWeight: '600', transition: 'background-color 0.2s' }}
          onMouseOver={(e) => e.target.style.backgroundColor = '#c0392b'}
          onMouseOut={(e) => e.target.style.backgroundColor = '#e74c3c'}
        >
          Logout
        </button>
      </div>
    </div>
  );
};

export default Dashboard;
