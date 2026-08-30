import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import {
  Home,
  ShoppingBag,
  Search,
  Truck,
  Sparkles,
  User
} from 'lucide-react';
import { useCart } from '../../context/CartContext';
import { useAuth } from '../../context/AuthContext';
import { useLanguage } from '../../context/LanguageContext';
import './MobileStickyFooter.css';

export default function MobileStickyFooter({ searchOpen, setSearchOpen }) {
  const location = useLocation();
  const { cartCount } = useCart();
  const { user } = useAuth();
  const { t, lang } = useLanguage();

  // Hide sticky mobile footer on admin dashboard and login pages
  if (location.pathname.startsWith('/admin')) {
    return null;
  }

  const currentPath = location.pathname;
  const isHome = currentPath === '/';
  const isShop = currentPath === '/shop' || currentPath.startsWith('/category');
  const isOrders = currentPath === '/orders' || currentPath === '/track';
  const isCart = currentPath === '/cart';
  const isAccount = currentPath === '/account' || currentPath === '/login';

  return (
    <nav className="mobileStickyFooter" aria-label="Mobile Navigation Bar">
      {/* 1. Home */}
      <Link
        to="/"
        className={`mobileFooterTab ${isHome ? 'active' : ''}`}
        aria-label="Home"
      >
        <div className="tabIconWrap">
          <Home size={19} />
        </div>
        <span className="tabLabel">{lang === 'mr' ? 'मुख्यपृष्ठ' : 'Home'}</span>
      </Link>

      {/* 2. Shop / Collections */}
      <Link
        to="/shop"
        className={`mobileFooterTab ${isShop ? 'active' : ''}`}
        aria-label="Shop All Jewellery"
      >
        <div className="tabIconWrap">
          <Sparkles size={19} />
        </div>
        <span className="tabLabel">{lang === 'mr' ? 'दागिने' : 'Shop'}</span>
      </Link>

      {/* 3. Search */}
      <button
        type="button"
        className={`mobileFooterTab ${searchOpen ? 'active' : ''}`}
        onClick={() => setSearchOpen((prev) => !prev)}
        aria-label="Search Catalogue"
      >
        <div className="tabIconWrap">
          <Search size={19} />
        </div>
        <span className="tabLabel">{lang === 'mr' ? 'शोधा' : 'Search'}</span>
      </button>

      {/* 4. Track Order */}
      <Link
        to="/orders"
        className={`mobileFooterTab ${isOrders ? 'active' : ''}`}
        aria-label="Track Order Status"
      >
        <div className="tabIconWrap">
          <Truck size={19} />
        </div>
        <span className="tabLabel">{lang === 'mr' ? 'ट्रॅक' : 'Track'}</span>
      </Link>

      {/* 5. Cart / Bag with Live Count */}
      <Link
        to="/cart"
        className={`mobileFooterTab ${isCart ? 'active' : ''}`}
        aria-label={`Shopping Bag (${cartCount} items)`}
      >
        <div className="tabIconWrap cartIconWrap">
          <ShoppingBag size={19} />
          {cartCount > 0 && <span className="mobileCartBadge">{cartCount}</span>}
        </div>
        <span className="tabLabel">{lang === 'mr' ? 'बॅग' : 'Bag'}</span>
      </Link>

      {/* 6. Account / Profile */}
      <Link
        to={user ? '/account' : '/login'}
        className={`mobileFooterTab ${isAccount ? 'active' : ''}`}
        aria-label="My Account"
      >
        <div className="tabIconWrap">
          <User size={19} />
        </div>
        <span className="tabLabel">{user ? (lang === 'mr' ? 'खाते' : 'Account') : (lang === 'mr' ? 'लॉगिन' : 'Login')}</span>
      </Link>
    </nav>
  );
}
