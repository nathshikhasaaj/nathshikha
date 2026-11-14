import React, { useState, useRef, useEffect } from 'react';
import {
  MoreVertical,
  Eye,
  Pencil,
  Trash2,
  EyeOff,
  Star,
  CheckCircle2
} from 'lucide-react';
import './AdminRowActionMenu.css';

export default function AdminRowActionMenu({
  product,
  onView,
  onEdit,
  onToggleActive,
  onToggleBestseller,
  onDelete
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [dropUp, setDropUp] = useState(false);
  const menuRef = useRef(null);
  const triggerRef = useRef(null);

  const isLive = Boolean(product?.active);
  const isBestseller = Boolean(
    product?.isBestseller || product?.is_bestseller || product?.tag === 'BESTSELLER'
  );

  // Close on outside click or touch
  useEffect(() => {
    function handleClickOutside(e) {
      if (menuRef.current && !menuRef.current.contains(e.target)) {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      document.addEventListener('mousedown', handleClickOutside);
      document.addEventListener('touchstart', handleClickOutside);
    }
    return () => {
      document.removeEventListener('mousedown', handleClickOutside);
      document.removeEventListener('touchstart', handleClickOutside);
    };
  }, [isOpen]);

  // Close on Escape key
  useEffect(() => {
    function handleKeyDown(e) {
      if (e.key === 'Escape') {
        setIsOpen(false);
      }
    }
    if (isOpen) {
      window.addEventListener('keydown', handleKeyDown);
    }
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [isOpen]);

  // Detect available viewport space to flip upward if near bottom edge
  const handleToggle = (e) => {
    e.stopPropagation();
    if (!isOpen && triggerRef.current) {
      const rect = triggerRef.current.getBoundingClientRect();
      const spaceBelow = window.innerHeight - rect.bottom;
      // If less than 210px space below, open upward
      if (spaceBelow < 210 && rect.top > spaceBelow) {
        setDropUp(true);
      } else {
        setDropUp(false);
      }
    }
    setIsOpen((prev) => !prev);
  };

  const handleAction = (e, callback) => {
    e.stopPropagation();
    setIsOpen(false);
    if (callback) callback();
  };

  return (
    <div className="adminRowActionWrap" ref={menuRef} onClick={(e) => e.stopPropagation()}>
      <button
        ref={triggerRef}
        type="button"
        className={`rowActionTriggerBtn ${isOpen ? 'isActive' : ''}`}
        onClick={handleToggle}
        aria-label="Product actions"
        aria-expanded={isOpen}
        title="More actions"
      >
        <MoreVertical size={16} />
      </button>

      {isOpen && (
        <div className={`rowActionDropdownMenu ${dropUp ? 'dropUp' : 'dropDown'}`} role="menu">
          <button
            type="button"
            className="rowActionMenuItem"
            onClick={(e) => handleAction(e, onView)}
            role="menuitem"
          >
            <Eye size={14} className="actionItemIcon" />
            <span>View Specifications</span>
          </button>

          <button
            type="button"
            className="rowActionMenuItem"
            onClick={(e) => handleAction(e, onEdit)}
            role="menuitem"
          >
            <Pencil size={14} className="actionItemIcon" />
            <span>Edit Product</span>
          </button>

          {onToggleActive && (
            <button
              type="button"
              className="rowActionMenuItem"
              onClick={(e) => handleAction(e, () => onToggleActive(product))}
              role="menuitem"
            >
              {isLive ? (
                <>
                  <EyeOff size={14} className="actionItemIcon textMuted" />
                  <span>Hide from Store</span>
                </>
              ) : (
                <>
                  <CheckCircle2 size={14} className="actionItemIcon textSuccess" />
                  <span>Publish to Store</span>
                </>
              )}
            </button>
          )}

          {onToggleBestseller && (
            <button
              type="button"
              className="rowActionMenuItem"
              onClick={(e) => handleAction(e, () => onToggleBestseller(product))}
              role="menuitem"
            >
              <Star
                size={14}
                className="actionItemIcon textAmber"
                fill={isBestseller ? '#d97706' : 'none'}
              />
              <span>{isBestseller ? 'Remove Bestseller' : 'Mark as Bestseller'}</span>
            </button>
          )}

          <div className="rowActionMenuDivider" />

          <button
            type="button"
            className="rowActionMenuItem textDanger"
            onClick={(e) => handleAction(e, onDelete)}
            role="menuitem"
          >
            <Trash2 size={14} className="actionItemIcon" />
            <span>Delete Permanently</span>
          </button>
        </div>
      )}
    </div>
  );
}

