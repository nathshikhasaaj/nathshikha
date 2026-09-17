import React, { useState, useEffect } from 'react';
import { X, Sparkles, Camera, CheckCircle2, AlertCircle, Loader2, Image as ImageIcon } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import './CustomizationEditModal.css';

export default function CustomizationEditModal({
  isOpen,
  onClose,
  order,
  onSuccess,
  setToast
}) {
  const { user } = useAuth();

  const [details, setDetails] = useState('');
  const [previewUrl, setPreviewUrl] = useState('');
  const [uploadedUrl, setUploadedUrl] = useState('');
  const [uploadingImage, setUploadingImage] = useState(false);
  const [fileError, setFileError] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [formError, setFormError] = useState('');

  useEffect(() => {
    if (order) {
      const existingDetails = order.customization?.details || '';
      const existingImg = order.customization?.referenceImage || order.customization?.reference_image || '';
      setDetails(existingDetails);
      setUploadedUrl(existingImg);
      setPreviewUrl(existingImg);
      setFileError('');
      setFormError('');
    }
  }, [order, isOpen]);

  if (!isOpen || !order) return null;

  const handleImageChange = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileError('');

    const validMimes = ['image/jpeg', 'image/jpg', 'image/png', 'image/webp'];
    const validExts = /\.(jpe?g|png|webp)$/i;

    if (!validMimes.includes(file.type.toLowerCase()) && !validExts.test(file.name.toLowerCase())) {
      setFileError('Please select a valid image file (JPG, PNG, or WebP).');
      return;
    }

    const maxSize = 10 * 1024 * 1024; // 10 MB
    if (file.size > maxSize) {
      setFileError('Image size exceeds 10MB. Please choose a smaller image.');
      return;
    }

    const localPreview = URL.createObjectURL(file);
    setPreviewUrl(localPreview);
    setUploadingImage(true);

    try {
      const formData = new FormData();
      formData.append('image', file);

      const token = localStorage.getItem('nw-auth-token');
      const res = await fetch('/api/orders/upload-customization', {
        method: 'POST',
        headers: token ? { Authorization: `Bearer ${token}` } : {},
        body: formData
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Failed to upload reference image.');
      }

      setUploadedUrl(data.url);
      setPreviewUrl(data.url);
      if (setToast) setToast('Reference image uploaded! ✨');
    } catch (err) {
      console.error('Customization image upload error:', err);
      setFileError(err.message || 'Failed to upload image. Please try again.');
    } finally {
      setUploadingImage(false);
    }
  };

  const handleRemoveImage = () => {
    setPreviewUrl('');
    setUploadedUrl('');
    setFileError('');
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);
    setFormError('');

    try {
      const orderId = order.id || order._id || order.order_no;
      let lastOrderData = null;
      let savedCheckoutData = null;
      try {
        lastOrderData = JSON.parse(localStorage.getItem('nw-last-order') || 'null');
        savedCheckoutData = JSON.parse(localStorage.getItem('nw-saved-checkout-details') || 'null');
      } catch {
        // ignore parse error
      }

      const payload = {
        details: details.trim().slice(0, 1000),
        referenceImage: uploadedUrl || null,
        guestToken: order.guestToken || order.guest_token || lastOrderData?.token || null,
        email: order.email || user?.email || lastOrderData?.order?.email || savedCheckoutData?.email || null,
        phone: order.phone || user?.phone || lastOrderData?.order?.phone || savedCheckoutData?.phone || null
      };

      const res = await api(`/orders/${orderId}/customization`, {
        method: 'POST',
        body: JSON.stringify(payload)
      });

      if (res.ok) {
        if (setToast) setToast(res.message || 'Customization request saved successfully!');
        if (onSuccess) {
          onSuccess(res.order || {
            ...order,
            customization: {
              requested: Boolean(payload.details || payload.referenceImage),
              details: payload.details || null,
              referenceImage: payload.referenceImage,
              requestedAt: new Date()
            }
          });
        }
        onClose();
      }
    } catch (err) {
      setFormError(err.message || 'Failed to update customization request.');
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div className="modalOverlay" onClick={onClose}>
      <div
        className="customizationEditModal"
        onClick={(e) => e.stopPropagation()}
        role="dialog"
        aria-modal="true"
      >
        <div className="customizationEditHeader">
          <div className="customizationEditTitle">
            <div className="customIconCircle">
              <Sparkles size={18} color="var(--maroon, #5b1420)" />
            </div>
            <div>
              <h3>Jewellery Customization Request</h3>
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

        <form onSubmit={handleSubmit} className="customizationEditBody">
          <div className="customizationModalNotice">
            <p>
              Tell us your required changes or customizations (e.g., color stones, pearl shade, thread length, size adjustments).
              Our studio artisans review all requests before crafting.
            </p>
          </div>

          <div className="formGroup">
            <div className="customLabelRow">
              <label htmlFor="editCustomizationText">Your Requirement / Instructions</label>
              <span className="charCount">{details.length}/1000</span>
            </div>
            <textarea
              id="editCustomizationText"
              rows={4}
              maxLength={1000}
              placeholder="Example: I want green stones instead of red stones, and a 2-inch extended chain."
              value={details}
              onChange={(e) => setDetails(e.target.value)}
              className="customTextareaInput"
            />
          </div>

          <div className="formGroup">
            <label className="fieldLabel">Reference Photo / Design Sketch (Optional)</label>

            {!previewUrl ? (
              <label className="customUploadDropzone" htmlFor="modalCustomizationFileInput">
                <input
                  type="file"
                  id="modalCustomizationFileInput"
                  accept=".jpg,.jpeg,.png,.webp,image/jpeg,image/png,image/webp"
                  onChange={handleImageChange}
                  style={{ display: 'none' }}
                  disabled={uploadingImage}
                />
                <div className="dropzoneInner">
                  <Camera size={22} className="dropzoneCamIcon" />
                  <div className="dropzoneText">
                    <b>Click to upload reference image</b>
                    <small>JPG, PNG, WebP (Max 10MB)</small>
                  </div>
                </div>
              </label>
            ) : (
              <div className="modalImagePreviewBox">
                <img
                  src={previewUrl}
                  alt="Reference Design"
                  className="modalCustomThumb"
                />
                <div className="modalCustomMeta">
                  <span className="imageStatusTitle">Reference Image Attached</span>
                  {uploadingImage ? (
                    <span className="uploadingPill">
                      <Loader2 size={12} className="spinIcon" /> Uploading…
                    </span>
                  ) : (
                    <span className="uploadedPill">
                      <CheckCircle2 size={12} /> Ready to save
                    </span>
                  )}
                </div>
                <button
                  type="button"
                  className="removeImgBtn"
                  onClick={handleRemoveImage}
                  title="Remove image"
                  disabled={uploadingImage}
                >
                  <X size={15} />
                </button>
              </div>
            )}

            {fileError && (
              <div className="customErrorNotice">
                <AlertCircle size={13} />
                <span>{fileError}</span>
              </div>
            )}
          </div>

          {formError && (
            <div className="customErrorNotice">
              <AlertCircle size={14} />
              <span>{formError}</span>
            </div>
          )}

          <div className="customModalActions">
            <button
              type="button"
              className="outlineBtn"
              onClick={onClose}
              disabled={submitting || uploadingImage}
            >
              Cancel
            </button>
            <button
              type="submit"
              className="goldBtn submitCustomBtn"
              disabled={submitting || uploadingImage}
            >
              {submitting ? (
                <>
                  <Loader2 size={14} className="spinIcon" />
                  <span>Saving…</span>
                </>
              ) : (
                <>
                  <Sparkles size={14} />
                  <span>Save Customization Request</span>
                </>
              )}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
