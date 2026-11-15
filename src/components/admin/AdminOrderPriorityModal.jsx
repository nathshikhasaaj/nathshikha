import React, { useState, useEffect } from 'react';
import { X, AlertTriangle, ShieldAlert, Sparkles, Check, Clock, AlertCircle } from 'lucide-react';
import { api } from '../../services/api';
import './AdminOrderPriorityModal.css';

export default function AdminOrderPriorityModal({
  order,
  isOpen,
  onClose,
  onPriorityUpdated
}) {
  const [level, setLevel] = useState('auto');
  const [note, setNote] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (order) {
      const currentManual = order.manualPriority || order.manual_priority || {};
      setLevel(currentManual.level || 'auto');
      setNote(currentManual.note || '');
      setErrorMsg('');
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const orderId = order.id || order._id || order.order_no || order.orderNo;
  const currentMeta = order._priorityMeta || {};

  const handleSubmit = async (e) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const res = await api(`/admin/orders/${orderId}/priority`, {
        method: 'PATCH',
        body: JSON.stringify({ level, note: note.trim() })
      });

      if (res.ok && res.order) {
        if (onPriorityUpdated) {
          onPriorityUpdated(res.order);
        }
        onClose();
      } else {
        throw new Error(res.error || 'Failed to update priority');
      }
    } catch (err) {
      setErrorMsg(err.message || 'Failed to update priority');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="adminPriorityOverlay" onClick={onClose} role="dialog" aria-modal="true">
      <div className="adminPriorityDialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <div className="adminPriorityHeader">
          <div className="priorityHeaderTitle">
            <div className="priorityIconBadge">
              <ShieldAlert size={18} />
            </div>
            <div>
              <h3>Order Priority & Operational Notes</h3>
              <p>Manage order escalation for Order #{order.order_no || order.orderNo}</p>
            </div>
          </div>
          <button type="button" className="priorityCloseBtn" onClick={onClose}>
            <X size={18} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="adminPriorityForm">
          {/* Current System Status Banner */}
          <div className="priorityDiagnosticBanner">
            <div className="diagnosticTop">
              <span className="diagnosticLabel">Auto-Calculated System Priority:</span>
              <span className={`diagnosticBadge ${currentMeta.badgeClass || 'priorityNormal'}`}>
                {currentMeta.label || 'Normal'}
              </span>
            </div>
            <p className="diagnosticReason">{currentMeta.reason || 'Operating within normal SLAs'}</p>
          </div>

          {errorMsg && (
            <div className="priorityErrorBanner">
              <AlertCircle size={14} />
              <span>{errorMsg}</span>
            </div>
          )}

          {/* Level Options */}
          <div className="priorityFieldGroup">
            <label className="priorityFieldLabel">Select Priority Level:</label>
            <div className="priorityOptionsGrid">
              <label className={`priorityRadioCard ${level === 'auto' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priorityLevel"
                  value="auto"
                  checked={level === 'auto'}
                  onChange={() => setLevel('auto')}
                />
                <div className="radioCardContent">
                  <div className="radioCardHeader">
                    <span className="radioCardTitle">⚡ Automatic (Default)</span>
                    {level === 'auto' && <Check size={14} className="radioCheck" />}
                  </div>
                  <p className="radioCardDesc">Dynamically calculated by SLA rules, aging & timestamps.</p>
                </div>
              </label>

              <label className={`priorityRadioCard criticalCard ${level === 'critical' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priorityLevel"
                  value="critical"
                  checked={level === 'critical'}
                  onChange={() => setLevel('critical')}
                />
                <div className="radioCardContent">
                  <div className="radioCardHeader">
                    <span className="radioCardTitle">🚨 Critical Urgency</span>
                    {level === 'critical' && <Check size={14} className="radioCheck" />}
                  </div>
                  <p className="radioCardDesc">Immediate admin intervention required; pinned to Critical queue.</p>
                </div>
              </label>

              <label className={`priorityRadioCard highCard ${level === 'high' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priorityLevel"
                  value="high"
                  checked={level === 'high'}
                  onChange={() => setLevel('high')}
                />
                <div className="radioCardContent">
                  <div className="radioCardHeader">
                    <span className="radioCardTitle">🔴 High Priority</span>
                    {level === 'high' && <Check size={14} className="radioCheck" />}
                  </div>
                  <p className="radioCardDesc">Expedite artisan making and courier dispatch.</p>
                </div>
              </label>

              <label className={`priorityRadioCard mediumCard ${level === 'medium' ? 'selected' : ''}`}>
                <input
                  type="radio"
                  name="priorityLevel"
                  value="medium"
                  checked={level === 'medium'}
                  onChange={() => setLevel('medium')}
                />
                <div className="radioCardContent">
                  <div className="radioCardHeader">
                    <span className="radioCardTitle">🟡 Medium Priority</span>
                    {level === 'medium' && <Check size={14} className="radioCheck" />}
                  </div>
                  <p className="radioCardDesc">Attention needed soon; monitor closely.</p>
                </div>
              </label>
            </div>
          </div>

          {/* Internal Operational Note */}
          <div className="priorityFieldGroup">
            <label className="priorityFieldLabel" htmlFor="priorityNoteInput">
              Internal Operational Reason / Note (Optional):
            </label>
            <textarea
              id="priorityNoteInput"
              rows={3}
              className="priorityNoteTextarea"
              placeholder="e.g. Customer called: wedding on Nov 18th; VIP client requested early dispatch..."
              value={note}
              onChange={(e) => setNote(e.target.value)}
              maxLength={1000}
            />
            <small className="priorityCharCount">{note.length} / 1000 characters</small>
          </div>

          {/* Action Buttons */}
          <div className="priorityActionRow">
            <button
              type="button"
              className="priorityCancelBtn"
              onClick={onClose}
              disabled={isSubmitting}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn prioritySaveBtn"
              disabled={isSubmitting}
            >
              {isSubmitting ? 'Saving Changes…' : 'Save Priority'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}

