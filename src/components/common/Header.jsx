import React, { useState, useRef, useEffect } from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  ChevronDown,
  ChevronRight,
  X,
  LogOut,
  Globe,
  Sparkles,
  Lightbulb,
  Truck,
  Heart,
  Phone,
  Layers,
  Gem,
  Crown
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import './Header.css';

export default function Header({ searchOpen, setSearchOpen }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [mobileCollOpen, setMobileCollOpen] = useState(true);

  const dropdownRef = useRef(null);
  const closeTimeoutRef = useRef(null);
  const location = useLocation();

  const { user, logoutCustomer } = useAuth();
  const { cartCount } = useCart();
  const { lang, toggleLang, t } = useLanguage();

  const handleLogout = () => {
    logoutCustomer();
    setMobileMenuOpen(false);
  };

  const handleDropdownEnter = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setCollectionsOpen(true);
  };

  const handleDropdownLeave = () => {
    if (closeTimeoutRef.current) {
      clearTimeout(closeTimeoutRef.current);
      closeTimeoutRef.current = null;
    }
    setCollectionsOpen(false);
  };

  // Close dropdowns when clicking outside
  useEffect(() => {
    const handleClickOutside = (e) => {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
        setCollectionsOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    };
  }, []);

  // Close menus on route change
  useEffect(() => {
    setCollectionsOpen(false);
    setMobileMenuOpen(false);
  }, [location.pathname]);

  // Lock body scroll when mobile drawer is open
  useEffect(() => {
    if (mobileMenuOpen) {
      document.body.style.overflow = 'hidden';
    } else {
      document.body.style.overflow = '';
    }
    return () => {
      document.body.style.overflow = '';
    };
  }, [mobileMenuOpen]);

  const collectionSubMenus = [
    {
      title: t('nav_all_jewellery', 'All Jewellery'),
      path: '/shop',
      tag: 'ALL',
      icon: Gem
    },
    {
      title: t('nav_signature_collections', 'Signature Collections'),
      path: '/category/Signature',
      tag: 'HOT',
      icon: Crown
    },
    {
      title: t('nav_handmade_collections', 'Handmade Collections'),
      path: '/category/Pearl',
      tag: 'PEARL',
      icon: Sparkles
    },
    {
      title: t('nav_traditional_collections', 'Traditional Collections'),
      path: '/category/Traditional',
      tag: 'HERITAGE',
      icon: Layers
    },
    {
      title: t('nav_bridal_collections', 'Bridal Collections'),
      path: '/category/Nath',
      tag: 'BRIDAL',
      icon: Sparkles
    },
    {
      title: t('nav_accessories_collections', 'Accessories'),
      path: '/category/Accessories',
      tag: 'NEW',
      icon: Gem
    }
  ];

  const isCollectionActive = location.pathname.startsWith('/category') || location.pathname === '/shop';

  return (
    <>
      <header className="header">
        {/* Mobile Hamburger Toggle Button (Shown on mobile/tablet) */}
        <button
          className="headerMobileMenuBtn"
          aria-label="Open Navigation Menu"
          onClick={() => setMobileMenuOpen(true)}
        >
          <Menu size={24} />
        </button>

        {/* Brand Logo & Name */}
        <Link to="/" className="brand" aria-label="Nathshikha Handmade Jewellery">
          <img className="brand-logo" src="/assets/nathshikha-logo.png" alt="Nathshikha logo" />
          <div className="brandText">
            <b>NATHSHIKHA</b>
            <small>{t('brand_sub', 'HANDMADE JEWELLERY')}</small>
          </div>
        </Link>

        {/* Desktop Main Navigation Bar */}
        <nav className="desktopNav" aria-label="Main Navigation">
          {/* 1. Our Collections Dropdown */}
          <div
            className={`navItem ${collectionsOpen ? 'menuOpen' : ''} ${isCollectionActive ? 'currentActive' : ''}`}
            ref={dropdownRef}
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className="navTriggerBtn"
              type="button"
              onClick={() => setCollectionsOpen((prev) => !prev)}
              aria-expanded={collectionsOpen}
            >
              <span>{t('nav_our_collections', 'Our Collections')}</span>
              <ChevronDown
                size={14}
                className={`navChevron ${collectionsOpen ? 'chevronOpen' : ''}`}
              />
            </button>

            {/* Submenu Dropdown Popover */}
            {collectionsOpen && (
              <div
                className="navDropdown"
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                <div className="navDropdownInner">
                  <div className="dropdownHeader">
                    <span className="dropdownHeaderTitle">
                      <Sparkles size={13} color="#d4af37" />
                      {t('nav_our_collections', 'Handcrafted Collections')}
                    </span>
                    <Link
                      to="/shop"
                      className="viewAllCatalogLink"
                      onClick={() => setCollectionsOpen(false)}
                    >
                      {t('view_all_pieces', 'View All')} →
                    </Link>
                  </div>

                  <div className="dropdownGrid">
                    {collectionSubMenus.map((sub) => {
                      const IconComponent = sub.icon;
                      const isItemActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`dropdownItem ${isItemActive ? 'activeItem' : ''}`}
                          onClick={() => setCollectionsOpen(false)}
                        >
                          <div className="itemIconWrap">
                            <IconComponent size={15} />
                          </div>
                          <div className="itemTextWrap">
                            <span className="itemTitle">{sub.title}</span>
                          </div>
                          {sub.tag && <span className="itemBadge">{sub.tag}</span>}
                          <ChevronRight size={13} className="itemArrow" />
                        </Link>
                      );
                    })}
                  </div>
                </div>
              </div>
            )}
          </div>

          {/* 2. Hall of Fame */}
          <Link
            to="/hall-of-fame"
            className={`navLink ${location.pathname === '/hall-of-fame' ? 'currentActive' : ''}`}
          >
            <span>{t('nav_hall_of_fame', 'Hall of Fame')}</span>
          </Link>

          {/* 3. Suggestions */}
          <Link
            to="/suggestion"
            className={`navLink ${location.pathname === '/suggestion' ? 'currentActive' : ''}`}
          >
            <span>{t('nav_suggestions', 'Suggestions')}</span>
          </Link>

          {/* 4. About Us */}
          <Link
            to="/about"
            className={`navLink ${location.pathname === '/about' ? 'currentActive' : ''}`}
          >
            <span>{t('nav_about', 'About Us')}</span>
          </Link>

          {/* 5. Contact Us */}
          <Link
            to="/contact"
            className={`navLink ${location.pathname === '/contact' ? 'currentActive' : ''}`}
          >
            <span>{t('nav_contact', 'Contact Us')}</span>
          </Link>

          {/* 6. Track Order */}
          <Link
            to="/orders"
            className={`navLink ${location.pathname === '/orders' ? 'currentActive' : ''}`}
          >
            <span>{t('nav_track_order', 'Track Order')}</span>
          </Link>
        </nav>

        {/* Right-Side Header Actions */}
        <div className="actions">
          {/* Language Toggle */}
          <button
            className="langBtn"
            type="button"
            onClick={toggleLang}
            title={lang === 'en' ? 'मराठी मध्ये पहा' : 'View in English'}
            aria-label="Switch Language"
          >
            <Globe size={13} />
            <span className={lang === 'en' ? 'active' : 'dim'}>EN</span>
            <span className="langSep">/</span>
            <span className={lang === 'mr' ? 'active' : 'dim'}>मराठी</span>
          </button>

          {/* Search Icon */}
          <button
            className={`iconBtn ${searchOpen ? 'active' : ''}`}
            aria-label="Search catalogue"
            onClick={() => setSearchOpen(!searchOpen)}
            title="Search"
          >
            <Search size={19} />
          </button>

          {/* Cart Icon */}
          <Link
            className="iconBtn cartIconWrap"
            to="/cart"
            aria-label="Shopping bag"
            title="View Cart"
          >
            <ShoppingBag size={19} />
            {cartCount > 0 && <span className="cartBadge" key={cartCount}>{cartCount}</span>}
          </Link>

          {/* Profile / Account Icon */}
          <Link
            className="iconBtn accountBtn"
            to={user ? '/account' : '/login'}
            aria-label={t('nav_account', 'Profile')}
            title={user ? user.name : t('nav_account', 'Profile')}
          >
            <User size={19} />
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <div className="mobileMenuWrapper">
          {/* Dimmed backdrop */}
          <div
            className="mobileMenuBackdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />

          {/* Side Drawer Container */}
          <aside className="mobileDrawer" aria-label="Mobile Navigation Drawer">
            {/* Drawer Header */}
            <div className="drawerHeader">
              <Link
                to="/"
                className="drawerBrand"
                onClick={() => setMobileMenuOpen(false)}
              >
                <img className="drawerLogo" src="/assets/nathshikha-logo.png" alt="Nathshikha logo" />
                <div className="drawerBrandText">
                  <b>NATHSHIKHA</b>
                  <small>{t('brand_sub', 'HANDMADE JEWELLERY')}</small>
                </div>
              </Link>
              <button
                className="drawerCloseBtn"
                onClick={() => setMobileMenuOpen(false)}
                aria-label="Close menu"
              >
                <X size={20} />
              </button>
            </div>

            {/* Language Switcher Bar */}
            <div className="drawerLangBar">
              <span className="langLabel">Language / भाषा</span>
              <button
                className="drawerLangToggle"
                type="button"
                onClick={toggleLang}
              >
                <Globe size={13} />
                <span className={lang === 'en' ? 'activeLang' : ''}>English</span>
                <span style={{ opacity: 0.4 }}>|</span>
                <span className={lang === 'mr' ? 'activeLang' : ''}>मराठी</span>
              </button>
            </div>

            {/* Navigation Links List */}
            <div className="drawerNavList">
              {/* 1. Our Collections Accordion */}
              <div className="drawerAccordionGroup">
                <button
                  className="drawerAccordionTrigger"
                  type="button"
                  onClick={() => setMobileCollOpen(!mobileCollOpen)}
                  aria-expanded={mobileCollOpen}
                >
                  <div className="accordionTriggerTitle">
                    <Sparkles size={16} color="var(--gold)" />
                    <span>{t('nav_our_collections', 'Our Collections')}</span>
                  </div>
                  <ChevronDown
                    size={16}
                    className={`accordionChevron ${mobileCollOpen ? 'isOpen' : ''}`}
                  />
                </button>

                {mobileCollOpen && (
                  <div className="drawerSubMenuList">
                    {collectionSubMenus.map((sub) => {
                      const IconComp = sub.icon;
                      const isItemActive = location.pathname === sub.path;
                      return (
                        <Link
                          key={sub.path}
                          to={sub.path}
                          className={`drawerSubItem ${isItemActive ? 'active' : ''}`}
                          onClick={() => setMobileMenuOpen(false)}
                        >
                          <div className="subItemLeft">
                            <IconComp size={14} className="subItemIcon" />
                            <span>{sub.title}</span>
                          </div>
                          {sub.tag && <span className="drawerSubBadge">{sub.tag}</span>}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>

              {/* 2. Hall of Fame */}
              <Link
                className={`drawerNavLink ${location.pathname === '/hall-of-fame' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                to="/hall-of-fame"
              >
                <div className="drawerNavLeft">
                  <Heart size={16} color="var(--gold)" />
                  <span>{t('nav_hall_of_fame', 'Hall of Fame')}</span>
                </div>
                <ChevronRight size={14} className="drawerNavArrow" />
              </Link>

              {/* 3. Suggestions */}
              <Link
                className={`drawerNavLink ${location.pathname === '/suggestion' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                to="/suggestion"
              >
                <div className="drawerNavLeft">
                  <Lightbulb size={16} color="var(--gold)" />
                  <span>{t('nav_suggestions', 'Suggestions')}</span>
                </div>
                <ChevronRight size={14} className="drawerNavArrow" />
              </Link>

              {/* 4. Track Order */}
              <Link
                className={`drawerNavLink ${location.pathname === '/orders' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                to="/orders"
              >
                <div className="drawerNavLeft">
                  <Truck size={16} color="var(--gold)" />
                  <span>{t('nav_track_order', 'Track Order')}</span>
                </div>
                <ChevronRight size={14} className="drawerNavArrow" />
              </Link>

              {/* 5. About Us */}
              <Link
                className={`drawerNavLink ${location.pathname === '/about' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                to="/about"
              >
                <div className="drawerNavLeft">
                  <Gem size={16} color="var(--gold)" />
                  <span>{t('nav_about', 'About Us')}</span>
                </div>
                <ChevronRight size={14} className="drawerNavArrow" />
              </Link>

              {/* 6. Contact Us */}
              <Link
                className={`drawerNavLink ${location.pathname === '/contact' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                to="/contact"
              >
                <div className="drawerNavLeft">
                  <Phone size={16} color="var(--gold)" />
                  <span>{t('nav_contact', 'Contact Us')}</span>
                </div>
                <ChevronRight size={14} className="drawerNavArrow" />
              </Link>

              {/* 7. Profile */}
              <Link
                className={`drawerNavLink ${location.pathname === '/account' || location.pathname === '/login' ? 'active' : ''}`}
                onClick={() => setMobileMenuOpen(false)}
                to={user ? '/account' : '/login'}
              >
                <div className="drawerNavLeft">
                  <User size={16} color="var(--gold)" />
                  <span>{user ? user.name : t('nav_account', 'Profile')}</span>
                </div>
                <ChevronRight size={14} className="drawerNavArrow" />
              </Link>
            </div>

            {/* Drawer Footer */}
            <div className="drawerFooter">
              {user ? (
                <button className="drawerLogoutBtn" onClick={handleLogout}>
                  <LogOut size={16} />
                  <span>{t('nav_logout', 'Logout')}</span>
                </button>
              ) : (
                <Link
                  to="/login"
                  className="drawerLoginBtn"
                  onClick={() => setMobileMenuOpen(false)}
                >
                  <User size={15} />
                  <span>{t('nav_login', 'Login / Register')}</span>
                </Link>
              )}

              <a
                href="https://wa.me/919322268482?text=Hello%20Nathshikha%2C%20I%20need%20assistance%20with%20jewellery"
                target="_blank"
                rel="noopener noreferrer"
                className="drawerSupportLink"
              >
                <Phone size={14} />
                <span>WhatsApp Artisan Support</span>
              </a>
            </div>
          </aside>
        </div>
      )}
    </>
  );
}
