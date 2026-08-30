import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import './Auth.css';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [loading, setLoading] = useState(false);
  const navigate = useNavigate();
  const { loginCustomer } = useAuth();
  const { setToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setLoading(true);
    try {
      const data = await api(
        mode === 'login' ? '/auth/customer-login' : '/auth/register',
        {
          method: 'POST',
          body: JSON.stringify(form)
        }
      );

      loginCustomer(data.user, data.token);
      setToast('Welcome ' + data.user.name);
      navigate('/account');
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page">
      <SectionTitle
        title={mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
        sub="Save your wishlist, checkout faster and track every order."
      />

      <div className="authContainer">
        <form onSubmit={submit}>
          {mode === 'register' && (
            <input
              required
              placeholder="Full Name"
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />
          )}
          <input
            required
            type="email"
            placeholder="Email Address"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            minLength="6"
            placeholder="Password (min 6 characters)"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="goldBtn" disabled={loading} type="submit">
            {loading ? 'PROCESSING…' : mode === 'login' ? 'LOGIN' : 'CREATE ACCOUNT'}
          </button>
          <button
            type="button"
            className="outlineBtn"
            onClick={() => setMode(mode === 'login' ? 'register' : 'login')}
          >
            {mode === 'login'
              ? 'NEW HERE? CREATE ACCOUNT'
              : 'ALREADY HAVE AN ACCOUNT? LOGIN'}
          </button>
        </form>
      </div>
    </main>
  );
}
