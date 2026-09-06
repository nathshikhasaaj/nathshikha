import React from 'react';
import {
  Menu,
  RefreshCw,
  Plus,
  ExternalLink,
  ShieldCheck,
  Sparkles
} from 'lucide-react';

const TAB_TITLES = {
  control_center: {
    category: 'Overview',
    title: 'Operations Dashboard',
    description: 'Executive KPI metrics, attention queue & fulfillment pipeline'
  },
  orders: {
    category: 'Sales & Fulfillment',
    title: 'Order Management',
    description: 'Track orders, verify UPI payments, update status & manage cancellations'
  },
  shipments: {
    category: 'Sales & Fulfillment',
    title: 'Shipment Logistics',
    description: 'Courier tracking, AWB assignments & dispatch tracking'
  },
  products: {
    category: 'Catalog Management',
    title: 'Products Catalogue',
    description: 'Add new handcrafted jewelry, edit prices, upload photos & set bestsellers'
  },
  parameters: {
    category: 'Catalog Management',
    title: 'Parameter Library',
    description: 'Custom jewelry parameters, clip types, plating finishes & gemstone colors'
  },
  coupons: {
    category: 'Marketing & Offers',
    title: 'Coupons & Discounts',
    description: 'Create promotional voucher codes, percentage discounts & expiry dates'
  },
  reviews: {
    category: 'Reviews & Content',
    title: 'Customer Reviews',
    description: 'Moderate customer testimonials, photo reviews & star ratings'
  },
  showcase_reviews: {
    category: 'Reviews & Content',
    title: 'Homepage Showcase & Google Reviews',
    description: 'Curate customer spotlight quotes displayed across the storefront'
  },
  hall_of_fame: {
    category: 'Reviews & Content',
    title: 'Hall of Fame / Our Brides',
    description: 'Real bridal jewelry stories, high-res wedding photos & spotlight features'
  },
  hero_showcase: {
    category: 'Reviews & Content',
    title: 'Hero Showcase Banners',
    description: 'Manage homepage top promotional slides, mobile banners & CTA links'
  },
  suggestions: {
    category: 'Reviews & Content',
    title: 'Customer Design Suggestions',
    description: 'Bespoke design ideas, custom jewelry requests & customer feedback'
  }
};

export default function AdminHeader({
  activeTab,
  onOpenMobileSidebar,
  onOpenCreateOrder,
  onRefresh,
  refreshing = false
}) {
  const currentTabInfo = TAB_TITLES[activeTab] || {
    category: 'Administration',
    title: 'Studio Dashboard',
    description: 'Operational control panel'
  };

  return (
    <header className="adminTopHeader">
      <div className="headerLeftWrap">
        {/* Mobile Hamburger Drawer Trigger */}
        <button
          type="button"
          className="mobileMenuToggleBtn"
          onClick={onOpenMobileSidebar}
          aria-label="Open Navigation Menu"
          title="Open Menu"
        >
          <Menu size={20} />
        </button>

        {/* Current Location Breadcrumbs */}
        <div className="headerBreadcrumbs">
          <span className="breadcrumbGroup">{currentTabInfo.category}</span>
          <h1 className="breadcrumbTitle">{currentTabInfo.title}</h1>
        </div>
      </div>

      {/* Right Quick Actions */}
      <div className="headerRightActions">
        <div className="systemStatusPill" title="Backend API & Database operational">
          <span className="statusDotPulse" />
          <span>Live Studio</span>
        </div>

        {/* Primary "+ Create Order" Action */}
        <button
          type="button"
          className="topHeaderBtn primaryGold"
          onClick={onOpenCreateOrder}
          title="Create a new customer order manually"
        >
          <Plus size={15} />
          <span>+ Create Order</span>
        </button>

        {/* Refresh Action */}
        <button
          type="button"
          className="topHeaderBtn secondaryOutline"
          onClick={onRefresh}
          disabled={refreshing}
          title="Sync latest orders and catalog data from server"
        >
          <RefreshCw className={refreshing ? 'spinAnimation' : ''} size={14} />
          <span>{refreshing ? 'Syncing…' : 'Refresh'}</span>
        </button>
      </div>
    </header>
  );
}
