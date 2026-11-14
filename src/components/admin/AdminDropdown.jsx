import React, { useState, useRef, useEffect, useMemo } from 'react';
import { ChevronDown, Check, Search, X } from 'lucide-react';
import './AdminDropdown.css';

export default function AdminDropdown({
  label,
  value,
  options = [],
  onChange,
  placeholder = 'Select option',
  direction = 'auto', // 'auto' | 'down' | 'up'
  fullWidth = false,
  minWidth = '160px',
  searchableThreshold = 8,
  className = '',
  menuClassName = ''
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [filterQuery, setFilterQuery] = useState('');
  const [computedDirection, setComputedDirection] = useState('down');

  const dropdownRef = useRef(null);
  const triggerRef = useRef(null);
  const searchInputRef = useRef(null);

  // Close dropdown on outside click or touch
  useEffect(() => {
    function handleClickOutside(e) {
      if (dropdownRef.current && !dropdownRef.current.contains(e.target)) {
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

  // Close dropdown on Escape key
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

  // Calculate direction when opening
  useEffect(() => {
    if (isOpen) {
      setFilterQuery('');
      if (direction === 'up' || direction === 'down') {
        setComputedDirection(direction);
      } else if (triggerRef.current) {
        const rect = triggerRef.current.getBoundingClientRect();
        const spaceBelow = window.innerHeight - rect.bottom;
        const spaceAbove = rect.top;
        // If less than 240px below and more space above, open upward
        if (spaceBelow < 240 && spaceAbove > spaceBelow) {
          setComputedDirection('up');
        } else {
          setComputedDirection('down');
        }
      }

      // Auto-focus search input if searchable
      setTimeout(() => {
        if (searchInputRef.current) {
          searchInputRef.current.focus();
        }
      }, 50);
    }
  }, [isOpen, direction]);

  // Find currently selected option
  const selectedOption = useMemo(() => {
    return options.find((opt) => String(opt.value) === String(value));
  }, [options, value]);

  // Filter options if list is long
  const isSearchable = options.length >= searchableThreshold;
  const filteredOptions = useMemo(() => {
    if (!filterQuery.trim()) return options;
    const q = filterQuery.toLowerCase();
    return options.filter((opt) => String(opt.label || opt.value).toLowerCase().includes(q));
  }, [options, filterQuery]);

  const handleSelect = (val) => {
    if (onChange) onChange(val);
    setIsOpen(false);
  };

  return (
    <div
      ref={dropdownRef}
      className={`adminDropdownContainer ${fullWidth ? 'isFullWidth' : ''} ${className}`}
      style={{ minWidth: fullWidth ? '100%' : minWidth }}
    >
      {label && <label className="adminDropdownLabel">{label}</label>}

      {/* Trigger Button */}
      <button
        ref={triggerRef}
        type="button"
        className={`adminDropdownTrigger ${isOpen ? 'isOpen' : ''}`}
        onClick={() => setIsOpen((prev) => !prev)}
        aria-haspopup="listbox"
        aria-expanded={isOpen}
      >
        <span className="dropdownTriggerText" title={selectedOption ? selectedOption.label : placeholder}>
          {selectedOption ? (
            <>
              {selectedOption.icon && <span className="dropdownOptIcon">{selectedOption.icon}</span>}
              <span className="dropdownSelectedLabel">{selectedOption.label}</span>
              {selectedOption.count !== undefined && (
                <span className="dropdownCountBadge">{selectedOption.count}</span>
              )}
            </>
          ) : (
            <span className="dropdownPlaceholder">{placeholder}</span>
          )}
        </span>
        <ChevronDown size={14} className={`dropdownChevronIcon ${isOpen ? 'isRotated' : ''}`} />
      </button>

      {/* Floating Popover Menu */}
      {isOpen && (
        <div
          className={`adminDropdownMenu ${computedDirection === 'up' ? 'directionUp' : 'directionDown'} ${menuClassName}`}
          role="listbox"
        >
          {/* Mini Search Bar for Long Option Lists */}
          {isSearchable && (
            <div className="dropdownSearchWrap" onClick={(e) => e.stopPropagation()}>
              <Search size={13} className="dropdownSearchIcon" />
              <input
                ref={searchInputRef}
                type="text"
                className="dropdownSearchInput"
                placeholder="Search choices…"
                value={filterQuery}
                onChange={(e) => setFilterQuery(e.target.value)}
              />
              {filterQuery && (
                <button
                  type="button"
                  className="dropdownClearSearchBtn"
                  onClick={() => setFilterQuery('')}
                >
                  <X size={12} />
                </button>
              )}
            </div>
          )}

          {/* Scrollable Options List */}
          <div className="dropdownOptionsList">
            {filteredOptions.length > 0 ? (
              filteredOptions.map((opt) => {
                const isSelected = String(opt.value) === String(value);
                return (
                  <div
                    key={opt.value}
                    className={`dropdownOptionItem ${isSelected ? 'isSelected' : ''} ${opt.disabled ? 'isDisabled' : ''}`}
                    onClick={() => !opt.disabled && handleSelect(opt.value)}
                    role="option"
                    aria-selected={isSelected}
                  >
                    <div className="optionLabelWrap">
                      {opt.icon && <span className="optIcon">{opt.icon}</span>}
                      {opt.color && (
                        <span className="optColorBullet" style={{ backgroundColor: opt.color }} />
                      )}
                      <span className="optText">{opt.label}</span>
                      {opt.count !== undefined && (
                        <span className="optCountTag">({opt.count})</span>
                      )}
                    </div>
                    {isSelected && <Check size={14} className="optCheckIcon" />}
                  </div>
                );
              })
            ) : (
              <div className="dropdownNoResults">
                <span>No choices found</span>
              </div>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

