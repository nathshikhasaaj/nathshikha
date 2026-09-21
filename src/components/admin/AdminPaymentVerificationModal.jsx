import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, AlertCircle, CheckCircle, Smartphone, Edit3 } from 'lucide-react';
import { money } from '../../utils/formatters';
import './AdminPaymentVerificationModal.css';

const PAYMENT_APP_OPTIONS = [
  'Google Pay',
  'PhonePe',
  'Paytm',
  'BHIM',
  'Bank Transfer',
  'Other'
];

export default function AdminPaymentVerificationModal({
  order,
  isOpen,
  onClose,
  onVerify,
  isEdit = false,
  onSaveEdit
}) {
  const [transactionId, setTransactionId] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay');
  const [customApp, setCustomApp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  const isEditMode = Boolean(isEdit);

  useEffect(() => {
    if (order) {
      setTransactionId(order.payment_transaction_id || order.upi_utr || '');
      const currentApp = order.payment_app || order.paymentApp || 'Google Pay';
      if (PAYMENT_APP_OPTIONS.includes(currentApp)) {
        setPaymentApp(currentApp);
        setCustomApp('');
      } else if (currentApp) {
        setPaymentApp('Other');
        setCustomApp(currentApp);
      } else {
        setPaymentApp('Google Pay');
        setCustomApp('');
      }
      setError('');
    }
  }, [order, isOpen, isEdit]);

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError('');

    const cleanTxId = transactionId.trim();
    if (!cleanTxId) {
      setError('Transaction ID is required.');
      return;
    }

    const cleanApp = paymentApp === 'Other' ? customApp.trim() : paymentApp;
    if (!cleanApp) {
      setError('Please select or specify the Payment App / Mode.');
      return;
    }

    setLoading(true);
    try {
      if (isEditMode && onSaveEdit) {
        await onSaveEdit(order.id || order._id, {
          transactionId: cleanTxId,
          paymentApp: cleanApp
        });
      } else if (onVerify) {
        await onVerify(order.id || order._id, {
          transactionId: cleanTxId,
          paymentApp: cleanApp
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || (isEditMode ? 'Failed to update payment details.' : 'Failed to verify payment. Please try again.'));
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="modalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Modal Header */}
        <div className="modalHeader">
          <div className="modalHeaderTitle">
            <div className={`modalBadge ${isEditMode ? 'editBadge' : ''}`}>
              {isEditMode ? <Edit3 size={18} /> : <ShieldCheck size={18} />}
            </div>
            <div>
              <h3>{isEditMode ? 'Edit Payment Details' : 'Verify Payment'}</h3>
              <p>Order ID: #{order.order_no}</p>
            </div>
          </div>
          <button
            className="modalCloseBtn"
            onClick={onClose}
            type="button"
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Order Summary Snapshot */}
        <div className="orderSnapshot">
          <div className="snapshotRow">
            <span>Customer:</span>
            <strong>{order.name}</strong>
          </div>
          <div className="snapshotRow">
            <span>Contact:</span>
            <strong>{order.phone}</strong>
          </div>
          <div className="snapshotRow">
            <span>Amount:</span>
            <strong className="snapshotAmount">{money(order.total)}</strong>
          </div>
          <div className="snapshotRow">
            <span>Current Status:</span>
            <strong style={{ color: order.payment_status === 'verified' ? '#15803d' : '#b45309' }}>
              {order.payment_status === 'verified' ? 'Verified' : 'Pending Verification'}
            </strong>
          </div>
        </div>

        {/* Verification / Edit Form */}
        <form onSubmit={handleSubmit} className="verifyForm">
          {error && (
            <div className="modalAlert">
              <AlertCircle size={15} />
              <span>{error}</span>
            </div>
          )}

          {/* 1. Transaction ID */}
          <div className="formGroup">
            <label htmlFor="txIdInput">
              Transaction ID <span className="reqStar">*</span>
            </label>
            <input
              id="txIdInput"
              type="text"
              required
              placeholder="Enter payment transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="modalInput"
              autoFocus
            />
            <small className="fieldHint">
              {isEditMode
                ? 'Correct or update the recorded transaction / reference ID.'
                : 'Enter the verified transaction ID from your receiving account.'}
            </small>
          </div>

          {/* 2. Payment App / Mode */}
          <div className="formGroup">
            <label htmlFor="paymentAppSelect">
              Payment App / Mode <span className="reqStar">*</span>
            </label>
            <div className="selectWrapper">
              <Smartphone size={16} className="selectIcon" />
              <select
                id="paymentAppSelect"
                value={paymentApp}
                onChange={(e) => setPaymentApp(e.target.value)}
                className="modalSelect"
                required
              >
                {PAYMENT_APP_OPTIONS.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {/* If "Other" selected */}
          {paymentApp === 'Other' && (
            <div className="formGroup">
              <label htmlFor="customAppInput">
                Specify Mode / Bank <span className="reqStar">*</span>
              </label>
              <input
                id="customAppInput"
                type="text"
                required
                placeholder="e.g. HDFC NetBanking, Amazon Pay"
                value={customApp}
                onChange={(e) => setCustomApp(e.target.value)}
                className="modalInput"
              />
            </div>
          )}

          {/* Notice Banner */}
          <div className="autoConfirmNotice">
            <CheckCircle size={15} />
            <span>
              {isEditMode ? (
                <>Editing will update the recorded Transaction ID and payment mode. Verified status and existing order stage will be <b>preserved</b>.</>
              ) : (
                <>On verification, payment status will become <b>Verified</b> and order status will automatically change to <b>Confirmed</b>.</>
              )}
            </span>
          </div>

          {/* Modal Actions */}
          <div className="modalActions">
            <button
              type="button"
              className="outlineBtn modalCancelBtn"
              onClick={onClose}
              disabled={loading}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn modalSubmitBtn"
              disabled={loading}
            >
              {loading
                ? isEditMode
                  ? 'SAVING…'
                  : 'VERIFYING…'
                : isEditMode
                ? 'Save Changes'
                : 'Verify Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

