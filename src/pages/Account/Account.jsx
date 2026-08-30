import React from 'react';
import { Link } from 'react-router-dom';
import { Package, Heart, ShoppingBag, LogOut, User } from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import SectionTitle from '../../components/common/SectionTitle';
import './Account.css';

export default function Account() {
  const { user, logoutCustomer } = useAuth();

  return (
    <main className="page">
      <SectionTitle
        title="Account"
        sub={
          user
            ? `Welcome, ${user.name}. Manage your profile, orders and saved pieces.`
            : 'Login to manage your account.'
        }
      />

      {user ? (
        <div className="accountGrid">
          <Link to="/orders">
            <Package />
            <b>My Orders</b>
            <span>Track and manage orders</span>
          </Link>
          <Link to="/wishlist">
            <Heart />
            <b>Wishlist</b>
            <span>Saved favourites</span>
          </Link>
          <Link to="/cart">
            <ShoppingBag />
            <b>My Bag</b>
            <span>Items ready to checkout</span>
          </Link>
          <button className="outlineBtn" onClick={logoutCustomer} type="button">
            <LogOut />
            <b>Logout</b>
            <span>Sign out securely</span>
          </button>
        </div>
      ) : (
        <div className="empty">
          <User />
          <Link className="goldBtn" to="/login">
            LOGIN
          </Link>
        </div>
      )}
    </main>
  );
}
