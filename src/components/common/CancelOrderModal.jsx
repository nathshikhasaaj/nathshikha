import React, { useState } from 'react';
import { X, AlertTriangle, Loader2 } from 'lucide-react';
import { api } from '../../services/api';
import './CancelOrderModal.css';

export default function CancelOrderModal({
  isOpen,
  onClose,
  order,
  onSuccess,
  setToast
}) {
  const [reason, setReason] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const handleSubmit = async (e) => {
    e.preventDefault();
    if (!reason.trim()) {
      setError('Please provide a reason for cancelling this order.');
      return;
    }

    setLoading(true);
    setError('');

    try {
      const orderId = order.id || order._id || order.order_no;
      const res = await api(`/orders/${orderId}/cancel-request`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason.trim() })
      });

      if (res.ok) {
        if (setToast) setToast('Cancellation request submitted for review.');
        if (onSuccess) onSuccess(res.order || order);
        onClose();
      }
    } catch (err) {
      setError(err.message || 'Failed to submit cancellation request.');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="cancelOrderModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="cancelModalHeader">
          <div className="cancelModalTitle">
            <AlertTriangle size={20} className="cancelAlertIcon" />
            <div>
              <h3>Cancel Order</h3>
              <p>Order #{order.order_no}</p>
            </div>
          </div>
          <button
            type="button"
            className="modalCloseBtn"
            onClick={onClose}
            aria-label="Close"
          >
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="cancelModalBody">
          <div className="cancelModalNotice">
            <p>
              Please note that submitting this form will send a <b>cancellation request</b> to our studio team for review.
            </p>
          </div>

          <div className="formGroup">
            <label htmlFor="cancelReason">
              Why would you like to cancel this order? <span className="req">*</span>
            </label>
            <textarea
              id="cancelReason"
              rows={4}
              placeholder="Please tell us the reason for cancellation..."
              value={reason}
              onChange={(e) => {
                setReason(e.target.value);
                setError('');
              }}
              required
            />
          </div>

          {error && <div className="cancelErrorNotice">{error}</div>}

          <div className="cancelModalActions">
            <button
              type="button"
              className="outlineBtn keepOrderBtn"
              onClick={onClose}
              disabled={loading}
            >
              Keep Order
            </button>
            <button
              type="submit"
              className="goldBtn requestCancelBtn"
              disabled={loading || !reason.trim()}
            >
              {loading ? (
                <>
                  <Loader2 size={15} className="spinIcon" />
                  <span>Submitting…</span>
                </>
              ) : (
                <span>Request Cancellation</span>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
