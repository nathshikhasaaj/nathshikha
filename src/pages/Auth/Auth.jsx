import React, { useState } from 'react';
import { useNavigate, useSearchParams, Link } from 'react-router-dom';
import { Eye, EyeOff, Loader2, AlertCircle, Mail, CheckCircle2, RefreshCw, KeyRound, ArrowRight } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import './Auth.css';

export default function Auth({ defaultMode = 'login' }) {
  const [searchParams] = useSearchParams();
  const isVerifiedFromRedirect = searchParams.get('verified') === 'true';

  const [mode, setMode] = useState(defaultMode); // 'login' | 'register' | 'forgot' | 'register_success'
  const [form, setForm] = useState({ name: '', email: '', password: '' });
  const [forgotEmail, setForgotEmail] = useState('');
  const [showPassword, setShowPassword] = useState(false);
  const [loading, setLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');
  const [unverifiedEmail, setUnverifiedEmail] = useState(null);
  const [resendingVerification, setResendingVerification] = useState(false);
  const [resendVerificationSuccess, setResendVerificationSuccess] = useState(false);
  const [forgotSubmitted, setForgotSubmitted] = useState(false);

  const navigate = useNavigate();
  const { loginCustomer } = useAuth();
  const { setToast } = useToast();

  const handleLoginOrRegister = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    setUnverifiedEmail(null);
    setResendVerificationSuccess(false);
    setLoading(true);

    try {
      if (mode === 'register') {
        const data = await api('/auth/register', {
          method: 'POST',
          body: JSON.stringify(form)
        });

        if (data.email_verification_required) {
          setUnverifiedEmail(form.email);
          setMode('register_success');
          setToast({
            type: 'success',
            message: 'Account created! Please check your email to verify your account.',
            duration: 5000
          });
          return;
        }

        loginCustomer(data.user, data.token);
        setToast({
          type: 'success',
          message: `Welcome to Nathshikha, ${data.user.name}!`,
          duration: 3500
        });
        navigate('/account');
      } else {
        // Login mode
        const data = await api('/auth/customer-login', {
          method: 'POST',
          body: JSON.stringify({
            email: form.email,
            password: form.password
          })
        });

        loginCustomer(data.user, data.token);
        setToast({
          type: 'success',
          message: `Welcome back, ${data.user.name}!`,
          duration: 3500
        });
        navigate('/account');
      }
    } catch (err) {
      if (err.email_verification_required || err.message?.toLowerCase().includes('verified')) {
        setUnverifiedEmail(form.email);
        setErrorMsg('Your account has been created, but your email address needs to be verified before you can continue.');
      } else {
        setErrorMsg(err.message || 'Authentication failed. Please check your credentials.');
      }
      setToast({
        type: 'error',
        message: err.message || 'Authentication failed.',
        duration: 4000
      });
    } finally {
      setLoading(false);
    }
  };

  const handleForgotPassword = async (e) => {
    e.preventDefault();
    setErrorMsg('');
    if (!forgotEmail || !forgotEmail.includes('@')) {
      setErrorMsg('Please enter a valid email address.');
      return;
    }

    setLoading(true);
    try {
      await api('/auth/forgot-password', {
        method: 'POST',
        body: JSON.stringify({ email: forgotEmail })
      });

      setForgotSubmitted(true);
      setToast({
        type: 'success',
        message: 'Password reset link sent! Please check your inbox.',
        duration: 5000
      });
    } catch (err) {
      setErrorMsg(err.message || 'Failed to request password reset.');
    } finally {
      setLoading(false);
    }
  };

  const handleResendVerification = async () => {
    const targetEmail = unverifiedEmail || form.email;
    if (!targetEmail) return;

    setResendingVerification(true);
    try {
      await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: targetEmail })
      });

      setResendVerificationSuccess(true);
      setToast({
        type: 'success',
        message: 'A fresh verification email has been sent!',
        duration: 4000
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to resend verification email.'
      });
    } finally {
      setResendingVerification(false);
    }
  };

  const switchMode = (newMode) => {
    setMode(newMode);
    setErrorMsg('');
    setUnverifiedEmail(null);
    setResendVerificationSuccess(false);
    setForgotSubmitted(false);
  };

  return (
    <main className="page authPage">
      <SectionTitle
        title={
          mode === 'login'
            ? 'Welcome Back'
            : mode === 'register'
            ? 'Create Your Account'
            : mode === 'forgot'
            ? 'Reset Your Password'
            : 'Verify Your Email'
        }
        sub={
          mode === 'forgot'
            ? 'Enter your registered email to receive a secure reset link.'
            : mode === 'register_success'
            ? 'One last step to activate your patron profile.'
            : 'Save your wishlist, checkout faster and track every order.'
        }
      />

      <div className="authContainer">
        {/* ================================================== */}
        {/* MODE 1 & 2: LOGIN / REGISTER                       */}
        {/* ================================================== */}
        {(mode === 'login' || mode === 'register') && (
          <form onSubmit={handleLoginOrRegister} className="authFormCard">
            {isVerifiedFromRedirect && (
              <div style={{
                background: '#f0fdf4',
                border: '1.5px solid #bbf7d0',
                color: '#166534',
                padding: '12px 16px',
                borderRadius: 8,
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                fontSize: 13.5
              }}>
                <CheckCircle2 size={18} color="#16a34a" />
                <span><strong>Email Verified Successfully!</strong> Please login with your credentials to access your account.</span>
              </div>
            )}

            {errorMsg && (
              <div className="authErrorBanner" role="alert">
                <AlertCircle size={16} />
                <span>{errorMsg}</span>
              </div>
            )}

            {unverifiedEmail && (
              <div className="unverifiedEmailNotice">
                <Mail size={20} className="unverifiedIcon" />
                <div className="unverifiedContent">
                  <strong>Please Verify Your Email</strong>
                  <p>
                    Your account has been created, but your email address needs to be verified before you can continue.
                  </p>
                  {resendVerificationSuccess ? (
                    <div className="resendBadge">✓ New verification email dispatched!</div>
                  ) : (
                    <button
                      type="button"
                      className="resendVerificationInlineBtn"
                      onClick={handleResendVerification}
                      disabled={resendingVerification}
                    >
                      {resendingVerification ? (
                        <>
                          <Loader2 size={13} className="btnSpinner" />
                          <span>Sending link…</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={13} />
                          <span>Resend Verification Email</span>
                        </>
                      )}
                    </button>
                  )}
                </div>
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
              <div className="passwordLabelRow">
                <label htmlFor="authPassword">Password</label>
                {mode === 'login' && (
                  <button
                    type="button"
                    className="forgotPasswordLink"
                    onClick={() => {
                      setForgotEmail(form.email);
                      switchMode('forgot');
                    }}
                  >
                    Forgot Password?
                  </button>
                )}
              </div>
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
        )}

        {/* ================================================== */}
        {/* MODE 3: FORGOT PASSWORD                            */}
        {/* ================================================== */}
        {mode === 'forgot' && (
          <div className="authFormCard">
            {forgotSubmitted ? (
              <div className="forgotSuccessBlock">
                <div className="forgotSuccessIconWrap">
                  <Mail size={44} />
                </div>
                <h3>Reset Link Dispatched</h3>
                <p>
                  If an account exists for <strong>{forgotEmail}</strong>, a password reset link has been sent. Please check your inbox and spam folder.
                </p>
                <div className="noticeCardMini">
                  <p>⏳ The password reset link will expire in 30 minutes for security.</p>
                </div>
                <button
                  type="button"
                  className="goldBtn authSubmitBtn"
                  onClick={() => switchMode('login')}
                >
                  Return to Login
                </button>
              </div>
            ) : (
              <form onSubmit={handleForgotPassword} className="forgotPasswordForm">
                <div className="forgotHeader">
                  <div className="forgotKeyIconWrap">
                    <KeyRound size={26} />
                  </div>
                  <h3>Reset Your Password</h3>
                  <p>Enter your registered email address and we'll send you instructions to reset your password.</p>
                </div>

                {errorMsg && (
                  <div className="authErrorBanner" role="alert">
                    <AlertCircle size={16} />
                    <span>{errorMsg}</span>
                  </div>
                )}

                <div className="authInputGroup">
                  <label htmlFor="forgotEmailInput">Registered Email Address</label>
                  <input
                    id="forgotEmailInput"
                    required
                    type="email"
                    placeholder="you@example.com"
                    value={forgotEmail}
                    onChange={(e) => setForgotEmail(e.target.value)}
                  />
                </div>

                <button className="goldBtn authSubmitBtn" disabled={loading} type="submit">
                  {loading ? (
                    <>
                      <Loader2 size={16} className="btnSpinner" />
                      <span>SENDING RESET LINK…</span>
                    </>
                  ) : (
                    'SEND RESET LINK'
                  )}
                </button>

                <button
                  type="button"
                  className="outlineBtn authSwitchBtn"
                  onClick={() => switchMode('login')}
                >
                  ← BACK TO LOGIN
                </button>
              </form>
            )}
          </div>
        )}

        {/* ================================================== */}
        {/* MODE 4: REGISTER SUCCESS (PENDING EMAIL VERIFY)    */}
        {/* ================================================== */}
        {mode === 'register_success' && (
          <div className="authFormCard registerSuccessCard">
            <div className="registerSuccessIconWrap">
              <Mail size={50} />
            </div>
            <h2>Verify Your Email Address ❤️</h2>
            <p className="registerSuccessText">
              Thank you for creating an account with Nathshikha! We have sent a verification link to:
            </p>
            <div className="registeredEmailBadge">
              <strong>{unverifiedEmail || form.email}</strong>
            </div>
            <p className="registerSuccessSubtext">
              Please click the link in your email to activate your account. If you don't see it in a few moments, please check your spam folder.
            </p>

            <div className="registerSuccessActions">
              {resendVerificationSuccess ? (
                <div className="resendSuccessPill">✓ A new verification link has been sent!</div>
              ) : (
                <button
                  type="button"
                  className="outlineBtn resendPillBtn"
                  onClick={handleResendVerification}
                  disabled={resendingVerification}
                >
                  {resendingVerification ? (
                    <>
                      <Loader2 size={15} className="btnSpinner" />
                      <span>Sending link…</span>
                    </>
                  ) : (
                    <>
                      <RefreshCw size={15} />
                      <span>Resend Verification Email</span>
                    </>
                  )}
                </button>
              )}

              <button
                type="button"
                className="goldBtn authSubmitBtn"
                onClick={() => switchMode('login')}
              >
                Proceed to Login
              </button>
            </div>
          </div>
        )}
      </div>
    </main>
  );
}
