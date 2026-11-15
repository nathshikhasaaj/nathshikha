/**
 * ============================================================================
 * INTELLIGENT ORDER PRIORITY & OPERATIONS ENGINE
 * Enterprise Order Lifecycle, Dynamic Aging, Delay Detection, and SLA Tracking
 * ============================================================================
 */

import { getOrderAgeInDays } from './formatters.js';

export const PRIORITY_LEVELS = {
  CRITICAL: 'CRITICAL',
  HIGH: 'HIGH',
  MEDIUM: 'MEDIUM',
  NORMAL: 'NORMAL',
  NO_ACTION: 'NO_ACTION'
};

export const PRIORITY_RANKS = {
  CRITICAL: 4,
  HIGH: 3,
  MEDIUM: 2,
  NORMAL: 1,
  NO_ACTION: 0
};

/**
 * Calculate dynamic order priority, delay metrics, and next operational action.
 * Pure deterministic function based on actual order status, timestamps, and business SLAs.
 * 
 * Invariants:
 * 1. Delivered orders MUST NEVER appear in Urgent, Critical, or Pending Action sections.
 * 2. Cancelled orders must never be flagged as delayed or urgent.
 * 3. Shipped orders are not production delays merely because age > 15 days.
 * 4. Manual priority cannot override terminal states (Delivered, Cancelled).
 * 
 * @param {Object} order - Full order object
 * @returns {Object} Priority metadata & operational diagnostics
 */
