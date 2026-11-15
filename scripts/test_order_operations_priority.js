/**
 * ============================================================================
 * AUTOMATED TEST SUITE: ORDER OPERATIONS & PRIORITY ENGINE
 * Tests the 12 core operational scenarios, terminal invariants, SLA escalations,
 * and parity between server-side service and client-side engine.
 * ============================================================================
 */

import { calculateOrderPriority as serverCalculate, categorizeOrders as serverCategorize, PRIORITY_LEVELS as SERVER_LEVELS } from '../server/services/orderPriorityService.js';
import { calculateOrderPriority as clientCalculate, categorizeOrders as clientCategorize, PRIORITY_LEVELS as CLIENT_LEVELS } from '../src/utils/orderPriorityEngine.js';

let passed = 0;
let failed = 0;

function assert(condition, message) {
  if (condition) {
    console.log(`  ✓ PASS: ${message}`);
    passed++;
  } else {
    console.error(`  ✗ FAIL: ${message}`);
    failed++;
  }
}

console.log('\n===============================================================');
console.log('NATHSHIKHA ORDER MANAGEMENT & PRIORITY ENGINE TEST SUITE');
console.log('===============================================================\n');

const now = Date.now();
const DAY = 24 * 60 * 60 * 1000;

// Scenario 1: Delivered order > 15 days (Placed 40 days ago, delivered 25 days ago)
console.log('Scenario 1: Delivered order > 15 days');
const deliveredOrder = {
  id: 'ORD-DEL-01',
  order_no: 'ORD-DEL-01',
  order_status: 'delivered',
  payment_status: 'paid',
  created_at: new Date(now - 40 * DAY).toISOString(),
  confirmed_at: new Date(now - 35 * DAY).toISOString(),
  delivered_at: new Date(now - 25 * DAY).toISOString()
};
const p1Server = serverCalculate(deliveredOrder);
const p1Client = clientCalculate(deliveredOrder);
assert(p1Server.level === SERVER_LEVELS.NO_ACTION, 'Server: Priority is NO_ACTION');
assert(p1Client.level === CLIENT_LEVELS.NO_ACTION, 'Client: Priority is NO_ACTION');
assert(p1Server.isNeedsAttention === false, 'Server: Must NOT be in Needs Attention');
assert(p1Client.isNeedsAttention === false, 'Client: Must NOT be in Needs Attention');
assert(p1Server.isUrgentOrCritical === false, 'Server: Must NOT be Urgent or Critical');
assert(p1Server.primaryQueue === 'delivered', 'Server: Queue is delivered');

// Scenario 2: Cancelled order > 15 days (Placed 30 days ago, cancelled 20 days ago)
console.log('\nScenario 2: Cancelled order > 15 days');
const cancelledOrder = {
  id: 'ORD-CAN-02',
  order_status: 'cancelled',
  cancellation_status: 'cancellation_approved',
  created_at: new Date(now - 30 * DAY).toISOString()
};
const p2Server = serverCalculate(cancelledOrder);
const p2Client = clientCalculate(cancelledOrder);
assert(p2Server.level === SERVER_LEVELS.NO_ACTION, 'Server: Cancelled priority is NO_ACTION');
assert(p2Server.isNeedsAttention === false, 'Server: Cancelled order not in Needs Attention');
assert(p2Server.isUrgentOrCritical === false, 'Server: Cancelled order not Urgent or Critical');
assert(p2Server.primaryQueue === 'cancelled', 'Server: Queue is cancelled');

