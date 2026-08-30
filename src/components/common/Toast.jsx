import React from 'react';
import { useToast } from '../../context/ToastContext';
import './Toast.css';

export default function Toast() {
  const { toast } = useToast();

  if (!toast) return null;

  return (
    <div className="toast" role="alert">
      ✓ {toast}
    </div>
  );
}
