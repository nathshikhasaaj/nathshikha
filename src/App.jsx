import React, { useState, useEffect, useMemo } from 'react';
import { Routes, Route } from 'react-router-dom';
import { api } from './services/api';
import { useToast } from './context/ToastContext';
import { useCart } from './context/CartContext';

// Common Components
import TopBar from './components/common/TopBar';
import Header from './components/common/Header';
import Footer from './components/common/Footer';
import MobileStickyFooter from './components/common/MobileStickyFooter';
import ScrollToTop from './components/common/ScrollToTop';
import RouteErrorBoundary from './components/common/RouteErrorBoundary';
import Toast from './components/common/Toast';
import WhatsAppButton from './components/common/WhatsAppButton';
import ProtectedRoute from './components/common/ProtectedRoute';
import SearchPanel from './components/product/SearchPanel';

// Pages
import Home from './pages/Home/Home';
import Shop from './pages/Shop/Shop';
import Category from './pages/Category/Category';
import ProductDetail from './pages/Product/ProductDetail';
import Cart from './pages/Cart/Cart';
import Checkout from './pages/Checkout/Checkout';
import OrderSuccess from './pages/OrderSuccess/OrderSuccess';
import Orders from './pages/Orders/Orders';
import Account from './pages/Account/Account';
import Auth from './pages/Auth/Auth';
import About from './pages/About/About';
import ContactUs from './pages/Contact/ContactUs';
import Suggestion from './pages/Suggestion/Suggestion';
import ReviewPage from './pages/Review/ReviewPage';
import HallOfFame from './pages/HallOfFame/HallOfFame';
import NotFound from './pages/NotFound/NotFound';
import AdminLogin from './pages/Admin/AdminLogin';
import AdminGate from './pages/Admin/AdminGate';

// Legal Pages
import PrivacyPolicy from './pages/Legal/PrivacyPolicy';
import TermsOfService from './pages/Legal/TermsOfService';
import ShippingPolicy from './pages/Legal/ShippingPolicy';
import RefundPolicy from './pages/Legal/RefundPolicy';

import './App.css';

export default function App() {
  const [products, setProducts] = useState([]);
  const [searchOpen, setSearchOpen] = useState(false);
  const [query, setQuery] = useState('');
  const { setToast } = useToast();
  const { syncWithCatalog } = useCart();

  const refreshProducts = async () => {
    try {
      const data = await api('/products');
      setProducts(data);
      if (Array.isArray(data)) {
        syncWithCatalog(data);
      }
    } catch (e) {
      setToast(e.message);
    }
  };

  useEffect(() => {
    refreshProducts();
  }, []);

  const filteredProducts = useMemo(() => {
    return products.filter((p) =>
      `${p.name} ${p.category}`.toLowerCase().includes(query.toLowerCase())
    );
  }, [products, query]);

  return (
    <div className="app">
      <TopBar />
      <Header searchOpen={searchOpen} setSearchOpen={setSearchOpen} />

      {searchOpen && (
        <SearchPanel
          query={query}
          setQuery={setQuery}
          results={filteredProducts}
        />
      )}

      <ScrollToTop />

      <RouteErrorBoundary>
        <Routes>
          <Route path="/" element={<Home products={products} />} />
          <Route path="/shop" element={<Shop products={products} />} />
          <Route path="/product/:id" element={<ProductDetail />} />
          <Route path="/category/:cat" element={<Category />} />
          <Route path="/cart" element={<Cart />} />
          <Route path="/checkout" element={<Checkout />} />
          <Route path="/order-success/:orderNo" element={<OrderSuccess />} />
          <Route path="/orders" element={<Orders />} />
          <Route path="/track" element={<Orders />} />
          <Route path="/track-order" element={<Orders />} />
          <Route path="/account" element={<Account />} />
          <Route path="/login" element={<Auth />} />
          <Route path="/about" element={<About />} />
          <Route path="/contact" element={<ContactUs />} />
          <Route path="/suggestion" element={<Suggestion />} />
          <Route path="/suggestions" element={<Suggestion />} />
          <Route path="/hall-of-fame" element={<HallOfFame />} />
          <Route path="/our-brides" element={<HallOfFame />} />
          <Route path="/review/:token" element={<ReviewPage />} />

          {/* Legal & Policy Pages */}
          <Route path="/privacy-policy" element={<PrivacyPolicy />} />
          <Route path="/terms" element={<TermsOfService />} />
          <Route path="/shipping-policy" element={<ShippingPolicy />} />
          <Route path="/refund-policy" element={<RefundPolicy />} />

          {/* Admin Routes */}
          <Route path="/admin/login" element={<AdminLogin />} />
          <Route
            path="/admin"
            element={
              <AdminGate
                products={products}
                refreshProducts={refreshProducts}
              />
            }
          />

          <Route path="*" element={<NotFound />} />
        </Routes>
      </RouteErrorBoundary>

      <WhatsAppButton />
      <MobileStickyFooter searchOpen={searchOpen} setSearchOpen={setSearchOpen} />
      <Footer />
      <Toast />
    </div>
  );
}
