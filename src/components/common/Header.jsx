import React, { useState, useRef, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Menu,
  Search,
  ShoppingBag,
  User,
  ChevronDown,
  ChevronRight,
  X,
  LogOut,
  Globe
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useLanguage } from '../../context/LanguageContext';
import './Header.css';

export default function Header({ searchOpen, setSearchOpen }) {
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [collectionsOpen, setCollectionsOpen] = useState(false);
  const [mobileCollOpen, setMobileCollOpen] = useState(false);

  const dropdownRef = useRef(null);
  const closeTimeoutRef = useRef(null);

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
    if (closeTimeoutRef.current) clearTimeout(closeTimeoutRef.current);
    // 250ms buffer so user can comfortably move mouse diagonally into the submenu
    closeTimeoutRef.current = setTimeout(() => {
      setCollectionsOpen(false);
    }, 250);
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

  // Lock body scroll when mobile menu is open
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
    { title: t('nav_all_jewellery', 'All Jewellery'), path: '/shop' },
    { title: t('nav_signature_collections', 'Signature Collections'), path: '/category/Signature' },
    { title: t('nav_handmade_collections', 'Handmade Collections'), path: '/category/Pearl' },
    { title: t('nav_traditional_collections', 'Traditional Collections'), path: '/category/Traditional' },
    { title: t('nav_bridal_collections', 'Bridal Collections'), path: '/category/Nath' },
    { title: t('nav_accessories_collections', 'Accessories'), path: '/category/Accessories' }
  ];

  return (
    <>
      <header className="header">
        <button
          className="icon mobile"
          aria-label="Toggle menu"
          onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
        >
          <Menu />
        </button>

        <Link to="/" className="brand">
          <img className="brand-logo" src="/assets/nathshikha-logo.png" alt="Nathshikha logo" />
          <span>
            <b>NATHSHIKHA</b>
            <small>{t('brand_sub', 'HANDMADE JEWELLERY')}</small>
          </span>
        </Link>

        {/* Desktop Main Navigation */}
        <nav>
          {/* 1. Our Collections Dropdown */}
          <div
            className="navItem"
            ref={dropdownRef}
            onMouseEnter={handleDropdownEnter}
            onMouseLeave={handleDropdownLeave}
          >
            <button
              className={`navDropdownTrigger ${collectionsOpen ? 'active' : ''}`}
              type="button"
              onClick={() => setCollectionsOpen((prev) => !prev)}
            >
              <span>{t('nav_our_collections', 'Our Collections')}</span>
              <ChevronDown
                size={14}
                style={{
                  transform: collectionsOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease'
                }}
              />
            </button>

            {collectionsOpen && (
              <div
                className="navDropdown"
                onMouseEnter={handleDropdownEnter}
                onMouseLeave={handleDropdownLeave}
              >
                {collectionSubMenus.map((sub) => (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    onClick={() => setCollectionsOpen(false)}
                  >
                    <span>{sub.title}</span>
                    <ChevronRight size={12} color="var(--gold)" />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* 2. Our Brides / Hall of Fame */}
          <Link to="/hall-of-fame">{t('nav_our_brides', 'Our Brides')}</Link>

          {/* 3. Suggestions */}
          <Link to="/suggestion">{t('nav_suggestions', 'Suggestions')}</Link>

          {/* 4. About Us */}
          <Link to="/about">{t('nav_about', 'About Us')}</Link>

          {/* 5. Contact Us */}
          <Link to="/contact">{t('nav_contact', 'Contact Us')}</Link>

          {/* 6. Track Order */}
          <Link to="/orders">{t('nav_track_order', 'Track Order')}</Link>
        </nav>

        {/* Right-Side Icons */}
        <div className="actions">
          {/* Language Toggle */}
          <button
            className="langBtn"
            type="button"
            onClick={toggleLang}
            title={lang === 'en' ? 'मराठी मध्ये पहा' : 'View in English'}
            aria-label="Switch Language"
          >
            <Globe size={14} />
            <span className={lang === 'en' ? 'active' : 'dim'}>EN</span>
            <span style={{ opacity: 0.5 }}>/</span>
            <span className={lang === 'mr' ? 'active' : 'dim'}>मराठी</span>
          </button>

          {/* Search Icon */}
          <button
            className="icon"
            aria-label="Search"
            onClick={() => setSearchOpen(!searchOpen)}
          >
            <Search />
          </button>

          {/* Cart Icon */}
          <Link className="icon count" to="/cart" aria-label="Shopping bag">
            <ShoppingBag />
            {cartCount > 0 && <i key={cartCount}>{cartCount}</i>}
          </Link>

          {/* Profile / Account Icon */}
          <Link
            className="icon account"
            to={user ? '/account' : '/login'}
            aria-label={t('nav_account', 'Profile')}
            title={user ? user.name : t('nav_account', 'Profile')}
          >
            <User />
          </Link>
        </div>
      </header>

      {/* Mobile Drawer Menu */}
      {mobileMenuOpen && (
        <>
          <div
            className="mobileMenuBackdrop"
            onClick={() => setMobileMenuOpen(false)}
            aria-hidden="true"
          />
          <div className="mobileMenu">
          <div className="menuHead">
            <b>{t('menu', 'Menu')}</b>
            <button className="icon" onClick={() => setMobileMenuOpen(false)} aria-label="Close menu">
              <X />
            </button>
          </div>

          <div className="mobileLangRow">
            <span>भाषा / Language</span>
            <button
              className="langBtn"
              type="button"
              onClick={toggleLang}
              style={{ background: 'var(--maroon)', color: '#fff' }}
            >
              <Globe size={14} />
              <span className={lang === 'en' ? 'active' : 'dim'}>EN</span>
              <span>/</span>
              <span className={lang === 'mr' ? 'active' : 'dim'}>मराठी</span>
            </button>
          </div>

          {/* Our Collections Accordion in Mobile */}
          <div>
            <button
              className="mobileCollTrigger"
              type="button"
              onClick={() => setMobileCollOpen(!mobileCollOpen)}
            >
              <b>{t('nav_our_collections', 'Our Collections')}</b>
              <ChevronDown
                size={16}
                style={{
                  transform: mobileCollOpen ? 'rotate(180deg)' : 'none',
                  transition: 'transform 0.2s ease'
                }}
              />
            </button>

            {mobileCollOpen && (
              <div className="mobileSubMenu">
                {collectionSubMenus.map((sub) => (
                  <Link
                    key={sub.path}
                    to={sub.path}
                    onClick={() => setMobileMenuOpen(false)}
                  >
                    <span>{sub.title}</span>
                    <ChevronRight size={13} />
                  </Link>
                ))}
              </div>
            )}
          </div>

          {/* Our Brides */}
          <Link onClick={() => setMobileMenuOpen(false)} to="/hall-of-fame">
            {t('nav_our_brides', 'Our Brides')}
            <ChevronRight />
          </Link>

          {/* Suggestions */}
          <Link onClick={() => setMobileMenuOpen(false)} to="/suggestion">
            {t('nav_suggestions', 'Suggestions')}
            <ChevronRight />
          </Link>

          {/* About Us */}
          <Link onClick={() => setMobileMenuOpen(false)} to="/about">
            {t('nav_about', 'About Us')}
            <ChevronRight />
          </Link>

          {/* Contact Us */}
          <Link onClick={() => setMobileMenuOpen(false)} to="/contact">
            {t('nav_contact', 'Contact Us')}
            <ChevronRight />
          </Link>

          {/* Track Order */}
          <Link onClick={() => setMobileMenuOpen(false)} to="/orders">
            {t('nav_track_order', 'Track Order')}
            <ChevronRight />
          </Link>

          {/* Profile */}
          <Link onClick={() => setMobileMenuOpen(false)} to={user ? '/account' : '/login'}>
            {t('nav_account', 'Profile')}
            <ChevronRight />
          </Link>

          {user && (
            <button className="mobileLogout" onClick={handleLogout}>
              <LogOut /> {t('nav_logout', 'Logout')}
            </button>
          )}
        </div>
      </>
      )}
    </>
  );
}
