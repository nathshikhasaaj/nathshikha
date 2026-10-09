import React, { useState, useEffect } from 'react';
import {
  X,
  Mail,
  ShieldCheck,
  AlertCircle,
  Loader2,
  CheckCircle2,
  Lock,
  FileText,
  Info
} from 'lucide-react';
import { api } from '../../services/api';
import { useToast } from '../../context/ToastContext';
import './AdminEditEmailModal.css';

export default function AdminEditEmailModal({
  order,
  isOpen,
  onClose,
  onEmailSaved
}) {
  const { setToast } = useToast();
  const currentEmail = order?.customer_email || order?.customerEmail || order?.email || '';

  const [newEmail, setNewEmail] = useState('');
  const [adminNote, setAdminNote] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMsg, setSuccessMsg] = useState('');

  useEffect(() => {
    if (isOpen && order) {
      setNewEmail(currentEmail);
      setAdminNote('');
      setError('');
      setSuccessMsg('');
    }
  }, [isOpen, order, currentEmail]);

  useEffect(() => {
    const handleKeyDown = (e) => {
      if (!isOpen) return;
      if (e.key === 'Escape' && !loading) {
        onClose();
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen, loading, onClose]);

  if (!isOpen || !order) return null;

  const validateEmailFormat = (email) => {
    const trimmed = String(email || '').trim().toLowerCase();
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    return emailRegex.test(trimmed) && trimmed.length <= 120;
  };

  const handleSave = async (e) => {
    if (e) e.preventDefault();
    setError('');
    setSuccessMsg('');

    const cleanEmail = newEmail.trim().toLowerCase();

    if (!cleanEmail) {
      setError('Please enter a valid customer email address.');
      return;
    }

    if (!validateEmailFormat(cleanEmail)) {
      setError('Please enter a valid email format (e.g. name@example.com).');
      return;
    }

    setLoading(true);

    try {
      const orderId = order.id || order._id;
      const res = await api(`/admin/orders/${orderId}/email`, {
        method: 'PATCH',
        body: JSON.stringify({
          email: cleanEmail,
          note: adminNote.trim() || undefined
        })
      });

      if (res.ok && res.order) {
        setSuccessMsg(`Email updated to ${cleanEmail}`);
        setToast(`Order #${order.order_no || order.orderNo} email updated to ${cleanEmail}`);

        if (onEmailSaved) {
          onEmailSaved(res.order);
        }

        setTimeout(() => {
          onClose();
        }, 500);
      } else {
        throw new Error(res.error || 'Failed to update customer email');
      }
    } catch (err) {
      setError(err.message || 'Failed to update email. Please try again.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="adminEditEmailOverlay" onClick={!loading ? onClose : undefined}>
      <div
        className="adminEditEmailModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
        aria-labelledby="editEmailTitle"
      >
        {/* Header */}
        <div className="adminEditEmailHeader">
          <div className="adminEditEmailHeaderLeft">
            <div className="adminEditEmailIconBadge">
              <Mail size={18} />
            </div>
            <div>
              <h3 id="editEmailTitle" className="adminEditEmailTitle">
                Edit Customer Email
              </h3>
              <p className="adminEditEmailSubtitle">
                Order <strong>#{order.order_no || order.orderNo}</strong>
                {order.customer_name || order.name ? ` · ${order.customer_name || order.name}` : ''}
              </p>
            </div>
          </div>
          <button
            type="button"
            className="adminEditEmailCloseBtn"
            onClick={onClose}
            disabled={loading}
            aria-label="Close modal"
          >
            <X size={18} />
          </button>
        </div>

        {/* Body Form */}
        <form onSubmit={handleSave} className="adminEditEmailBody">
          {error && (
            <div className="adminEditEmailAlert errorAlert">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {successMsg && (
            <div className="adminEditEmailAlert successAlert">
              <CheckCircle2 size={16} />
              <span>{successMsg}</span>
            </div>
          )}

          {/* Current Email (Read-Only) */}
          <div className="adminEditEmailFieldGroup">
            <label className="adminEditEmailLabel">
              <span>Current Email Address</span>
              <span className="readOnlyBadge">
                <Lock size={10} /> Read-Only
              </span>
            </label>
            <div className="readOnlyInputWrap">
              <input
                type="text"
                readOnly
                value={currentEmail || 'No email recorded'}
                className="adminEditEmailInput readOnlyInput"
                tabIndex={-1}
              />
            </div>
          </div>

          {/* Corrected Email Input */}
          <div className="adminEditEmailFieldGroup">
            <label htmlFor="correctedEmailInput" className="adminEditEmailLabel requiredLabel">
              <span>Correct Email Address</span>
              <span className="labelHint">All future order notifications will use this</span>
            </label>
            <div className="inputWithIconWrap">
              <Mail size={15} className="inputFieldIcon" />
              <input
                id="correctedEmailInput"
                type="email"
                value={newEmail}
                onChange={(e) => {
                  setNewEmail(e.target.value);
                  if (error) setError('');
                }}
                placeholder="customer@example.com"
                className={`adminEditEmailInput ${error && !validateEmailFormat(newEmail) ? 'inputError' : ''}`}
                autoFocus
                disabled={loading}
                required
                maxLength={120}
              />
            </div>
          </div>

          {/* Optional Admin Note */}
          <div className="adminEditEmailFieldGroup">
            <label htmlFor="adminNoteInput" className="adminEditEmailLabel">
              <span>Internal Admin Note</span>
              <span className="optionalTag">(Optional · Saved to order audit trail)</span>
            </label>
            <div className="textareaWithIconWrap">
              <FileText size={15} className="textareaFieldIcon" />
              <textarea
                id="adminNoteInput"
                value={adminNote}
                onChange={(e) => setAdminNote(e.target.value)}
                placeholder="e.g. Corrected typo after customer WhatsApp verification"
                className="adminEditEmailTextarea"
                rows={2}
                maxLength={500}
                disabled={loading}
              />
            </div>
            <div className="textareaCharCount">
              {adminNote.length}/500 characters
            </div>
          </div>

          {/* Information & Safety Notice */}
          <div className="adminEditEmailNotice">
            <Info size={14} className="noticeIcon" />
            <p>
              <strong>Safety & Audit:</strong> Updating this email refreshes order notifications, tracking alerts, and invoices for this order. It will not alter the registered user's account password, login email, or other orders.
            </p>
          </div>

          {/* Modal Actions */}
          <div className="adminEditEmailFooter">
            <button
              type="button"
              className="outlineBtn compact cancelBtn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn compact saveBtn"
              disabled={loading || !newEmail.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={14} className="spinIcon" />
                  <span>Saving Email...</span>
                </>
              ) : (
                <>
                  <ShieldCheck size={14} />
                  <span>Save Email</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
