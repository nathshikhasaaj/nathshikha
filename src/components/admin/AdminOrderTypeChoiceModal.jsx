import React, { useEffect } from 'react';
import { ShoppingBag, Sparkles, X, Check, ArrowRight, Layers } from 'lucide-react';
import './AdminOrderTypeChoiceModal.css';

export default function AdminOrderTypeChoiceModal({
  isOpen,
  onClose,
  onSelectRegular,
  onSelectCustom
}) {
  useEffect(() => {
    if (isOpen) {
      const originalOverflow = document.body.style.overflow;
      document.body.style.overflow = 'hidden';
      return () => {
        document.body.style.overflow = originalOverflow;
      };
    }
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div className="orderTypeModalOverlay" onClick={onClose} role="dialog" aria-modal="true" aria-labelledby="orderTypeHeading">
      <div className="orderTypeModalDialog" onClick={(e) => e.stopPropagation()}>
        <header className="orderTypeModalHeader">
          <div className="orderTypeHeaderLeft">
            <div className="orderTypeIconBadge">
              <Layers size={22} />
            </div>
            <div className="orderTypeTitleGroup">
              <h2 id="orderTypeHeading">Create Order</h2>
              <p>Select order creation mode for customer</p>
            </div>
          </div>
          <button
            type="button"
            className="orderTypeCloseBtn"
            onClick={onClose}
            aria-label="Close"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        <div className="orderTypeModalBody">
          {/* 1. REGULAR ORDER CARD */}
          <div
            className="orderTypeChoiceCard regularOrderCard"
            onClick={() => {
              onClose();
              onSelectRegular();
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
                onSelectRegular();
              }
            }}
          >
            <div className="choiceCardIconBox regularIcon">
              <ShoppingBag size={24} />
            </div>
            <h3 className="choiceCardTitle">Regular Order</h3>
            <p className="choiceCardDesc">
              Standard order using catalogue products with automated stock deduction, custom options/parameters, and pincode-based delivery calculation.
            </p>
            <ul className="choiceCardFeatures">
              <li>
                <Check size={13} />
                <span>Product catalogue picker</span>
              </li>
              <li>
                <Check size={13} />
                <span>Inventory stock reservation</span>
              </li>
              <li>
                <Check size={13} />
                <span>Pincode-based delivery rules</span>
              </li>
              <li>
                <Check size={13} />
                <span>Coupon discounts & gifts</span>
              </li>
            </ul>
            <button
              type="button"
              className="choiceActionBtn regularBtn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onSelectRegular();
              }}
            >
              <span>+ Create Regular Order</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* 2. CUSTOM ORDER CARD */}
          <div
            className="orderTypeChoiceCard customOrderCard"
            onClick={() => {
              onClose();
              onSelectCustom();
            }}
            tabIndex={0}
            role="button"
            onKeyDown={(e) => {
              if (e.key === 'Enter' || e.key === ' ') {
                e.preventDefault();
                onClose();
                onSelectCustom();
              }
            }}
          >
            <span className="choiceCardBadge">Bespoke Design</span>
            <div className="choiceCardIconBox customIcon">
              <Sparkles size={24} />
            </div>
            <h3 className="choiceCardTitle">Custom Order</h3>
            <p className="choiceCardDesc">
              Handcrafted bespoke jewellery creation with custom design images, individualized design notes, manual unit pricing, and manual shipping control.
            </p>
            <ul className="choiceCardFeatures">
              <li>
                <Check size={13} />
                <span>Upload design artwork & sketches</span>
              </li>
              <li>
                <Check size={13} />
                <span>Manual unit pricing & quantities</span>
              </li>
              <li>
                <Check size={13} />
                <span>Design notes & artisan instructions</span>
              </li>
              <li>
                <Check size={13} />
                <span>Manual shipping charge control</span>
              </li>
            </ul>
            <button
              type="button"
              className="choiceActionBtn customBtn"
              onClick={(e) => {
                e.stopPropagation();
                onClose();
                onSelectCustom();
              }}
            >
              <span>+ Create Custom Order</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        <footer className="orderTypeModalFooter">
          <span>Both order types follow the existing payment verification and confirmation lifecycle.</span>
        </footer>
      </div>
    </div>
  );
}

