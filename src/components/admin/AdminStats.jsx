import React from 'react';
import {
  Package,
  ShieldAlert,
  CheckCircle2,
  Truck,
  IndianRupee,
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
  const inProductionTotal = confirmedOrdersCount + makingOrdersCount + packingOrdersCount;
  const actionRequiredTotal = paymentVerificationCount + cancellationRequestsCount;

  return (
    <div className="adminKpiSection">
      {/* 4-Card Executive KPI Matrix */}
      <div className="adminKpiGrid">
        {/* 1. Gross Revenue Card */}
        <div className="kpiCard kpiRevenueCard">
          <div className="kpiCardTop">
            <span className="kpiLabel">Gross Revenue</span>
            <div className="kpiIconBadge kpiIconGold">
              <IndianRupee size={16} />
            </div>
          </div>
          <div className="kpiValueRow">
            <b className="kpiMainValue">{money(totalRevenue)}</b>
            <span className="kpiSubBadge">Lifetime Sales</span>
          </div>
          <div className="kpiCardFooter">
            <span>Avg. Order Value: <b>{totalOrders > 0 ? money(Math.round(totalRevenue / totalOrders)) : '₹0'}</b></span>
          </div>
        </div>

        {/* 2. Total Orders Card */}
        <div
          className="kpiCard kpiOrdersCard"
          onClick={() => onCardClick && onCardClick('all')}
          role="button"
          tabIndex={0}
        >
          <div className="kpiCardTop">
            <span className="kpiLabel">All Orders</span>
            <div className="kpiIconBadge kpiIconBlue">
              <Package size={16} />
            </div>
          </div>
          <div className="kpiValueRow">
            <b className="kpiMainValue">{totalOrders}</b>
            <span className="kpiActionLink">View All Orders →</span>
          </div>
          <div className="kpiCardFooter">
            <span>Fulfilled / Delivered: <b>{deliveredOrdersCount}</b></span>
          </div>
        </div>

        {/* 3. Action Required Card (Pending Verifications + Cancellations) */}
        <div
          className={`kpiCard kpiActionCard ${actionRequiredTotal > 0 ? 'kpiCardUrgent' : ''}`}
          onClick={() => {
            if (onCardClick) {
              if (cancellationRequestsCount > 0) {
                onCardClick('cancellation_requested');
              } else if (paymentVerificationCount > 0) {
                onCardClick('verification_pending');
              } else {
                onCardClick('all');
              }
            }
          }}
          role="button"
          tabIndex={0}
        >
          <div className="kpiCardTop">
            <span className="kpiLabel">Action Required</span>
            <div className={`kpiIconBadge ${actionRequiredTotal > 0 ? 'kpiIconRed' : 'kpiIconGreen'}`}>
              {actionRequiredTotal > 0 ? <AlertTriangle size={16} /> : <CheckCircle2 size={16} />}
            </div>
          </div>
          <div className="kpiValueRow">
            <b className={`kpiMainValue ${actionRequiredTotal > 0 ? 'kpiAlertText' : 'kpiSuccessText'}`}>
              {actionRequiredTotal}
            </b>
            <span className={`kpiStatusPill ${actionRequiredTotal > 0 ? 'pillUrgent' : 'pillClear'}`}>
              {actionRequiredTotal > 0 ? 'Needs Review' : 'All Clear'}
            </span>
          </div>
          <div className="kpiCardFooter">
            <div className="kpiSplitActionNotes">
              <span>Verify: <b>{paymentVerificationCount}</b></span>
              <span>·</span>
              <span>Cancels: <b>{cancellationRequestsCount}</b></span>
            </div>
          </div>
        </div>

        {/* 4. Production & Fulfillment Pipeline Card */}
        <div
          className="kpiCard kpiProductionCard"
          onClick={() => onCardClick && onCardClick('making')}
          role="button"
          tabIndex={0}
        >
          <div className="kpiCardTop">
            <span className="kpiLabel">Active Production</span>
            <div className="kpiIconBadge kpiIconPurple">
              <Sparkles size={16} />
            </div>
          </div>
          <div className="kpiValueRow">
            <b className="kpiMainValue">{inProductionTotal}</b>
            <span className="kpiSubBadge">In Workshop</span>
          </div>
          <div className="kpiCardFooter">
            <div className="kpiFunnelChips">
              <span
                className="funnelChip"
                title="Filter Confirmed Orders"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick && onCardClick('confirmed');
                }}
              >
                <b>{confirmedOrdersCount}</b> Confirmed
              </span>
              <span className="funnelArrow">›</span>
              <span
                className="funnelChip"
                title="Filter Crafting Orders"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick && onCardClick('making');
                }}
              >
                <b>{makingOrdersCount}</b> Crafting
              </span>
              <span className="funnelArrow">›</span>
              <span
                className="funnelChip"
                title="Filter QC & Packed Orders"
                onClick={(e) => {
                  e.stopPropagation();
                  onCardClick && onCardClick('packing');
                }}
              >
                <b>{packingOrdersCount}</b> Packed
              </span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
