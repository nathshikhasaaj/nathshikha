import React from 'react';
import { Link } from 'react-router-dom';
import { CheckCircle2, AlertCircle, Info, X, ShoppingBag } from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import './Toast.css';

export default function Toast() {
  const { toast, hideToast } = useToast();

  if (!toast || (!toast.message && !toast.product)) return null;

  const type = toast.type || 'success';
  const product = toast.product;
  const action = toast.action;

  return (
    <div className={`toast toast--${type}`} role="alert" aria-live="assertive">
      <div className="toastLeft">
        {type === 'success' && <CheckCircle2 className="toastStatusIcon toastStatusIcon--success" size={18} />}
        {type === 'error' && <AlertCircle className="toastStatusIcon toastStatusIcon--error" size={18} />}
        {type === 'info' && <Info className="toastStatusIcon toastStatusIcon--info" size={18} />}

        {product?.img && (
          <img
            src={product.img}
            alt={product.name || 'Product'}
            className="toastProductImg"
          />
        )}

        <div className="toastText">
          {product?.name && <b className="toastProductName">{product.name}</b>}
          <span className="toastMessage">{toast.message}</span>
        </div>
      </div>

      <div className="toastRight">
        {action && (
          <Link
            to={action.to || '/cart'}
            className="toastActionBtn"
            onClick={hideToast}
          >
            <ShoppingBag size={12} />
            <span>{action.label || 'VIEW BAG'}</span>
          </Link>
        )}

        <button
          type="button"
          className="toastCloseBtn"
          onClick={hideToast}
          aria-label="Dismiss notification"
        >
          <X size={14} />
        </button>
      </div>
    </div>
  );
}

