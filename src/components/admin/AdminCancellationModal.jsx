import React, { useState, useMemo } from 'react';
import {
  X,
  AlertTriangle,
  CheckCircle2,
  XCircle,
  MessageSquare,
  DollarSign,
  Loader2,
  Info
} from 'lucide-react';
import { money, formatOrderStatus } from '../../utils/formatters';
import './AdminCancellationModal.css';

export default function AdminCancellationModal({
  isOpen,
  onClose,
  order,
  onReviewCancellation,
  onProcessRefund
}) {
  const [activeAction, setActiveAction] = useState('approve'); // 'approve' | 'reject' | 'mark_refund'
  const [refundType, setRefundType] = useState('full'); // 'full' | 'with_charge'
  const [cancellationCharge, setCancellationCharge] = useState('');
  const [notes, setNotes] = useState('');
  const [refundTxRef, setRefundTxRef] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');

  if (!isOpen || !order) return null;

  const paidAmount = Number(order.total || 0);
  const numCharge = refundType === 'with_charge' ? Math.max(0, Number(cancellationCharge) || 0) : 0;
  const calculatedRefund = Math.max(0, paidAmount - numCharge);

  const cleanPhone = (order.phone || '').replace(/\D/g, '');
  const isApproved =
    order.cancellation_status === 'cancellation_approved' ||
    order.cancellationStatus === 'cancellation_approved';

  const handleApproveOrReject = async (e) => {
    e.preventDefault();
    setError('');

    if (activeAction === 'approve' && refundType === 'with_charge') {
      if (isNaN(numCharge) || numCharge < 0) {
        setError('Please enter a valid non-negative cancellation charge.');
        return;
      }
      if (numCharge > paidAmount) {
        setError(
          `Cancellation charge (${money(numCharge)}) cannot exceed the amount paid (${money(paidAmount)}).`
        );
        return;
      }
    }

    setLoading(true);
    try {
      if (activeAction === 'approve') {
        await onReviewCancellation(order.id || order._id, {
          action: 'approve',
          refundType,
          cancellationCharge: numCharge,
          notes: notes.trim()
        });
      } else if (activeAction === 'reject') {
        await onReviewCancellation(order.id || order._id, {
          action: 'reject',
          notes: notes.trim()
        });
      }
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to process cancellation review');
    } finally {
      setLoading(false);
    }
  };

  const handleMarkRefundComplete = async (e) => {
    e.preventDefault();
    setLoading(true);
    setError('');
    try {
      await onProcessRefund(order.id || order._id, {
        notes: notes.trim(),
        transactionRef: refundTxRef.trim()
      });
      onClose();
    } catch (err) {
      setError(err.message || 'Failed to mark refund as completed');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="adminCancellationModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="adminCancelHeader">
          <div className="adminCancelHeaderTitle">
            <AlertTriangle size={20} className="headerWarningIcon" />
            <div>
              <h3>Review Cancellation Request</h3>
              <p>Order #{order.order_no || order.orderNo}</p>
            </div>
          </div>
          <button type="button" className="modalCloseBtn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <div className="adminCancelBody">
          {/* Order & Customer Summary Box */}
          <div className="orderMetaOverviewGrid">
            <div className="overviewItem">
              <span className="overviewLabel">Customer</span>
              <b>{order.name}</b>
            </div>
            <div className="overviewItem">
              <span className="overviewLabel">Contact</span>
              <div className="phoneContactRow">
                <span>{order.phone}</span>
                {cleanPhone && (
                  <a
                    href={`https://wa.me/${cleanPhone}?text=Hi%20${encodeURIComponent(
                      order.name
                    )}%2C%20regarding%20your%20cancellation%20request%20for%20Nathshikha%20order%20%23${order.order_no || order.orderNo}`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="waChatPill"
                    title="Chat with customer on WhatsApp"
                  >
                    <MessageSquare size={11} /> WhatsApp
                  </a>
                )}
              </div>
            </div>
            <div className="overviewItem">
              <span className="overviewLabel">Order Status</span>
              <b className="statusHighlight">
                {formatOrderStatus(order.order_status || order.orderStatus)}
              </b>
            </div>
            <div className="overviewItem">
              <span className="overviewLabel">Eligible Paid Amount</span>
              <b className="amountHighlight">{money(paidAmount)}</b>
            </div>
          </div>

          {/* Cancellation Reason Box */}
          <div className="customerReasonBox">
            <span className="reasonTitle">Customer's Stated Reason for Cancellation:</span>
            <blockquote className="reasonText">
              "{order.cancellation_reason || order.cancellationReason || 'No specific reason provided'}"
            </blockquote>
            {order.cancellation_requested_at && (
              <small className="requestedDate">
                Submitted on{' '}
                {new Date(order.cancellation_requested_at).toLocaleString('en-IN', {
                  dateStyle: 'medium',
                  timeStyle: 'short'
                })}
              </small>
            )}
          </div>

          {isApproved ? (
            /* Refund Process Flow for already approved order */
            <form onSubmit={handleMarkRefundComplete} className="refundProcessForm">
              <div className="approvedRefundInfoBox">
                <CheckCircle2 size={18} color="#0d6efd" />
                <div>
                  <h4>Cancellation is Approved · Refund Pending</h4>
                  <p>
                    Refund amount of <b>{money(order.refund_amount || calculatedRefund)}</b> is waiting to be processed to the customer.
                  </p>
                </div>
              </div>

              <div className="formGroup">
                <label htmlFor="refundTxRef">Refund Payment Transaction / UTR Ref (Optional)</label>
                <input
                  id="refundTxRef"
                  type="text"
                  placeholder="e.g. UPI/123456789012 or Bank Ref"
                  value={refundTxRef}
                  onChange={(e) => setRefundTxRef(e.target.value)}
                />
              </div>

              <div className="formGroup">
                <label htmlFor="refundNotes">Admin Processing Notes (Optional)</label>
                <textarea
                  id="refundNotes"
                  rows={2}
                  placeholder="e.g. Refunded to customer's Google Pay account directly."
                  value={notes}
                  onChange={(e) => setNotes(e.target.value)}
                />
              </div>

              {error && <div className="adminCancelError">{error}</div>}

              <div className="adminCancelActions">
                <button type="button" className="outlineBtn" onClick={onClose} disabled={loading}>
                  Close
                </button>
                <button type="submit" className="goldBtn processRefundBtn" disabled={loading}>
                  {loading ? (
                    <>
                      <Loader2 size={14} className="spinIcon" />
                      <span>Processing…</span>
                    </>
                  ) : (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Mark Refund Completed</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          ) : (
            /* Review Cancellation Decision Form (Approve / Reject) */
            <form onSubmit={handleApproveOrReject} className="decisionForm">
              <div className="decisionTypeSelector">
                <button
                  type="button"
                  className={`decisionBtn approveBtn ${activeAction === 'approve' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveAction('approve');
                    setError('');
                  }}
                >
                  <CheckCircle2 size={16} />
                  <span>Approve Cancellation</span>
                </button>
                <button
                  type="button"
                  className={`decisionBtn rejectBtn ${activeAction === 'reject' ? 'active' : ''}`}
                  onClick={() => {
                    setActiveAction('reject');
                    setError('');
                  }}
                >
                  <XCircle size={16} />
                  <span>Reject Cancellation</span>
                </button>
              </div>

              {activeAction === 'approve' ? (
                <div className="approvalOptionsBox">
                  <span className="boxHeading">Refund Calculation & Options:</span>

                  <div className="refundTypeRadioGroup">
                    <label className="refundRadioOption">
                      <input
                        type="radio"
                        name="refundType"
                        value="full"
                        checked={refundType === 'full'}
                        onChange={() => setRefundType('full')}
                      />
                      <div>
                        <b>Full Refund</b>
                        <small>Refund the entire eligible amount paid ({money(paidAmount)})</small>
                      </div>
                    </label>

                    <label className="refundRadioOption">
                      <input
                        type="radio"
                        name="refundType"
                        value="with_charge"
                        checked={refundType === 'with_charge'}
                        onChange={() => setRefundType('with_charge')}
                      />
                      <div>
                        <b>Refund After Cancellation Charge</b>
                        <small>Deduct a processing / customization fee before refunding</small>
                      </div>
                    </label>
                  </div>

                  {refundType === 'with_charge' && (
                    <div className="cancellationChargeInputRow">
                      <label htmlFor="chargeInput">Cancellation Charge (₹):</label>
                      <div className="chargeInputWrap">
                        <span>₹</span>
                        <input
                          id="chargeInput"
                          type="number"
                          min="0"
                          max={paidAmount}
                          step="1"
                          placeholder="0"
                          value={cancellationCharge}
                          onChange={(e) => {
                            setCancellationCharge(e.target.value);
                            setError('');
                          }}
                          required
                        />
                      </div>
                    </div>
                  )}

                  {/* Live Calculation Box */}
                  <div className="calculationSummaryBox">
                    <div className="calcRow">
                      <span>Amount Paid by Customer:</span>
                      <b>{money(paidAmount)}</b>
                    </div>
                    {refundType === 'with_charge' && (
                      <div className="calcRow chargeRow">
                        <span>Cancellation Charge:</span>
                        <b>- {money(numCharge)}</b>
                      </div>
                    )}
                    <div className="calcRow finalRefundRow">
                      <span>Refund Amount:</span>
                      <b className="finalRefundNumber">{money(calculatedRefund)}</b>
                    </div>
                  </div>

                  <div className="formGroup" style={{ marginTop: 12 }}>
                    <label htmlFor="adminNotes">Admin Approval Notes (Optional):</label>
                    <input
                      id="adminNotes"
                      type="text"
                      placeholder="e.g. Approved as per customer request"
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              ) : (
                <div className="rejectionOptionsBox">
                  <div className="rejectNoticeInfo">
                    <Info size={16} />
                    <p>
                      Rejecting the cancellation will keep the order in its current status (<b>{order.order_status || 'placed'}</b>) and notify the customer that processing will continue. No refund will be scheduled.
                    </p>
                  </div>

                  <div className="formGroup">
                    <label htmlFor="rejectReason">Reason for Rejection (Optional):</label>
                    <textarea
                      id="rejectReason"
                      rows={3}
                      placeholder="e.g. Order is already customized or non-cancellable as discussed."
                      value={notes}
                      onChange={(e) => setNotes(e.target.value)}
                    />
                  </div>
                </div>
              )}

              {error && <div className="adminCancelError">{error}</div>}

              <div className="adminCancelActions">
                <button type="button" className="outlineBtn" onClick={onClose} disabled={loading}>
                  Cancel
                </button>
                <button
                  type="submit"
                  className={`goldBtn ${activeAction === 'reject' ? 'rejectSubmitBtn' : ''}`}
                  disabled={loading}
                >
                  {loading ? (
                    <>
                      <Loader2 size={14} className="spinIcon" />
                      <span>Saving…</span>
                    </>
                  ) : activeAction === 'approve' ? (
                    <>
                      <CheckCircle2 size={14} />
                      <span>Confirm & Approve Cancellation</span>
                    </>
                  ) : (
                    <>
                      <XCircle size={14} />
                      <span>Confirm Rejection</span>
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>
    </div>
  );
}
