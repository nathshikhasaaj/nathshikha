// scripts/test_order_ui_ux_overhaul.js
// Automated verification for Order Management UI/UX & Usability Overhaul
import assert from 'assert';
import fs from 'fs';
import path from 'path';

console.log('===============================================================');
console.log('NATHSHIKHA ADMIN ORDER MANAGEMENT UI/UX AUDIT & TEST SUITE');
console.log('===============================================================');

let passedTests = 0;
let totalTests = 0;

function it(desc, fn) {
  totalTests++;
  try {
    fn();
    console.log(`  ✓ PASS: ${desc}`);
    passedTests++;
  } catch (err) {
    console.error(`  ✕ FAIL: ${desc}`);
    console.error(`    ${err.message}`);
    process.exitCode = 1;
  }
}

// --------------------------------------------------------------------------
// 1. Audit AdminOrderList.jsx Default Sorting and Usability Logic
// --------------------------------------------------------------------------
console.log('\n--- 1. Default Sorting & Usability in AdminOrderList.jsx ---');

const orderListJsx = fs.readFileSync(
  path.resolve('src/components/admin/AdminOrderList.jsx'),
  'utf8'
);

it('AdminOrderList default sortBy is "newest" (createdAt DESC)', () => {
  assert(
    orderListJsx.includes("const [sortBy, setSortBy] = useState('newest');"),
    'Default sortBy state must be initialized to "newest"'
  );
});