// Scenario 3: Confirmed order > 15 days and not shipped (Active production delay)
console.log('\nScenario 3: Confirmed order > 15 days not shipped');
const confirmedDelayedOrder = {
  id: 'ORD-CONF-03',
  order_status: 'confirmed',
  payment_status: 'paid',
  created_at: new Date(now - 18 * DAY).toISOString(),
  confirmed_at: new Date(now - 17 * DAY).toISOString()
};
const p3Server = serverCalculate(confirmedDelayedOrder);
assert(p3Server.level === SERVER_LEVELS.HIGH, 'Server: Confirmed > 15 days escalates to HIGH priority');
assert(p3Server.isUrgentOrCritical === true, 'Server: Must be flagged Urgent or Critical');
assert(p3Server.isNeedsAttention === true, 'Server: Must be in Needs Attention');
assert(p3Server.nextAction.key === 'start_making', 'Server: Next action is Start Crafting');

// Scenario 4: Making order > 15 days
console.log('\nScenario 4: Making order > 15 days in production');
const makingDelayedOrder = {
  id: 'ORD-MAK-04',
  order_status: 'making',
  payment_status: 'paid',
  created_at: new Date(now - 16 * DAY).toISOString(),
  confirmed_at: new Date(now - 16 * DAY).toISOString()
};
const p4Server = serverCalculate(makingDelayedOrder);
assert(p4Server.level === SERVER_LEVELS.HIGH, 'Server: Making > 15 days escalates to HIGH priority');
assert(p4Server.primaryQueue === 'in_production', 'Server: Queue is in_production');
assert(p4Server.nextAction.key === 'start_packing', 'Server: Next action is QC & Packaging');

// Scenario 5: Packing order > 15 days
console.log('\nScenario 5: Packing order > 15 days');
const packingDelayedOrder = {
  id: 'ORD-PAC-05',
  order_status: 'packing',
  payment_status: 'paid',
  created_at: new Date(now - 16 * DAY).toISOString(),
  confirmed_at: new Date(now - 16 * DAY).toISOString()
};
const p5Server = serverCalculate(packingDelayedOrder);
assert(p5Server.level === SERVER_LEVELS.HIGH, 'Server: Packing > 15 days escalates to HIGH priority');
assert(p5Server.primaryQueue === 'ready_to_ship', 'Server: Queue is ready_to_ship');
assert(p5Server.nextAction.key === 'ship_order', 'Server: Next action is Dispatch & Track');

// Scenario 6: Shipped order > 15 days (Dispatched normally, not a production delay)
console.log('\nScenario 6: Shipped order > 15 days (Not a production delay)');
const shippedOrder = {
  id: 'ORD-SHIP-06',
  order_status: 'shipped',
  payment_status: 'paid',
  created_at: new Date(now - 16 * DAY).toISOString(),
  confirmed_at: new Date(now - 15 * DAY).toISOString(),
  status_timestamps: { shippedAt: new Date(now - 2 * DAY).toISOString() },
  expected_delivery_date: new Date(now + 3 * DAY).toISOString()
};
const p6Server = serverCalculate(shippedOrder);
assert(p6Server.level === SERVER_LEVELS.NORMAL, 'Server: Shipped order within SLA is NORMAL priority (not delayed production)');
assert(p6Server.primaryQueue === 'shipped', 'Server: Queue is shipped');
assert(p6Server.nextAction.key === 'track_shipment', 'Server: Next action is Monitor Tracking');

// Scenario 7: Payment verification pending
console.log('\nScenario 7: Payment verification pending');
const paymentPendingOrder = {
  id: 'ORD-PAY-07',
  order_status: 'placed',
  payment_status: 'verification_pending',
  created_at: new Date(now - 1 * DAY).toISOString()
};
const p7Server = serverCalculate(paymentPendingOrder);
assert(p7Server.primaryQueue === 'payment_pending', 'Server: Queue is payment_pending');
assert(p7Server.nextAction.key === 'verify_payment', 'Server: Next action is Verify Payment');
assert(p7Server.isNeedsAttention === true, 'Server: Needs Attention is true');

