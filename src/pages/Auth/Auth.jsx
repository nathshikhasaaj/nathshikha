import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Sparkles } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import './Auth.css';

export default function Auth() {
  const [mode, setMode] = useState('login');
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const navigate = useNavigate();
  const { loginCustomer } = useAuth();
  const { setToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setErrorMsg('');
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
      setToast({
        type: 'success',
        message: `Welcome back, ${data.user.name}!`,
        duration: 3500
      });
      navigate('/account');
    } catch (err) {
      setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      setToast({
        type: 'error',
        message: err.message || 'Authentication failed.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
  };

  return (
    <main className="page">
      <SectionTitle
        title={mode === 'login' ? 'Welcome Back' : 'Create Your Account'}
        sub="Save your wishlist, checkout faster and track every order."
      />

      <div className="authContainer">
        <form onSubmit={submit} className="authFormCard">
          {errorMsg && (
            <div className="authErrorBanner" role="alert">
              <AlertCircle size={16} />
              <span>{errorMsg}</span>
            </div>
          )}

          {mode === 'register' && (
            <div className="authInputGroup">
              <label htmlFor="authName">Full Name</label>
              <input
                id="authName"
                required
                placeholder="e.g. Radhika Deshmukh"
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
            </div>
          )}

          <div className="authInputGroup">
            <label htmlFor="authEmail">Email Address</label>
            <input
              id="authEmail"
              required
              type="email"
              placeholder="you@example.com"
              value={form.email}
              onChange={(e) => setForm({ ...form, email: e.target.value })}
            />
          </div>

          <div className="authInputGroup">
            <label htmlFor="authPassword">Password</label>
            <div className="passwordInputWrap">
              <input
                id="authPassword"
                required
                type={showPassword ? 'text' : 'password'}
                minLength="6"
                placeholder="Password (min 6 characters)"
                value={form.password}
                onChange={(e) => setForm({ ...form, password: e.target.value })}
              />
              <button
                type="button"
                className="passwordToggleBtn"
                onClick={() => setShowPassword(!showPassword)}
                aria-label={showPassword ? 'Hide password' : 'Show password'}
              >
                {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
              </button>
            </div>
          </div>

          <button className="goldBtn authSubmitBtn" disabled={loading} type="submit">
            {loading ? (
              <>
                <Loader2 size={16} className="btnSpinner" />
                <span>PROCESSING…</span>
              </>
            ) : mode === 'login' ? (
              'LOGIN'
            ) : (
              'CREATE ACCOUNT'
            )}
          </button>

          <button
            type="button"
            className="outlineBtn authSwitchBtn"
            onClick={() => switchMode(mode === 'login' ? 'register' : 'login')}
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