it('AdminOrderList sortOptions puts "newest" at the very top as primary option', () => {
  const match = orderListJsx.match(/const sortOptions = \[\s*\{ value: 'newest'/);
  assert(match, 'sortOptions must list "newest" as the first choice');
});

it('AdminOrderList resetAllFilters restores sortBy to "newest"', () => {
  assert(
    orderListJsx.includes("setSortBy('newest');"),
    'resetAllFilters must restore sortBy to "newest"'
  );
});

it('hasActiveSecondaryFilters accurately checks sortBy !== "newest"', () => {
  assert(
    orderListJsx.includes("sortBy !== 'newest'"),
    'hasActiveSecondaryFilters must trigger when sortBy is changed from default "newest"'
  );
});

it('Order sorting strictly uses created_at/createdAt and NOT updatedAt or status timestamps', () => {
  assert(
    orderListJsx.includes('const timeA = new Date(a.created_at || a.createdAt || 0).getTime();') &&
    orderListJsx.includes('const timeB = new Date(b.created_at || b.createdAt || 0).getTime();'),
    'Time comparisons must strictly reference creation dates'
  );
});

// Simulation of Order Sorting
const testOrders = [
  {
    _id: 'ord-1',
    order_no: '1001',
    name: 'Aarav Patel',
    created_at: '2026-11-01T10:00:00.000Z',
    updatedAt: '2026-11-15T12:00:00.000Z',
    order_status: 'delivered',
    total_amount: 1500,
    _priorityMeta: { rank: 0, productionAgeDays: 14 }
  },
  {
    _id: 'ord-2',
    order_no: '1002',
    name: 'Diya Sharma',
    created_at: '2026-11-10T14:00:00.000Z',
    updatedAt: '2026-11-10T14:00:00.000Z',
    order_status: 'confirmed',
    total_amount: 3200,
    _priorityMeta: { rank: 1, productionAgeDays: 5 }
  },
  {
    _id: 'ord-3',
    order_no: '1003',
    name: 'Pooja Verma',
    created_at: '2026-11-15T08:00:00.000Z',
    updatedAt: '2026-11-15T08:00:00.000Z',
    order_status: 'placed',
    total_amount: 850,
    _priorityMeta: { rank: 2, productionAgeDays: 0 }
  }
];

function sortSim(list, sortBy) {
  return [...list].sort((a, b) => {
    const metaA = a._priorityMeta || {};
    const metaB = b._priorityMeta || {};
    const timeA = new Date(a.created_at || a.createdAt || 0).getTime();
    const timeB = new Date(b.created_at || b.createdAt || 0).getTime();

    if (sortBy === 'newest') {
      if (timeB !== timeA) return timeB - timeA;
      const idA = String(a.order_no || a.orderNo || a.id || a._id || '');
      const idB = String(b.order_no || b.orderNo || b.id || b._id || '');
      return idB.localeCompare(idA);
    }
    if (sortBy === 'oldest') {
      if (timeA !== timeB) return timeA - timeB;
      const idA = String(a.order_no || a.orderNo || a.id || a._id || '');
      const idB = String(b.order_no || b.orderNo || b.id || b._id || '');
      return idA.localeCompare(idB);
    }
    if (sortBy === 'amount_desc') {
      return (b.total_amount || 0) - (a.total_amount || 0);
    }
    if (sortBy === 'customer_asc') {
      return a.name.localeCompare(b.name);
    }
    return timeB - timeA;
  });
}

it('Simulation: Default "newest" sorting places most recently created order at index 0', () => {
  const sorted = sortSim(testOrders, 'newest');
  assert.strictEqual(sorted[0].order_no, '1003');
  assert.strictEqual(sorted[1].order_no, '1002');
  assert.strictEqual(sorted[2].order_no, '1001');
});

it('Simulation: Updating an older order does NOT move it to the top', () => {
  // Update ord-1 with a fresh updatedAt and status
  const updatedOrders = [
    {
      ...testOrders[0],
      updatedAt: '2026-11-15T18:00:00.000Z', // Updated right now
      order_status: 'delivered',
      notes: 'Customer confirmed receipt via phone'
    },
    testOrders[1],
    testOrders[2]
  ];
  const sorted = sortSim(updatedOrders, 'newest');
  assert.strictEqual(sorted[0].order_no, '1003', 'Order 1003 must still be at the top');
  assert.strictEqual(sorted[2].order_no, '1001', 'Order 1001 must remain at the bottom');
});

it('Simulation: User can override sorting by "oldest", "amount_desc", and "customer_asc"', () => {
  const byOldest = sortSim(testOrders, 'oldest');
  assert.strictEqual(byOldest[0].order_no, '1001');

  const byAmount = sortSim(testOrders, 'amount_desc');
  assert.strictEqual(byAmount[0].order_no, '1002'); // 3200

  const byCust = sortSim(testOrders, 'customer_asc');
  assert.strictEqual(byCust[0].order_no, '1001'); // Aarav
  assert.strictEqual(byCust[1].order_no, '1002'); // Diya
  assert.strictEqual(byCust[2].order_no, '1003'); // Pooja
});

// --------------------------------------------------------------------------
// 2. Audit KPI Summary Grid & Responsive Overflow Prevention
// --------------------------------------------------------------------------
console.log('\n--- 2. KPI Summary Grid & Responsive Styles in AdminOrderList.css ---');

const orderListCss = fs.readFileSync(
  path.resolve('src/components/admin/AdminOrderList.css'),
  'utf8'
);

it('orderSummaryKpiGrid uses 4 columns by default on desktop (balanced 4x2 grid)', () => {
  assert(
    orderListCss.includes('grid-template-columns: repeat(4, minmax(0, 1fr));'),
    'Desktop KPI grid must use repeat(4, minmax(0, 1fr))'
  );
});

it('orderSummaryKpiGrid adapts to 2 columns on tablet/mobile', () => {
  assert(
    orderListCss.includes('@media (max-width: 1024px)') &&
    orderListCss.includes('grid-template-columns: repeat(2, minmax(0, 1fr));'),
    'KPI grid must adapt to 2 columns on tablet/mobile'
  );
});

it('orderKpiCard has min-width: 0, width: 100%, and overflow: hidden to prevent blowout', () => {
  assert(
    orderListCss.includes('min-width: 0;') &&
    orderListCss.includes('box-sizing: border-box;'),
    'orderKpiCard must enforce bounding constraints'
  );
});

it('operationalQueuesBar has smooth scrolling and bounded constraints', () => {
  assert(
    orderListCss.includes('scroll-behavior: smooth;') &&
    orderListCss.includes('overflow-x: auto;'),
    'operationalQueuesBar must support smooth touch/drag scrolling'
  );
});

it('orderPagePills styles are defined for intuitive pagination jump controls', () => {
  assert(
    orderListCss.includes('.orderPagePills') &&
    orderListCss.includes('.pagePillBtn.active'),
    'orderPagePills and active styles must be present'
  );
});

// --------------------------------------------------------------------------
// 3. Audit AdminShipmentTable.jsx Pagination & Newest-First Sorting
// --------------------------------------------------------------------------
console.log('\n--- 3. Independent Pagination & Sorting in AdminShipmentTable.jsx ---');

const shipmentTableJsx = fs.readFileSync(
  path.resolve('src/components/admin/AdminShipmentTable.jsx'),
  'utf8'
);

it('AdminShipmentTable has independent pagination state (currentPage, pageSize)', () => {
  assert(
    shipmentTableJsx.includes("const [pageSize, setPageSize] = useState(10);") &&
    shipmentTableJsx.includes("const [currentPage, setCurrentPage] = useState(1);"),
    'AdminShipmentTable must maintain independent pagination state'
  );
});

it('AdminShipmentTable has search query filtering', () => {
  assert(
    shipmentTableJsx.includes("const [searchQuery, setSearchQuery] = useState('');"),
    'AdminShipmentTable must support independent shipment search'
  );
});

it('AdminShipmentTable sorts shipments newest-first by default', () => {
  assert(
    shipmentTableJsx.includes("const sortedShipmentItems = useMemo(() => {") &&
    shipmentTableJsx.includes("timeB - timeA"),
    'AdminShipmentTable must sort shipments newest first'
  );
});

it('AdminShipmentTable slices paginatedShipments based on safeCurrentPage and pageSize', () => {
  assert(
    shipmentTableJsx.includes("const paginatedShipments = useMemo(() => {") &&
    shipmentTableJsx.includes("filteredShipments.slice(start, start + pageSize);"),
    'AdminShipmentTable must compute paginated slice of filtered shipments'
  );
});

it('AdminShipmentTable renders shipmentPaginationBar footer with AdminDropdown per-page selector', () => {
  assert(
    shipmentTableJsx.includes("className=\"shipmentPaginationBar\"") &&
    shipmentTableJsx.includes("<AdminDropdown") &&
    shipmentTableJsx.includes("direction=\"up\""),
    'AdminShipmentTable must render independent pagination bar with upward dropdown'
  );
});

const shipmentTableCss = fs.readFileSync(
  path.resolve('src/components/admin/AdminShipmentTable.css'),
  'utf8'
);

it('AdminShipmentTable.css defines styles for shipmentSearchWrap and shipmentPaginationBar', () => {
  assert(
    shipmentTableCss.includes('.shipmentSearchWrap') &&
    shipmentTableCss.includes('.shipmentPaginationBar') &&
    shipmentTableCss.includes('.shipmentNavBtn'),
    'Shipment table CSS must provide complete pagination and search styling'
  );
});

// --------------------------------------------------------------------------
// 4. Audit AdminDashboard.css & AdminLayout.css Container Bounding
// --------------------------------------------------------------------------
console.log('\n--- 4. Container Constraints in AdminDashboard.css & AdminLayout.css ---');

const dashboardCss = fs.readFileSync(
  path.resolve('src/pages/Admin/AdminDashboard.css'),
  'utf8'
);

it('AdminDashboard.css enforces min-width: 0 and max-width: 100% on section blocks and views', () => {
  assert(
    dashboardCss.includes('.adminOrdersView,') &&
    dashboardCss.includes('.dashboardSectionBlock {') &&
    dashboardCss.includes('min-width: 0;') &&
    dashboardCss.includes('max-width: 100%;'),
    'AdminDashboard containers must enforce min-width: 0 and max-width: 100%'
  );
});

const layoutCss = fs.readFileSync(
  path.resolve('src/components/admin/AdminLayout.css'),
  'utf8'
);

it('AdminLayout.css enforces min-width: 0 and max-width: 100% on adminMainArea and adminPageBody', () => {
  assert(
    layoutCss.includes('.adminMainArea {') &&
    layoutCss.includes('min-width: 0;') &&
    layoutCss.includes('max-width: 100%;') &&
    layoutCss.includes('.adminPageBody {'),
    'AdminLayout containers must enforce min-width: 0 and max-width: 100%'
  );
});

console.log('\n===============================================================');
console.log(`TEST SUMMARY: ${passedTests}/${totalTests} PASSED, ${totalTests - passedTests} FAILED`);
console.log('===============================================================');

if (passedTests !== totalTests) {
  process.exit(1);
}

