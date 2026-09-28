import React, { useState } from 'react';
import { QRCodeSVG } from 'qrcode.react';
import {
  X,
  ShieldCheck,
  CreditCard,
  Copy,
  Check,
  CheckCircle2,
  Clock,
  AlertCircle,
  Loader2,
  QrCode,
  ArrowRight
} from 'lucide-react';
import { api } from '../../services/api';
import { money } from '../../utils/formatters';
import './AssistedPaymentModal.css';

const DEFAULT_UPI_ID = '9699668421@okbizaxis';
const PAYEE_NAME = 'Nathshikha Saaj';

const PAYMENT_APP_OPTIONS = [
  'Google Pay',
  'PhonePe',
  'Paytm',
  'BHIM',
  'Cred',
  'Amazon Pay',
  'Bank Transfer / IMPS',
  'Other UPI App'
];

export default function AssistedPaymentModal({
  isOpen,
  onClose,
  order,
  onPaymentSuccess,
  onPaymentClaimed,
  setToast
}) {
  const [transactionId, setTransactionId] = useState('');
  const [paymentApp, setPaymentApp] = useState('Google Pay');
  const [copiedKey, setCopiedKey] = useState(null);
  const [submitting, setSubmitting] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const orderNo = order.order_no || order.orderNo;
  const grandTotal = Number(order.total || 0);
  const configuredUpiId = DEFAULT_UPI_ID;
  const upiLink = `upi://pay?pa=${configuredUpiId}&pn=${encodeURIComponent(
    PAYEE_NAME
  )}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent(`Order #${orderNo}`)}`;

  const handleCopyText = async (text, key, successMsg) => {
    try {
      if (navigator.clipboard && window.isSecureContext) {
        await navigator.clipboard.writeText(text);
      } else {
        const textArea = document.createElement('textarea');
        textArea.value = text;
        textArea.style.position = 'fixed';
        textArea.style.left = '-999999px';
        document.body.appendChild(textArea);
        textArea.focus();
        textArea.select();
        document.execCommand('copy');
        textArea.remove();
      }
      setCopiedKey(key);
      if (setToast) setToast(successMsg);
      setTimeout(() => setCopiedKey(null), 2500);
    } catch {
      if (setToast) setToast('Failed to copy to clipboard');
    }
  };

  const handleSubmitPaid = async (e) => {
    if (e) e.preventDefault();
    setError('');

    const cleanTx = transactionId.trim();
    if (!cleanTx) {
      setError('Please enter your 12-digit UPI Reference ID / UTR or Transaction ID from your payment app.');
      return;
    }

    setSubmitting(true);

    try {
      const orderId = order.id || order._id || orderNo;
      const res = await api(`/orders/${encodeURIComponent(orderId)}/claim-payment`, {
        method: 'POST',
        body: JSON.stringify({
          transactionId: cleanTx,
          paymentApp,
          claimedAmount: grandTotal,
          guestToken: order.guest_token || order.guestToken,
          email: order.email,
          phone: order.phone
        })
      });

      if (res.ok && res.order) {
        if (setToast) {
          setToast('Payment submission received! Admin will verify your payment shortly.');
        }
        if (onPaymentSuccess) {
          onPaymentSuccess(res.order);
        } else if (onPaymentClaimed) {
          onPaymentClaimed(res.order);
        }
        onClose();
      } else {
        throw new Error(res.error || 'Failed to submit payment proof.');
      }
    } catch (err) {
      setError(err.message || 'Failed to submit payment proof. Please try again.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="assistedPayModalOverlay" onClick={onClose}>
      <div
        className="assistedPayModalContainer"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        {/* Header */}
        <div className="assistedPayHeader">
          <div className="assistedPayHeaderLeft">
            <div className="payHeaderBadge">
              <ShieldCheck size={18} />
            </div>
            <div>
              <h3>Prepaid UPI Payment</h3>
              <span>ORDER #{orderNo} · Total Amount: <b>{money(grandTotal)}</b></span>
            </div>
          </div>
          <button
            type="button"
            className="assistedPayCloseBtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        {/* Scrollable Body */}
        <div className="assistedPayBody">
          {error && (
            <div className="assistedPayErrorBanner">
              <AlertCircle size={16} />
              <span>{error}</span>
            </div>
          )}

          {/* QR Code Card */}
          <div className="assistedPayQrCard">
            <div className="qrWrapper">
              <QRCodeSVG value={upiLink} size={175} includeMargin />
            </div>
            <span className="qrSupportText">
              Scan with Google Pay, PhonePe, Paytm, BHIM or any UPI app
            </span>
          </div>

          {/* UPI ID & Amount Copy Section */}
          <div className="assistedPayDetailsBox">
            <div className="payeeRow">
              <span className="detailLabel">Payee:</span>
              <span className="detailVal">{PAYEE_NAME}</span>
            </div>

            <div className="copyRow">
              <div className="copyRowLeft">
                <span className="detailLabel">UPI ID</span>
                <b className="copyRowVal">{configuredUpiId}</b>
              </div>
              <button
                type="button"
                className={`copyActionBtn ${copiedKey === 'upi' ? 'copied' : ''}`}
                onClick={() => handleCopyText(configuredUpiId, 'upi', 'UPI ID copied to clipboard!')}
              >
                {copiedKey === 'upi' ? (
                  <>
                    <Check size={13} color="#16a34a" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> COPY UPI ID
                  </>
                )}
              </button>
            </div>

            <div className="copyRow">
              <div className="copyRowLeft">
                <span className="detailLabel">Exact Payable Amount</span>
                <b className="copyRowVal amountHighlight">{money(grandTotal)}</b>
              </div>
              <button
                type="button"
                className={`copyActionBtn ${copiedKey === 'amount' ? 'copied' : ''}`}
                onClick={() => handleCopyText(String(grandTotal), 'amount', `Amount ₹${grandTotal} copied!`)}
              >
                {copiedKey === 'amount' ? (
                  <>
                    <Check size={13} color="#16a34a" /> Copied!
                  </>
                ) : (
                  <>
                    <Copy size={13} /> COPY AMOUNT
                  </>
                )}
              </button>
            </div>
          </div>

          {/* Form: UTR & Payment App */}
          <form className="paymentConfirmationForm" onSubmit={handleSubmitPaid}>
            <div className="formSectionTitle">
              <CheckCircle2 size={16} color="var(--gold, #c69a59)" />
              <h4>Submit Payment Confirmation</h4>
            </div>
            <p className="formHelperText">
              After completing the transfer in your UPI app, enter your 12-digit UTR / Reference ID below to confirm.
            </p>

            <div className="payFormGroup">
              <label htmlFor="assistedTxId">UPI Reference ID / UTR Number *</label>
              <input
                id="assistedTxId"
                type="text"
                placeholder="e.g. 427819827361 or UPI-123456"
                value={transactionId}
                onChange={(e) => {
                  setTransactionId(e.target.value.trim());
                  setError('');
                }}
                required
              />
            </div>

            <div className="payFormGroup">
              <label htmlFor="assistedPayApp">Payment App Used</label>
              <select
                id="assistedPayApp"
                value={paymentApp}
                onChange={(e) => setPaymentApp(e.target.value)}
              >
                {PAYMENT_APP_OPTIONS.map((app) => (
                  <option key={app} value={app}>
                    {app}
                  </option>
                ))}
              </select>
            </div>

            <div className="verificationDisclaimerPill">
              <Clock size={14} color="#b45309" />
              <span>
                Our admin team will verify your UTR before confirming the order. No fake or unverified payments are accepted.
              </span>
            </div>

            <button
              type="submit"
              className="goldBtn submitPaidBtn"
              disabled={submitting || !transactionId.trim()}
            >
              {submitting ? (
                <>
                  <Loader2 size={16} className="spinIcon" />
                  <span>Submitting Payment…</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={16} />
                  <span>I HAVE PAID · SUBMIT CONFIRMATION</span>
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
