import React, { useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import { Settings } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import './AdminLogin.css';

export default function AdminLogin() {
  const [form, setForm] = useState({ email: '', password: '' });
  const [busy, setBusy] = useState(false);
  const navigate = useNavigate();
  const { loginAdmin } = useAuth();
  const { setToast } = useToast();

  const submit = async (e) => {
    e.preventDefault();
    setBusy(true);
    try {
      const d = await api('/auth/admin-login', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      loginAdmin(d.user, d.token);
      setToast('Admin login successful');
      navigate('/admin');
    } catch (err) {
      setToast(err.message);
    } finally {
      setBusy(false);
    }
  };

  return (
    <main className="page adminLogin">
      <SectionTitle
        title="Studio Admin Login"
        sub="Private control panel for Nathshikha."
      />

      <div className="adminLoginCard">
        <div className="adminBadge">
          <Settings />
        </div>
        <h2>Nathshikha Studio</h2>
        <p>Sign in to access your administrative control panel.</p>

        <form onSubmit={submit}>
          <input
            required
            type="email"
            placeholder="Admin email"
            value={form.email}
            onChange={(e) => setForm({ ...form, email: e.target.value })}
          />
          <input
            required
            type="password"
            placeholder="Admin password"
            value={form.password}
            onChange={(e) => setForm({ ...form, password: e.target.value })}
          />
          <button className="goldBtn" disabled={busy} type="submit">
            {busy ? 'SIGNING IN…' : 'SIGN IN TO STUDIO'}
          </button>
        </form>

        <Link to="/" className="back">
          ← Back to store
        </Link>
      </div>
    </main>
  );
}
