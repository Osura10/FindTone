import React, { useCallback, useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Banknote, Package, CreditCard, Receipt } from 'lucide-react';
import { apiCall } from '../../services/api';
import { Button, Card, EmptyState, ErrorState, PageHeader, Skeleton, StatCard, formatLKR } from '../../components/ui';
import OrderCard from '../../components/OrderCard';

const Sales = () => {
  const navigate = useNavigate();
  const [orders, setOrders] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState('');

  const fetchSales = useCallback(async () => {
    try {
      const data = await apiCall('/orders/sales');
      setOrders(Array.isArray(data) ? data : []);
      setError('');
    } catch (err) {
      setError(err.message || 'Could not load your sales.');
    } finally {
      setLoading(false);
    }
  }, []);

  useEffect(() => {
    // eslint-disable-next-line react-hooks/set-state-in-effect
    fetchSales();
  }, [fetchSales]);

  // Summary numbers worked out from the loaded orders.
  const revenue = orders.reduce((sum, o) => sum + (Number(o.amount) || 0), 0);
  const codCount = orders.filter((o) => o.paymentMethod !== 'CARD').length;

  return (
    <div className="page page-narrow">
      <PageHeader icon={Banknote} title="My Sales" subtitle="Orders for your listings, with the buyer's delivery details." />

      {error && <ErrorState compact message={error} onRetry={() => { setLoading(true); fetchSales(); }} />}

      {loading ? (
        <div className="stack" aria-busy="true" aria-label="Loading sales">
          <div className="stat-grid">{[0, 1, 2].map((i) => <Skeleton key={i} height="110px" radius="var(--radius-lg)" />)}</div>
          {[0, 1].map((i) => <Skeleton key={i} height="190px" radius="var(--radius-lg)" />)}
        </div>
      ) : orders.length === 0 && !error ? (
        <Card>
          <EmptyState
            icon={Package}
            title="No sales yet"
            description="When buyers purchase your items, the orders will appear here."
            action={<Button variant="secondary" onClick={() => navigate('/dashboard/items?tab=mine')}>View my listings</Button>}
          />
        </Card>
      ) : (
        <>
          <div className="stat-grid">
            <StatCard label="Total sales" value={formatLKR(revenue)} icon={Banknote} tone="success" />
            <StatCard label="Orders" value={orders.length} icon={Receipt} />
            <StatCard label="Cash on delivery" value={codCount} icon={CreditCard} tone="warning" hint={`${orders.length - codCount} paid by card`} />
          </div>
          <div className="stack">
            {orders.map((order) => <OrderCard key={order.id} order={order} mode="seller" />)}
          </div>
        </>
      )}
    </div>
  );
};

export default Sales;