// Scenario 8: Recently confirmed order
console.log('\nScenario 8: Recently confirmed order');
const recentConfirmedOrder = {
  id: 'ORD-REC-08',
  order_status: 'confirmed',
  payment_status: 'paid',
  created_at: new Date(now - 1 * DAY).toISOString(),
  confirmed_at: new Date(now - 1 * DAY).toISOString()
};
const p8Server = serverCalculate(recentConfirmedOrder);
assert(p8Server.level === SERVER_LEVELS.NORMAL, 'Server: Recent order is NORMAL priority');
assert(p8Server.primaryQueue === 'to_process', 'Server: Queue is to_process');
assert(p8Server.nextAction.key === 'start_making', 'Server: Next action is Start Crafting');

// Scenario 9: Overdue order (past expected delivery date)
console.log('\nScenario 9: Overdue order past delivery SLA');
const overdueOrder = {
  id: 'ORD-OVD-09',
  order_status: 'making',
  payment_status: 'paid',
  created_at: new Date(now - 22 * DAY).toISOString(),
  confirmed_at: new Date(now - 22 * DAY).toISOString(),
  expected_delivery_date: new Date(now - 4 * DAY).toISOString()
};
const p9Server = serverCalculate(overdueOrder);
assert(p9Server.level === SERVER_LEVELS.CRITICAL, 'Server: Overdue past SLA >= 3 days or >= 20 days age escalates to CRITICAL');
assert(p9Server.isOverdue === true, 'Server: isOverdue is true');
assert(p9Server.daysOverdue >= 4, 'Server: daysOverdue calculated accurately');

// Scenario 10: Manually prioritized active order
console.log('\nScenario 10: Manually prioritized active order');
const manualActiveOrder = {
  id: 'ORD-MAN-10',
  order_status: 'making',
  payment_status: 'paid',
  created_at: new Date(now - 3 * DAY).toISOString(),
  manual_priority: {
    level: 'critical',
    note: 'VIP customer wedding gift - rush required'
  }
};
const p10Server = serverCalculate(manualActiveOrder);
assert(p10Server.level === SERVER_LEVELS.CRITICAL, 'Server: Manual level CRITICAL is respected');
assert(p10Server.isManualApplied === true, 'Server: isManualApplied is true');
assert(p10Server.reason === 'VIP customer wedding gift - rush required', 'Server: Custom operational note displayed as reason');

// Scenario 11: Delivered order with old manual priority
console.log('\nScenario 11: Delivered order with old manual priority');
const deliveredWithManualOrder = {
  id: 'ORD-DEL-MAN-11',
  order_status: 'delivered',
  payment_status: 'paid',
  created_at: new Date(now - 30 * DAY).toISOString(),
  manual_priority: {
    level: 'critical',
    note: 'Old critical rush order'
  }
};
const p11Server = serverCalculate(deliveredWithManualOrder);
assert(p11Server.level === SERVER_LEVELS.NO_ACTION, 'Server: Delivered status overrides old manual priority to NO_ACTION');
assert(p11Server.isUrgentOrCritical === false, 'Server: Delivered order cannot be Urgent or Critical');
assert(p11Server.isNeedsAttention === false, 'Server: Delivered order cannot be in Needs Attention');

// Scenario 12: Custom orders have same lifecycle & priority rules
console.log('\nScenario 12: Custom orders lifecycle parity');
const customDelayedOrder = {
  id: 'ORD-CUST-12',
  order_type: 'custom',
  order_status: 'making',
  payment_status: 'paid',
  created_at: new Date(now - 17 * DAY).toISOString(),
  confirmed_at: new Date(now - 17 * DAY).toISOString(),
  custom_items: [
    {
      custom_design_name: 'Custom Kantha Saree',
      unit_price: 4500,
      quantity: 1,
      total_price: 4500
    }
  ]
};
const p12Server = serverCalculate(customDelayedOrder);
assert(p12Server.level === SERVER_LEVELS.HIGH, 'Server: Custom order in production > 15 days is HIGH priority');
assert(p12Server.primaryQueue === 'in_production', 'Server: Custom order queue is in_production');
assert(p12Server.nextAction.key === 'start_packing', 'Server: Custom order next action is QC & Packaging');

