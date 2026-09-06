import React from 'react';
import { Link } from 'react-router-dom';
import {
  LayoutDashboard,
  ShoppingBag,
  Truck,
  Box,
  SlidersHorizontal,
  Tag,
  Star,
  MessageSquareQuote,
  Camera,
  Sparkles,
  Lightbulb,
  ExternalLink,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ShieldCheck,
  X
} from 'lucide-react';

export default function AdminSidebar({
  activeTab,
  setActiveTab,
  collapsed,
  setCollapsed,
  mobileOpen,
  setMobileOpen,
  analytics = {},
  productsCount = 0,
  couponsCount = 0,
  reviewsCount = 0,
  suggestionsCount = 0,
  adminUser,
  onLogout
}) {
  const handleItemClick = (tabId) => {
    setActiveTab(tabId);
    if (mobileOpen) {
      setMobileOpen(false);
    }
  };

  const navGroups = [
    {
      title: 'Overview',
      items: [
        {
          id: 'control_center',
          label: 'Dashboard',
          icon: LayoutDashboard,
          badge: analytics.paymentVerificationCount > 0 ? (
            <span className="navBadge alertBadge" title={`${analytics.paymentVerificationCount} pending payment verification`}>
              {analytics.paymentVerificationCount}
            </span>
          ) : null
        }
      ]
    },
    {
      title: 'Sales & Fulfillment',
      items: [
        {
          id: 'orders',
          label: 'Orders',
          icon: ShoppingBag,
          badge: (analytics.paymentVerificationCount > 0 || analytics.cancellationRequestsCount > 0) ? (
            <span className="navBadge dangerBadge" title="Action required on orders">
              {analytics.paymentVerificationCount + analytics.cancellationRequestsCount}
            </span>
          ) : (analytics.totalOrders > 0 ? (
            <span className="navBadge">{analytics.totalOrders}</span>
          ) : null)
        },
        {
          id: 'shipments',
          label: 'Shipments',
          icon: Truck
        }
      ]
    },
    {
      title: 'Catalog Management',
      items: [
        {
          id: 'products',
          label: 'Products Catalogue',
          icon: Box,
          badge: productsCount > 0 ? <span className="navBadge">{productsCount}</span> : null
        },
        {
          id: 'parameters',
          label: 'Parameter Library',
          icon: SlidersHorizontal
        }
      ]
    },
    {
      title: 'Marketing & Offers',
      items: [
        {
          id: 'coupons',
          label: 'Coupons & Offers',
          icon: Tag,
          badge: analytics.activeCouponsCount > 0 ? (
            <span className="navBadge goldBadge" title={`${analytics.activeCouponsCount} active coupons`}>
              {analytics.activeCouponsCount} Active
            </span>
          ) : null
        }
      ]
    },
    {
      title: 'Reviews & Content',
      items: [
        {
          id: 'reviews',
          label: 'Customer Reviews',
          icon: Star,
          badge: reviewsCount > 0 ? <span className="navBadge">{reviewsCount}</span> : null
        },
        {
          id: 'showcase_reviews',
          label: 'Homepage Showcase',
          icon: MessageSquareQuote
        },
        {
          id: 'hall_of_fame',
          label: 'Hall of Fame / Brides',
          icon: Camera
        },
        {
          id: 'hero_showcase',
          label: 'Hero Banners',
          icon: Sparkles
        },
        {
          id: 'suggestions',
          label: 'Design Suggestions',
          icon: Lightbulb,
          badge: suggestionsCount > 0 ? <span className="navBadge goldBadge">{suggestionsCount}</span> : null
        }
      ]
    }
  ];

  return (
    <>
      {/* Mobile Drawer Overlay */}
      <div
        className={`sidebarDrawerOverlay ${mobileOpen ? 'active' : ''}`}
        onClick={() => setMobileOpen(false)}
        aria-hidden="true"
      />

      <aside className={`adminSidebar ${collapsed ? 'collapsed' : ''} ${mobileOpen ? 'mobileOpen' : ''}`}>
        {/* Brand Header */}
        <div className="sidebarBrand">
          <div className="brandLogoWrap">
            <div className="brandEmblem">N</div>
            {!collapsed && (
              <div className="brandText">
                <span className="brandName">NATHSHIKHA</span>
                <span className="brandTagline">STUDIO ADMIN</span>
              </div>
            )}
          </div>

          {/* Desktop Collapse Button */}
          <button
            type="button"
            className="sidebarToggleBtn"
            onClick={() => setCollapsed(!collapsed)}
            title={collapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            aria-label="Toggle Sidebar"
          >
            {collapsed ? <ChevronRight size={16} /> : <ChevronLeft size={16} />}
          </button>
        </div>

        {/* Navigation Links Scroll Area */}
        <nav className="sidebarNav" aria-label="Admin Navigation Menu">
          {navGroups.map((group, gIdx) => (
            <div key={gIdx} className="navGroup">
              {!collapsed && <span className="navGroupTitle">{group.title}</span>}
              {collapsed && <span className="navGroupTitle">···</span>}
              {group.items.map((item) => {
                const Icon = item.icon;
                const isActive = activeTab === item.id;
                return (
                  <button
                    key={item.id}
                    type="button"
                    className={`navItem ${isActive ? 'active' : ''}`}
                    onClick={() => handleItemClick(item.id)}
                    title={collapsed ? item.label : undefined}
                  >
                    <span className="navItemIcon">
                      <Icon size={18} />
                    </span>
                    {!collapsed && <span className="navItemLabel">{item.label}</span>}
                    {!collapsed && item.badge}
                  </button>
                );
              })}
            </div>
          ))}
        </nav>

        {/* User Account & Actions Footer */}
        <div className="sidebarFooter">
          {!collapsed && (
            <div className="adminUserChip">
              <div className="userAvatar">
                {(adminUser?.name || 'A').charAt(0).toUpperCase()}
              </div>
              <div className="userInfo">
                <span className="userName">{adminUser?.name || 'Studio Admin'}</span>
                <span className="userRole">{adminUser?.email || 'admin@nathshikha.com'}</span>
              </div>
            </div>
          )}

          <div className="sidebarActionRow">
            <Link
              to="/"
              target="_blank"
              rel="noopener noreferrer"
              className="storefrontBtn"
              title="Open storefront in a new tab"
            >
              <ExternalLink size={14} />
              {!collapsed && <span>Storefront</span>}
            </Link>

            <button
              type="button"
              className="logoutBtn"
              onClick={onLogout}
              title="Sign out of Admin Dashboard"
            >
              <LogOut size={14} />
              {!collapsed && <span>Logout</span>}
            </button>
          </div>
        </div>
      </aside>
    </>
  );
}
