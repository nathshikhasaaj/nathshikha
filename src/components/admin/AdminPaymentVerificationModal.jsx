import React, { useState, useEffect } from 'react';
import { ShieldCheck, X, AlertCircle, CheckCircle, Smartphone } from 'lucide-react';
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
  onVerify
}) {
  const [transactionId, setTransactionId] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay');
  const [customApp, setCustomApp] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  useEffect(() => {
    if (order) {
      setTransactionId(order.payment_transaction_id || order.upi_utr || '');
      setPaymentApp(order.payment_app || 'Google Pay');
      setCustomApp('');
      setError('');
    }
  }, [order, isOpen]);

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
      await onVerify(order.id, {
        transactionId: cleanTxId,
        paymentApp: cleanApp
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to verify payment. Please try again.');
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
            <div className="modalBadge">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3>Verify Payment</h3>
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
        </div>

        {/* Verification Form */}
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
              placeholder="Enter customer's transaction ID"
              value={transactionId}
              onChange={(e) => setTransactionId(e.target.value)}
              className="modalInput"
            />
            <small className="fieldHint">
              Enter the verified transaction ID from your receiving account.
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

          {/* Auto confirmation note */}
          <div className="autoConfirmNotice">
            <CheckCircle size={15} />
            <span>
              On verification, payment status will become <b>Verified</b> and order status will automatically change to <b>Confirmed</b>.
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
              {loading ? 'VERIFYING…' : 'Verify Payment'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