// Scenario 13: Parity between Server and Client Engine
console.log('\nScenario 13: Full Server and Client Engine Parity');
const testOrders = [
  deliveredOrder,
  cancelledOrder,
  confirmedDelayedOrder,
  makingDelayedOrder,
  packingDelayedOrder,
  shippedOrder,
  paymentPendingOrder,
  recentConfirmedOrder,
  overdueOrder,
  manualActiveOrder,
  deliveredWithManualOrder,
  customDelayedOrder
];

testOrders.forEach((ord, index) => {
  const sRes = serverCalculate(ord);
  const cRes = clientCalculate(ord);
  assert(sRes.level === cRes.level, `Order ${index + 1} (${ord.id}): Server and Client levels match (${sRes.level})`);
  assert(sRes.primaryQueue === cRes.primaryQueue, `Order ${index + 1} (${ord.id}): Server and Client queues match (${sRes.primaryQueue})`);
  assert(sRes.nextAction.key === cRes.nextAction.key, `Order ${index + 1} (${ord.id}): Next action keys match (${sRes.nextAction.key})`);
});

// Scenario 14: Queue Categorization & Aggregation Integrity
console.log('\nScenario 14: Queue Categorization & Aggregation Integrity');
const serverGroup = serverCategorize(testOrders);
const clientGroup = clientCategorize(testOrders);

assert(serverGroup.counts.total === 12, 'Categorize: Total orders is 12');
assert(serverGroup.counts.delivered === 2, 'Categorize: Delivered orders count is 2 (del-01, del-man-11)');
assert(serverGroup.counts.cancelled === 1, 'Categorize: Cancelled orders count is 1');
assert(serverGroup.counts.paymentPending === 1, 'Categorize: Payment pending count is 1');
assert(serverGroup.counts.toProcess === 2, 'Categorize: To process count is 2 (conf-03, rec-08)');
assert(serverGroup.counts.inProduction === 4, 'Categorize: In production count is 4 (mak-04, ovd-09, man-10, cust-12)');
assert(serverGroup.counts.readyToShip === 1, 'Categorize: Ready to ship count is 1 (pac-05)');
assert(serverGroup.counts.shipped === 1, 'Categorize: Shipped count is 1 (ship-06)');

// Invariant: Delivered orders MUST NOT bleed into Critical or Needs Attention
const deliveredInNeedsAttn = serverGroup.processedOrders.filter(o => o._priorityMeta.isNeedsAttention && o.order_status === 'delivered');
assert(deliveredInNeedsAttn.length === 0, 'Invariant: ZERO delivered orders in Needs Attention queue');

const deliveredInUrgent = serverGroup.processedOrders.filter(o => o._priorityMeta.isUrgentOrCritical && o.order_status === 'delivered');
assert(deliveredInUrgent.length === 0, 'Invariant: ZERO delivered orders in Urgent/Critical queue');

// Check counts match between server and client
assert(serverGroup.counts.total === clientGroup.counts.total, 'Categorize parity: total count matches');
assert(serverGroup.counts.needsAttention === clientGroup.counts.needsAttention, 'Categorize parity: needsAttention count matches');
assert(serverGroup.counts.critical === clientGroup.counts.critical, 'Categorize parity: critical count matches');
assert(serverGroup.counts.high === clientGroup.counts.high, 'Categorize parity: high count matches');
assert(serverGroup.counts.delivered === clientGroup.counts.delivered, 'Categorize parity: delivered count matches');

console.log('\n===============================================================');
console.log(`TEST SUMMARY: ${passed} PASSED, ${failed} FAILED`);
console.log('===============================================================\n');

if (failed > 0) {
  process.exit(1);
} else {
  process.exit(0);
}
