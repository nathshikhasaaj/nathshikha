import React, { useEffect, useState } from 'react';
import { useParams, useSearchParams, useNavigate, Link } from 'react-router-dom';
import { CheckCircle2, XCircle, Loader2, Mail, ArrowRight, RefreshCw } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import SectionTitle from '../../components/common/SectionTitle';
import './VerifyEmail.css';

export default function VerifyEmail() {
  const { token: pathToken } = useParams();
  const [searchParams] = useSearchParams();
  const navigate = useNavigate();
  const { loginCustomer } = useAuth();
  const { setToast } = useToast();

  const queryToken = searchParams.get('token') || searchParams.get('t');
  const pathParts = window.location.pathname.split('/').filter(Boolean);
  const lastSegment = pathParts.length > 0 && !['verify-email', 'verify-mail', 'verify'].includes(pathParts[pathParts.length - 1])
    ? pathParts[pathParts.length - 1]
    : null;
  const token = pathToken || queryToken || lastSegment;

  const [status, setStatus] = useState('verifying'); // 'verifying' | 'success' | 'expired' | 'error'
  const [resendEmail, setResendEmail] = useState('');
  const [resending, setResending] = useState(false);
  const [resendSent, setResendSent] = useState(false);
  const [errorMessage, setErrorMessage] = useState('');

  useEffect(() => {
    let isMounted = true;

    async function verify() {
      if (!token) {
        setStatus('error');
        setErrorMessage('Verification token is missing. Please click the link received in your email or enter your email below to request a new link.');
        return;
      }

      try {
        const data = await api('/auth/verify-email', {
          method: 'POST',
          body: JSON.stringify({ token: token.trim() })
        });

        if (!isMounted) return;

        setStatus('success');
        if (data.user && data.token) {
          loginCustomer(data.user, data.token);
        }
        setToast({
          type: 'success',
          message: 'Email verified successfully! Welcome to Nathshikha.',
          duration: 4000
        });
      } catch (err) {
        if (!isMounted) return;
        if (err.expired || err.message?.toLowerCase().includes('expired') || err.message?.toLowerCase().includes('invalid')) {
          setStatus('expired');
        } else {
          setStatus('error');
        }
        setErrorMessage(err.message || 'Verification link is invalid or has expired.');
      }
    }

    verify();

    return () => {
      isMounted = false;
    };
  }, [token]);

  const handleResend = async (e) => {
    e.preventDefault();
    if (!resendEmail || !resendEmail.includes('@')) {
      setToast({ type: 'error', message: 'Please enter a valid email address.' });
      return;
    }

    setResending(true);
    try {
      await api('/auth/resend-verification', {
        method: 'POST',
        body: JSON.stringify({ email: resendEmail })
      });

      setResendSent(true);
      setToast({
        type: 'success',
        message: 'A new verification link has been dispatched to your email!',
        duration: 4000
      });
    } catch (err) {
      setToast({
        type: 'error',
        message: err.message || 'Failed to resend verification link.'
      });
    } finally {
      setResending(false);
    }
  };

  return (
    <main className="page verifyEmailPage">
      <SectionTitle
        title="Email Verification"
        sub="Securing your Nathshikha customer account."
      />

      <div className="verifyEmailContainer">
        <div className="verifyEmailCard">
          {status === 'verifying' && (
            <div className="verifyStateBlock verifying">
              <Loader2 className="verifySpinner" size={48} />
              <h2>Verifying Your Email Address...</h2>
              <p>Please hold on while we securely validate your account credentials.</p>
            </div>
          )}

          {status === 'success' && (
            <div className="verifyStateBlock success">
              <div className="verifyIconWrap successIcon">
                <CheckCircle2 size={54} />
              </div>
              <h2>Email Verified Successfully ✓</h2>
              <p>
                Your email address has been verified successfully. Your Nathshikha account is now fully active!
              </p>
              <div className="verifyActions">
                <button
                  className="goldBtn verifyBtn"
                  onClick={() => navigate('/account')}
                >
                  <span>Go to My Account</span>
                  <ArrowRight size={16} />
                </button>
              </div>
            </div>
          )}

          {(status === 'expired' || status === 'error') && (
            <div className="verifyStateBlock expired">
              <div className="verifyIconWrap errorIcon">
                <XCircle size={54} />
              </div>
              <h2>Verification Link Expired</h2>
              <p className="verifyErrorText">
                {errorMessage || 'This verification link is no longer valid or has already expired.'}
              </p>

              {resendSent ? (
                <div className="resendSuccessBox">
                  <Mail size={22} className="resendSuccessIcon" />
                  <div>
                    <strong>Verification Link Sent!</strong>
                    <p>Please check your inbox (and spam folder) for the new activation email.</p>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleResend} className="resendVerificationForm">
                  <label htmlFor="resendEmail">Enter your registered email to receive a new link:</label>
                  <div className="resendInputRow">
                    <input
                      id="resendEmail"
                      type="email"
                      required
                      placeholder="you@example.com"
                      value={resendEmail}
                      onChange={(e) => setResendEmail(e.target.value)}
                    />
                    <button
                      type="submit"
                      className="goldBtn resendSubmitBtn"
                      disabled={resending}
                    >
                      {resending ? (
                        <>
                          <Loader2 size={16} className="btnSpinner" />
                          <span>SENDING…</span>
                        </>
                      ) : (
                        <>
                          <RefreshCw size={15} />
                          <span>Resend Link</span>
                        </>
                      )}
                    </button>
                  </div>
                </form>
              )}

              <div className="verifyBackLink">
                <Link to="/login">← Back to Login</Link>
              </div>
            </div>
          )}
        </div>
      </div>
    </main>
  );
}