export function calculateOrderPriority(order) {
  if (!order) {
    return {
      level: PRIORITY_LEVELS.NORMAL,
      label: 'Normal',
      rank: PRIORITY_RANKS.NORMAL,
      reason: 'No order data',
      badgeClass: 'priorityNormal',
      nextAction: { label: 'None', key: 'none', variant: 'default' },
      isTerminal: false,
      isNeedsAttention: false,
      queue: 'all'
    };
  }

  // 1. Status Normalization
  const orderStatus = String(order.order_status || order.orderStatus || 'placed').toLowerCase();
  const paymentStatus = String(order.payment_status || order.paymentStatus || 'pending').toLowerCase();
  const cancellationStatus = String(order.cancellation_status || order.cancellationStatus || 'no_cancellation').toLowerCase();

  const isDelivered = orderStatus === 'delivered';
  const isCancelled =
    orderStatus === 'cancelled' ||
    cancellationStatus === 'cancellation_approved' ||
    cancellationStatus === 'refund' ||
    Boolean(order.isDeleted || order.is_deleted);

  const isTerminal = isDelivered || isCancelled;

  // 2. Timeline and Aging Calculations
  const createdAt = order.created_at || order.createdAt || null;
  const verifiedAt = order.verified_at || order.verifiedAt || null;
  const confirmedAt =
    order.confirmed_at ||
    order.confirmedAt ||
    (orderStatus === 'confirmed' || paymentStatus === 'verified' || paymentStatus === 'paid'
      ? (verifiedAt || createdAt)
      : null);

  const expectedDeliveryDate =
    order.expected_delivery_date ||
    order.expectedDeliveryDate ||
    (confirmedAt ? new Date(new Date(confirmedAt).getTime() + 20 * 24 * 60 * 60 * 1000).toISOString() : null);

  const orderAgeDays = getOrderAgeInDays(createdAt);
  const productionAgeDays = confirmedAt ? getOrderAgeInDays(confirmedAt) : orderAgeDays;

  // Expected Delivery SLA tracking
  let isOverdue = false;
  let daysOverdue = 0;
  let daysRemaining = null;

  if (expectedDeliveryDate) {
    const targetMs = new Date(expectedDeliveryDate).getTime();
    if (!isNaN(targetMs)) {
      const diffMs = targetMs - Date.now();
      daysRemaining = Math.ceil(diffMs / (1000 * 60 * 60 * 24));
      if (daysRemaining < 0) {
        isOverdue = true;
        daysOverdue = Math.abs(daysRemaining);
      }
    }
  }

  // Stage flags
  const isCancellationRequested = cancellationStatus === 'cancellation_requested';
  const isPaymentPending =
    !isTerminal &&
    (paymentStatus === 'verification_pending' ||
      paymentStatus === 'pending' ||
      orderStatus === 'verification_pending' ||
      orderStatus === 'payment_pending');

  const isMaking = orderStatus === 'making';
  const isPacking = orderStatus === 'packing' || orderStatus === 'processing';
  const isShipped = orderStatus === 'shipped';

  // Manual priority inspection (only for active non-terminal orders)
  const manual = order.manualPriority || order.manual_priority || {};
  const manualLevel = String(manual.level || '').toLowerCase();
  const manualNote = manual.note || null;
  const hasManualPriority = !isTerminal && ['critical', 'high', 'medium', 'normal'].includes(manualLevel);

  // 3. PRIORITY LEVEL DERIVATION
  let level = PRIORITY_LEVELS.NORMAL;
  let label = 'Normal';
  let rank = PRIORITY_RANKS.NORMAL;
  let reason = 'Order progressing on standard fulfillment timeline';
  let badgeClass = 'priorityNormal';
  let isManualApplied = false;

  if (isDelivered) {
    // TERMINAL RULE 1: Delivered orders MUST NEVER appear in Urgent/Critical
    level = PRIORITY_LEVELS.NO_ACTION;
    label = 'Delivered';
    rank = PRIORITY_RANKS.NO_ACTION;
    reason = 'Order completed and delivered to customer';
    badgeClass = 'priorityNoAction';
  } else if (isCancelled) {
    // TERMINAL RULE 2: Cancelled orders are never delayed
    level = PRIORITY_LEVELS.NO_ACTION;
    label = 'Cancelled';
    rank = PRIORITY_RANKS.NO_ACTION;
    reason = 'Order cancelled / archived';
    badgeClass = 'priorityNoAction';
  } else if (isCancellationRequested) {
    // CRITICAL: Cancellation request pending admin review
    level = PRIORITY_LEVELS.CRITICAL;
    label = 'Critical: Cancellation Request';
    rank = PRIORITY_RANKS.CRITICAL;
    reason = 'Customer requested cancellation; review before dispatch';
    badgeClass = 'priorityCritical';
  } else if (hasManualPriority && manualLevel === 'critical') {
    // CRITICAL: Admin manual override
    level = PRIORITY_LEVELS.CRITICAL;
    label = 'Critical (Manual)';
    rank = PRIORITY_RANKS.CRITICAL;
    reason = manualNote || 'Flagged critical by administrator';
    badgeClass = 'priorityCritical';
    isManualApplied = true;
  } else if (!isShipped && (productionAgeDays >= 20 || (isOverdue && daysOverdue >= 3))) {
    // CRITICAL: Active order has reached or breached the 20-day SLA without shipping
    level = PRIORITY_LEVELS.CRITICAL;
    label = 'Critical Delay';
    rank = PRIORITY_RANKS.CRITICAL;
    reason = isOverdue
      ? `Delivery deadline breached by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`
      : `In production for ${productionAgeDays} days (20-day SLA reached)`;
    badgeClass = 'priorityCritical';
  } else if (hasManualPriority && manualLevel === 'high') {
    // HIGH: Admin manual override
    level = PRIORITY_LEVELS.HIGH;
    label = 'High Priority (Manual)';
    rank = PRIORITY_RANKS.HIGH;
    reason = manualNote || 'Flagged high priority by administrator';
    badgeClass = 'priorityHigh';
    isManualApplied = true;
  } else if (!isShipped && productionAgeDays > 15) {
    // HIGH: The 15-day rule (strictly for active unfulfilled orders)
    level = PRIORITY_LEVELS.HIGH;
    label = 'High Priority (15+ Days)';
    rank = PRIORITY_RANKS.HIGH;
    reason = `Order in production for ${productionAgeDays} days; expedite crafting/shipping`;
    badgeClass = 'priorityHigh';
  } else if (!isShipped && isOverdue) {
    // HIGH: Past expected delivery date
    level = PRIORITY_LEVELS.HIGH;
    label = 'Past Delivery SLA';
    rank = PRIORITY_RANKS.HIGH;
    reason = `Delivery deadline exceeded by ${daysOverdue} day${daysOverdue === 1 ? '' : 's'}`;
    badgeClass = 'priorityHigh';
  } else if (isShipped && isOverdue && daysOverdue >= 4) {
    // HIGH: Shipped but courier is late by 4+ days
    level = PRIORITY_LEVELS.HIGH;
    label = 'Courier Transit Delay';
    rank = PRIORITY_RANKS.HIGH;
    reason = `Dispatched but delivery is ${daysOverdue} days late; check tracking`;
    badgeClass = 'priorityHigh';
  } else if (isMaking && productionAgeDays >= 10) {
    // HIGH: Artisan crafting taking unusually long
    level = PRIORITY_LEVELS.HIGH;
    label = 'Crafting Delay';
    rank = PRIORITY_RANKS.HIGH;
    reason = `In artisan crafting for ${productionAgeDays} days`;
    badgeClass = 'priorityHigh';
  } else if (isPacking && productionAgeDays >= 7) {
    // HIGH: Packing/QC taking unusually long
    level = PRIORITY_LEVELS.HIGH;
    label = 'Packaging Delay';
    rank = PRIORITY_RANKS.HIGH;
    reason = `Order packed but not dispatched for several days`;
    badgeClass = 'priorityHigh';
  } else if (hasManualPriority && manualLevel === 'medium') {
    // MEDIUM: Admin manual override
    level = PRIORITY_LEVELS.MEDIUM;
    label = 'Medium (Manual)';
    rank = PRIORITY_RANKS.MEDIUM;
    reason = manualNote || 'Flagged medium priority by administrator';
    badgeClass = 'priorityMedium';
    isManualApplied = true;
  } else if (isPaymentPending) {
    // MEDIUM: Payment awaiting verification
    level = PRIORITY_LEVELS.MEDIUM;
    label = 'Payment Pending';
    rank = PRIORITY_RANKS.MEDIUM;
    reason = 'Awaiting payment verification to confirm order';
    badgeClass = 'priorityMedium';
  } else if (!isShipped && daysRemaining !== null && daysRemaining <= 3 && daysRemaining >= 0) {
    // MEDIUM: Approaching delivery deadline in 1-3 days
    level = PRIORITY_LEVELS.MEDIUM;
    label = `Due in ${daysRemaining} Day${daysRemaining === 1 ? '' : 's'}`;
    rank = PRIORITY_RANKS.MEDIUM;
    reason = `Delivery deadline in ${daysRemaining} day${daysRemaining === 1 ? '' : 's'}`;
    badgeClass = 'priorityMedium';
  } else if (hasManualPriority && manualLevel === 'normal') {
    level = PRIORITY_LEVELS.NORMAL;
    label = 'Normal (Manual)';
    rank = PRIORITY_RANKS.NORMAL;
    reason = manualNote || 'Normal priority';
    badgeClass = 'priorityNormal';
    isManualApplied = true;
  }

  // 4. NEXT ACTION RECOMMENDATION
  let nextAction = { label: 'Completed', key: 'none', variant: 'completed' };

  if (isDelivered) {
    nextAction = { label: 'Delivered ✓', key: 'none', variant: 'completed' };
  } else if (isCancelled) {
    nextAction = { label: 'Cancelled', key: 'none', variant: 'cancelled' };
  } else if (isCancellationRequested) {
    nextAction = { label: 'Review Cancellation', key: 'review_cancellation', variant: 'danger' };
  } else if (isPaymentPending) {
    nextAction = { label: 'Verify Payment', key: 'verify_payment', variant: 'warning' };
  } else if (orderStatus === 'placed') {
    nextAction = { label: 'Confirm Order', key: 'confirm_order', variant: 'info' };
  } else if (orderStatus === 'confirmed') {
    nextAction = { label: 'Start Crafting', key: 'start_making', variant: 'primary' };
  } else if (orderStatus === 'making') {
    nextAction = { label: 'QC & Packaging', key: 'start_packing', variant: 'primary' };
  } else if (orderStatus === 'packing' || orderStatus === 'processing') {
    nextAction = { label: 'Dispatch & Track', key: 'ship_order', variant: 'gold' };
  } else if (orderStatus === 'shipped') {
    nextAction = { label: 'Monitor Tracking', key: 'track_shipment', variant: 'secondary' };
  }

  // 5. OPERATIONAL QUEUE MEMBERSHIP
  let primaryQueue = 'all';
  if (isDelivered) {
    primaryQueue = 'delivered';
  } else if (isCancelled) {
    primaryQueue = 'cancelled';
  } else if (isPaymentPending) {
    primaryQueue = 'payment_pending';
  } else if (orderStatus === 'confirmed') {
    primaryQueue = 'to_process';
  } else if (isMaking) {
    primaryQueue = 'in_production';
  } else if (isPacking) {
    primaryQueue = 'ready_to_ship';
  } else if (isShipped) {
    primaryQueue = 'shipped';
  }

  // Needs Attention criteria: genuine pending operational action required right now
  const isNeedsAttention =
    !isTerminal &&
    (isCancellationRequested ||
      isPaymentPending ||
      level === PRIORITY_LEVELS.CRITICAL ||
      level === PRIORITY_LEVELS.HIGH ||
      isPacking);

  const isUrgentOrCritical =
    !isTerminal && (level === PRIORITY_LEVELS.CRITICAL || level === PRIORITY_LEVELS.HIGH);

  return {
    level,
    label,
    rank,
    reason,
    badgeClass,
    isManualApplied,
    manualNote,
    nextAction,
    isTerminal,
    isDelivered,
    isCancelled,
    isNeedsAttention,
    isUrgentOrCritical,
    isOverdue,
    daysOverdue,
    daysRemaining,
    orderAgeDays,
    productionAgeDays,
    primaryQueue,
    expectedDeliveryDate,
    confirmedAt
  };
}

