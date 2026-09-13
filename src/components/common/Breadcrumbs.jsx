import React from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import { Home, ChevronRight, ArrowLeft } from 'lucide-react';
import { useLanguage } from '../../context/LanguageContext';
import './Breadcrumbs.css';

export default function Breadcrumbs({ items, showBack = true, backPath, backLabel }) {
  const location = useLocation();
  const navigate = useNavigate();
  const { t, lang } = useLanguage();

  const handleBack = (e) => {
    e.preventDefault();
    if (backPath) {
      navigate(backPath);
    } else if (window.history.length > 2) {
      navigate(-1);
    } else {
      navigate('/shop');
    }
  };

  // If custom items are provided, use them
  let breadcrumbList = items;

  // Otherwise, automatically derive from current location path
  if (!breadcrumbList || breadcrumbList.length === 0) {
    const pathname = location.pathname;

    if (pathname === '/shop') {
      breadcrumbList = [{ label: t('nav_all_jewellery', 'All Jewellery') }];
    } else if (pathname.startsWith('/category/')) {
      const catName = decodeURIComponent(pathname.replace('/category/', ''));
      breadcrumbList = [
        { label: t('nav_all_jewellery', 'All Jewellery'), path: '/shop' },
        { label: `${catName}` }
      ];
    } else if (pathname === '/cart') {
      breadcrumbList = [{ label: t('your_bag', 'Your Bag') }];
    } else if (pathname === '/checkout') {
      breadcrumbList = [
        { label: t('your_bag', 'Your Bag'), path: '/cart' },
        { label: t('checkout_title', 'Checkout') }
      ];
    } else if (pathname.startsWith('/order-success/')) {
      const ordNo = pathname.replace('/order-success/', '');
      breadcrumbList = [
        { label: t('nav_track_order', 'Orders'), path: '/orders' },
        { label: `Order #${ordNo}` }
      ];
    } else if (pathname === '/orders' || pathname === '/track' || pathname === '/track-order') {
      breadcrumbList = [{ label: t('nav_track_order', 'Track Order') }];
    } else if (pathname === '/account') {
      breadcrumbList = [{ label: t('nav_account', 'My Account') }];
    } else if (pathname === '/about') {
      breadcrumbList = [{ label: t('nav_about', 'About Us') }];
    } else if (pathname === '/contact') {
      breadcrumbList = [{ label: t('nav_contact', 'Contact Us') }];
    } else if (pathname === '/suggestion') {
      breadcrumbList = [{ label: t('nav_suggestions', 'Suggestions') }];
    } else if (pathname === '/reviews' || pathname === '/review') {
      breadcrumbList = [{ label: 'Reviews & Testimonials' }];
    } else if (pathname === '/hall-of-fame') {
      breadcrumbList = [{ label: t('nav_hall_of_fame', 'Hall of Fame') }];
    } else if (pathname === '/privacy-policy') {
      breadcrumbList = [
        { label: 'Legal Policies', path: '/terms' },
        { label: 'Privacy Policy' }
      ];
    } else if (pathname === '/terms' || pathname === '/terms-of-service') {
      breadcrumbList = [
        { label: 'Legal Policies', path: '/privacy-policy' },
        { label: 'Terms & Conditions' }
      ];
    } else if (pathname === '/shipping-policy') {
      breadcrumbList = [
        { label: 'Legal Policies', path: '/privacy-policy' },
        { label: 'Shipping Policy' }
      ];
    } else if (pathname === '/refund-policy') {
      breadcrumbList = [
        { label: 'Legal Policies', path: '/privacy-policy' },
        { label: 'Refund & Returns Policy' }
      ];
    } else if (pathname === '/login') {
      breadcrumbList = [{ label: 'Customer Login' }];
    } else if (pathname === '/register') {
      breadcrumbList = [{ label: 'Create Account' }];
    } else if (pathname === '/forgot-password') {
      breadcrumbList = [
        { label: 'Login', path: '/login' },
        { label: 'Reset Password' }
      ];
    } else {
      breadcrumbList = [];
    }
  }

  // If on home page and no breadcrumb items, don't render
  if (location.pathname === '/' && (!items || items.length === 0)) {
    return null;
  }

  return (
    <nav className="breadcrumbsBar" aria-label="Breadcrumb navigation">
      <ol className="breadcrumbsList">
        {/* Root Home Link */}
        <li className="breadcrumbItem">
          <Link to="/" className="breadcrumbLink homeLink" title="Home">
            <Home size={14} />
            <span>{lang === 'mr' ? 'मुख्यपृष्ठ' : 'Home'}</span>
          </Link>
        </li>

        {/* Dynamic Breadcrumbs */}
        {breadcrumbList.map((item, idx) => {
          const isLast = idx === breadcrumbList.length - 1;

          return (
            <li key={idx} className="breadcrumbItem">
              <span className="breadcrumbSeparator" aria-hidden="true">
                <ChevronRight size={13} />
              </span>
              {isLast || !item.path ? (
                <span className="breadcrumbCurrent" aria-current="page" title={item.label}>
                  {item.label}
                </span>
              ) : (
                <Link to={item.path} className="breadcrumbLink" title={item.label}>
                  {item.label}
                </Link>
              )}
            </li>
          );
        })}
      </ol>

      {/* Quick Back Action */}
      {showBack && (
        <button
          type="button"
          className="breadcrumbBackBtn"
          onClick={handleBack}
          aria-label={backLabel || (lang === 'mr' ? 'मागे जा' : 'Back')}
        >
          <ArrowLeft size={13} />
          <span>{backLabel || (lang === 'mr' ? 'मागे जा' : 'Back')}</span>
        </button>
      )}
    </nav>
  );
}
