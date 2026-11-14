import React, { useEffect } from 'react';
import { X, Sparkles, PackagePlus, Pencil } from 'lucide-react';
import AdminProductForm from './AdminProductForm';
import './AdminProductModal.css';

export default function AdminProductModal({
  isOpen,
  onClose,
  form,
  setForm,
  editing,
  setEditing,
  saveProduct,
  uploadImage,
  uploadMultipleImages,
  busy,
  emptyForm
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
    <div
      className="adminProductModalOverlay"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-labelledby="productModalHeading"
    >
      <div className="adminProductModalDialog" onClick={(e) => e.stopPropagation()}>
        {/* Header */}
        <header className="adminProductModalHeader">
          <div className="productModalHeaderLeft">
            <div className="productModalIconBadge">
              {editing ? <Pencil size={20} /> : <PackagePlus size={20} />}
            </div>
            <div className="productModalTitleGroup">
              <h2 id="productModalHeading">
                {editing ? `Edit Product: ${editing.name}` : 'Add New Product'}
              </h2>
              <span className="productModalSubtitle">
                {editing
                  ? 'Update jewellery details, price, inventory stock, and customer choices'
                  : 'New catalogue entry with luxury gold watermarking & custom parameters'}
              </span>
            </div>
          </div>
          <button
            type="button"
            className="productModalCloseBtn"
            onClick={onClose}
            aria-label="Close modal"
            title="Close"
          >
            <X size={18} />
          </button>
        </header>

        {/* Scrollable Form Body */}
        <div className="adminProductModalBody">
          <AdminProductForm
            form={form}
            setForm={setForm}
            editing={editing}
            setEditing={setEditing}
            saveProduct={saveProduct}
            uploadImage={uploadImage}
            uploadMultipleImages={uploadMultipleImages}
            busy={busy}
            emptyForm={emptyForm}
          />
        </div>
      </div>
    </div>
  );
}

