import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { ShoppingBag, Package } from 'lucide-react';
import { apiCall } from '../../services/api';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton } from '../../components/ui';
import OrderCard from '../../components/OrderCard';

const MyOrders = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchOrders = useCallback(async () => {
    try {
      const data = await apiCall('/orders/mine');
      setOrders(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your orders.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchOrders();
  }, [fetchOrders]);

  return (
    <div className="page page-narrow">
      <PageHeader
        icon={ShoppingBag}
        title="My Orders"
        subtitle={!loading && orders.length > 0 ? `${orders.length} order${orders.length === 1 ? '' : 's'}` : 'Everything you have bought on MusicMarket'}
      />

      {error && <ErrorState compact message={error} onRetry={() => { setLoading(true); fetchOrders(); }} />}

      {loading ? (
        <div className="stack" aria-busy="true" aria-label="Loading orders">
          {[0, 1].map((i) => <Skeleton key={i} height="190px" radius="var(--radius-lg)" />)}
        </div>
      ) : orders.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No orders yet"
            description="You haven't bought anything yet. Browse the marketplace to find great deals on instruments."
            action={<Button onClick={() => navigate('/dashboard/items')}>Browse marketplace</Button>}
          />
        </Card>
      ) : (
        <div className="stack">
          {orders.map((order) => <OrderCard key={order.id} order={order} mode="buyer" />)}
        </div>
      )}
    </div>
  );
};

export default MyOrders;