/**
 * Filter and group an order list into intelligent enterprise queues.
 * Guarantees zero double counting or leakage into incorrect queues.
 * 
 * @param {Array} orders - List of orders
 * @returns {Object} Grouped queue lists and accurate summary counts
 */
export function categorizeOrders(orders = []) {
  const counts = {
    total: orders.length,
    active: 0,
    needsAttention: 0,
    critical: 0,
    high: 0,
    paymentPending: 0,
    toProcess: 0,
    inProduction: 0,
    readyToShip: 0,
    shipped: 0,
    delivered: 0,
    cancelled: 0
  };

  const processedOrders = orders.map((order) => {
    const priorityMeta = calculateOrderPriority(order);
    return {
      ...order,
      _priorityMeta: priorityMeta
    };
  });

  processedOrders.forEach((o) => {
    const meta = o._priorityMeta;

    if (!meta.isTerminal) {
      counts.active++;
    }

    if (meta.isNeedsAttention) {
      counts.needsAttention++;
    }

    if (meta.level === PRIORITY_LEVELS.CRITICAL) {
      counts.critical++;
    } else if (meta.level === PRIORITY_LEVELS.HIGH) {
      counts.high++;
    }

    if (meta.primaryQueue === 'payment_pending') {
      counts.paymentPending++;
    } else if (meta.primaryQueue === 'to_process') {
      counts.toProcess++;
    } else if (meta.primaryQueue === 'in_production') {
      counts.inProduction++;
    } else if (meta.primaryQueue === 'ready_to_ship') {
      counts.readyToShip++;
    } else if (meta.primaryQueue === 'shipped') {
      counts.shipped++;
    } else if (meta.primaryQueue === 'delivered') {
      counts.delivered++;
    } else if (meta.primaryQueue === 'cancelled') {
      counts.cancelled++;
    }
  });

  return {
    processedOrders,
    counts
  };
}
