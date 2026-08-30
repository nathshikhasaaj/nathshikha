import React from 'react';
import { CheckCircle } from 'lucide-react';
import { money } from '../../utils/formatters';
import './AdminPaymentList.css';

export default function AdminPaymentList({ pendingOrders, approve, updateOrder }) {
  return (
    <div className="adminCard">
      <div className="cardHeading">
        <h3>UPI payment verification</h3>
        <span>{pendingOrders.length} need attention</span>
      </div>

      {pendingOrders.length > 0 ? (
        pendingOrders.map((o) => (
          <div className="paymentRow" key={o.id}>
            <div>
              <b>{o.order_no}</b>
              <span>
                {o.name} · {money(o.total)}
              </span>
              <span>
                UTR: <strong>{o.upi_utr || 'Not submitted yet'}</strong>
              </span>
              <small>{new Date(o.created_at).toLocaleString()}</small>
            </div>

            <div>
              {o.upi_utr ? (
                <button
                  className="goldBtn compact"
                  onClick={() => approve(o)}
                  type="button"
                >
                  <CheckCircle /> APPROVE PAYMENT
                </button>
              ) : (
                <span className="pendingPill">WAITING FOR UTR</span>
              )}

              <select
                value={o.payment_status}
                onChange={(e) => updateOrder(o.id, e.target.value, o.order_status)}
              >
                <option value="pending">pending</option>
                <option value="verification_pending">verification_pending</option>
                <option value="paid">paid</option>
              </select>
            </div>
          </div>
        ))
      ) : (
        <div className="empty small">
          <CheckCircle />
          <p>All UPI payments are reviewed.</p>
        </div>
      )}
    </div>
  );
}
