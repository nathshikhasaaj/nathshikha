import React from 'react';
import {
  Package,
  ShieldAlert,
  CheckCircle2,
  Cpu,
  Truck,
  IndianRupee,
  Tag,
  AlertTriangle,
  Sparkles,
  Box
} from 'lucide-react';
import { money } from '../../utils/formatters';
import './AdminStats.css';

export default function AdminStats({
  totalOrders = 0,
  paymentVerificationCount = 0,
  cancellationRequestsCount = 0,
  confirmedOrdersCount = 0,
  makingOrdersCount = 0,
  packingOrdersCount = 0,
  deliveredOrdersCount = 0,
  totalRevenue = 0,
  activeCouponsCount = 0,
  onCardClick
}) {
  return (
    <div className="adminStatsGrid">
      {/* 1. Total Orders */}
      <div
        className="statCard"
        onClick={() => onCardClick && onCardClick('all')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconBlue">
          <Package size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Total Orders</span>
          <b className="statValue">{totalOrders}</b>
          <small className="statHint">All time</small>
        </div>
      </div>

      {/* 2. Cancellation Requests Pending */}
      <div
        className={`statCard ${
          cancellationRequestsCount > 0 ? 'statCardAlert' : ''
        }`}
        onClick={() => onCardClick && onCardClick('cancellation_requested')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconAmber">
          <AlertTriangle size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Cancellation Requests</span>
          <b className="statValue statValueAlert">{cancellationRequestsCount}</b>
          <small className="statHint">
            {cancellationRequestsCount > 0 ? 'Action required' : 'None pending'}
          </small>
        </div>
      </div>

      {/* 3. Payment Verification Pending */}
      <div
        className={`statCard ${
          paymentVerificationCount > 0 ? 'statCardAlert' : ''
        }`}
        onClick={() => onCardClick && onCardClick('verification_pending')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconMaroon">
          <ShieldAlert size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Verification Pending</span>
          <b className="statValue statValueAlert">{paymentVerificationCount}</b>
          <small className="statHint">
            {paymentVerificationCount > 0 ? 'Action required' : 'All clear'}
          </small>
        </div>
      </div>

      {/* 4. Confirmed Orders */}
      <div
        className="statCard"
        onClick={() => onCardClick && onCardClick('confirmed')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconGreen">
          <CheckCircle2 size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Order Confirmed</span>
          <b className="statValue">{confirmedOrdersCount}</b>
          <small className="statHint">Allocated to queue</small>
        </div>
      </div>

      {/* 5. Making Orders */}
      <div
        className="statCard"
        onClick={() => onCardClick && onCardClick('making')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconGold">
          <Sparkles size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Artisan Crafting</span>
          <b className="statValue">{makingOrdersCount}</b>
          <small className="statHint">In workshop crafting</small>
        </div>
      </div>

      {/* 6. Packing Orders */}
      <div
        className="statCard"
        onClick={() => onCardClick && onCardClick('packing')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconPurple">
          <Box size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">QC & Packaging</span>
          <b className="statValue">{packingOrdersCount}</b>
          <small className="statHint">Quality check & boxed</small>
        </div>
      </div>

      {/* 7. Delivered Orders */}
      <div
        className="statCard"
        onClick={() => onCardClick && onCardClick('delivered')}
        role="button"
        tabIndex={0}
      >
        <div className="statIconWrap iconTeal">
          <Truck size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Delivered</span>
          <b className="statValue">{deliveredOrdersCount}</b>
          <small className="statHint">Fulfilled</small>
        </div>
      </div>

      {/* 8. Total Revenue */}
      <div className="statCard revenueCard">
        <div className="statIconWrap iconGold">
          <IndianRupee size={18} />
        </div>
        <div className="statInfo">
          <span className="statLabel">Total Revenue</span>
          <b className="statValue">{money(totalRevenue)}</b>
          <small className="statHint">Gross order value</small>
        </div>
      </div>
    </div>
  );
}
