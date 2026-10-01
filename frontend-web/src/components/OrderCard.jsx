import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Phone, CreditCard, Banknote, MessageSquareQuote } from 'lucide-react';
import { Badge, PriceTag } from './ui';

const orderNo = (id) => `#${id.toString().padStart(6, '0')}`;
const date = (iso) => new Date(iso).toLocaleDateString('en-LK', { day: 'numeric', month: 'short', year: 'numeric' });

/**
 * One order. mode="buyer" (My Orders) shows delivery status; mode="seller" (My Sales) shows
 * payment details and the buyer's address + phone for shipping.
 */
const OrderCard = ({ order, mode = 'buyer' }) => {
  const paid = order.status === 'PAID';
  const seller = mode === 'seller';
  return (
    <article className="card order-card">
      <header className="order-head">
        <dl className="order-meta">
          <div><dt>{seller ? 'Sold on' : 'Ordered on'}</dt><dd>{date(order.createdAt)}</dd></div>
          <div><dt>Order</dt><dd className="mono">{orderNo(order.id)}</dd></div>
          <div className="hide-sm">
            <dt>Payment</dt>
            <dd className="row" style={{ gap: 4 }}>
              {order.paymentMethod === 'CARD'
                ? <><CreditCard size={14} aria-hidden="true" /> Card{order.cardLast4 ? ` •••• ${order.cardLast4}` : ''}</>
                : <><Banknote size={14} aria-hidden="true" /> Cash on delivery</>}
            </dd>
          </div>
        </dl>
        {seller
          ? <Badge variant={paid ? 'success' : 'warning'} dot>{paid ? 'Payment received' : 'COD requested'}</Badge>
          : <Badge variant={paid ? 'success' : 'info'} dot>{paid ? 'Paid' : 'Cash on delivery'}</Badge>}
      </header>

      <div className="order-body">
        <Link to={`/dashboard/listings/${order.listingId}`} className="order-thumb" aria-label={`Open ${order.listingTitle}`}>
          <img src={order.listingImage || 'https://placehold.co/200x200?text=No+Photo'} alt="" />
        </Link>
        <div className="stack-sm grow" style={{ minWidth: 0, gap: 6 }}>
          <Link to={`/dashboard/listings/${order.listingId}`} className="order-title">{order.listingTitle}</Link>
          <PriceTag amount={order.amount} size="md" />
          {!seller && (
            <span className="text-sm muted row" style={{ gap: 6 }}>
              <Truck size={15} aria-hidden="true" /> {paid ? 'Preparing for delivery' : 'Pending COD confirmation'}
            </span>
          )}
        </div>

        <div className="order-address">
          <span className="text-xs muted row" style={{ gap: 6, fontWeight: 650, textTransform: 'uppercase', letterSpacing: '0.04em' }}>
            <Truck size={13} aria-hidden="true" /> {seller ? 'Ship to buyer' : 'Delivery address'}
          </span>
          <strong className="text-sm">{order.fullName}</strong>
          <span className="text-sm muted">{order.addressLine}<br />{order.city} {order.postalCode}</span>
          <span className="text-sm row" style={{ gap: 6 }}>
            <Phone size={13} aria-hidden="true" className="muted" /> {order.phone}
            {seller && <a href={`tel:${order.phone}`} className="text-sm" style={{ marginLeft: 'auto', fontWeight: 600 }}>Call buyer</a>}
          </span>
          {seller && order.notes && (
            <span className="text-xs muted row" style={{ gap: 6, alignItems: 'flex-start', fontStyle: 'italic' }}>
              <MessageSquareQuote size={13} aria-hidden="true" style={{ flexShrink: 0, marginTop: 2 }} /> “{order.notes}”
            </span>
          )}
        </div>
      </div>
    </article>
  );
};

export default OrderCard;
