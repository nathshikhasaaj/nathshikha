import React, { useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, CheckCircle2, AlertCircle, Lock, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import './ResetPassword.css';

export default function ResetPassword() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { setToast } = useToast();

  const queryToken = searchParams.get('token') || searchParams.get('t');
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const lastSegment = pathParts.length > 0 && !['reset-password', 'reset'].includes(pathParts[pathParts.length - 1])
    ? pathParts[pathParts.length - 1]
    : null;
  const token = pathToken || queryToken || lastSegment;

  const [password, setPassword] = useState('');
  const [confirmPassword, setConfirmPassword] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [showConfirm, setShowConfirm] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [isSuccess, setIsSuccess] = useState(false);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setErrorMsg('');

    if (!token) {
      setErrorMsg('Password reset token is missing.');
      return;
    }

    if (password.length < 6) {
      setErrorMsg('New password must be at least 6 characters long.');
      return;
    }

    if (password !== confirmPassword) {
      setErrorMsg('Passwords do not match. Please re-enter your password.');
      return;
    }

    setLoading(true);

    try {
      await api('/auth/reset-password', {
        method: 'POST',
        body: JSON.stringify({
          token,
          password,
          confirmPassword
        })
      });

      setIsSuccess(true);
      setToast({
        type: 'success',
        message: 'Password updated successfully! Please login with your new password.',
        duration: 4000
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to reset password. The link may have expired.');
      setToast({
        type: 'error',
        message: err.message || 'Failed to reset password.'
      });
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page resetPasswordPage">
      <SectionTitle
        title="Reset Your Password"
        sub="Create a new secure password for your Nathshikha account."
      />

      <div className="resetPasswordContainer">
        <div className="resetPasswordCard">
          {isSuccess ? (
            <div className="resetSuccessBlock">
              <div className="resetIconWrap successIcon">
                <CheckCircle2 size={54} />
              </div>
              <h2>Password Updated Successfully ✓</h2>
              <p>
                Your Nathshikha account password has been updated. You can now login with your new password.
              </p>
              <button
                className="goldBtn resetBtn"
                onClick={() => navigate('/login')}
              >
                <span>Login to Nathshikha</span>
                <ArrowRight size={16} />
              </button>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="resetPasswordForm">
              <div className="resetFormHeader">
                <div className="resetIconWrap lockIcon">
                  <Lock size={28} />
                </div>
                <h3>Create New Password</h3>
                <p>Please enter your new password below.</p>
              </div>

              {errorMsg && (
                <div className="authErrorBanner" role="alert">
                  <AlertCircle size={16} />
                  <span>{errorMsg}</span>
                </div>
              )}

              <div className="authInputGroup">
                <label htmlFor="newPassword">New Password</label>
                <div className="passwordInputWrap">
                  <input
                    id="newPassword"
                    required
                    type={showPassword ? 'text' : 'password'}
                    minLength="6"
                    placeholder="New password (min 6 characters)"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
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

              <div className="authInputGroup">
                <label htmlFor="confirmNewPassword">Confirm New Password</label>
                <div className="passwordInputWrap">
                  <input
                    id="confirmNewPassword"
                    required
                    type={showConfirm ? 'text' : 'password'}
                    minLength="6"
                    placeholder="Confirm new password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                  />
                  <button
                    type="button"
                    className="passwordToggleBtn"
                    onClick={() => setShowConfirm(!showConfirm)}
                    aria-label={showConfirm ? 'Hide password' : 'Show password'}
                  >
                    {showConfirm ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </div>

              <button
                type="submit"
                className="goldBtn authSubmitBtn"
                disabled={loading}
              >
                {loading ? (
                  <>
                    <Loader2 size={16} className="btnSpinner" />
                    <span>UPDATING PASSWORD…</span>
                  </>
                ) : (
                  'RESET PASSWORD'
                )}
              </button>

              <div className="resetBackLink">
                <Link to="/login">← Back to Login</Link>
              </div>
            </form>
          )}
        </div>
      </div>
    </main>
  );
}
