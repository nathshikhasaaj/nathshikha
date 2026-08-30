import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { Sparkles, Upload, ArrowLeft, CheckCircle, MessageSquare, X, Image, Instagram, Facebook } from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../../components/common/SectionTitle';
import './Suggestion.css';

export default function Suggestion() {
  const { user } = useAuth();
  const { setToast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: user?.name || '',
    email: user?.email || '',
    phone: '',
    category: 'Custom Jewellery Design',
    title: '',
    description: '',
    budget: 'Flexible',
    imageUrl: ''
  });

  const [uploading, setUploading] = useState(false);
  const [submitting, setSubmitting] = useState(false);
  const [submittedData, setSubmittedData] = useState(null);

  const configuredWhatsApp = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';

  const handleImageUpload = async (e) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const fd = new FormData();
    fd.append('image', file);
    setUploading(true);

    try {
      const res = await api('/suggestions/upload', {
        method: 'POST',
        body: fd
      });
      setForm((prev) => ({ ...prev, imageUrl: res.url }));
      setToast('Design reference image uploaded successfully');
    } catch (err) {
      setToast(err.message || 'Image upload failed');
    } finally {
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setSubmitting(true);

    try {
      const res = await api('/suggestions', {
        method: 'POST',
        body: JSON.stringify(form)
      });

      setSubmittedData(res.suggestion);
      setToast('Thank you! Your suggestion has been received.');
    } catch (err) {
      setToast(err.message || 'Failed to submit idea');
    } finally {
      setSubmitting(false);
    }
  };

  if (submittedData) {
    const waText = encodeURIComponent(
      `Hi Nathshikha Studio, I just submitted a custom jewellery suggestion:\n` +
        `Title: ${submittedData.title}\n` +
        `Category: ${submittedData.category}\n` +
        `Budget: ${submittedData.budget}\n` +
        `Name: ${submittedData.name}`
    );

    return (
      <main className="page">
        <div className="suggestionSuccessCard">
          <div className="suggestionSuccessIcon">
            <CheckCircle size={32} />
          </div>
          <span className="eyebrow">SUBMISSION RECEIVED</span>
          <h2>Your Idea is in Good Hands!</h2>
          <p>
            Thank you, <b>{submittedData.name}</b>. Our master karigars and design
            curators review all customer suggestions and custom requests weekly.
          </p>

          <div className="suggestionSummaryBox">
            <p>
              <b>Idea:</b> {submittedData.title}
            </p>
            <p>
              <b>Category:</b> {submittedData.category}
            </p>
            <p>
              <b>Estimated Budget:</b> {submittedData.budget}
            </p>
            {submittedData.imageUrl && (
              <p style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                <Image size={14} color="var(--maroon)" />
                <span>Design reference attached</span>
              </p>
            )}
          </div>

          <p style={{ fontSize: '12px', color: '#7a6a64' }}>
            Want faster assistance or have specific bridal dates? Forward your idea
            directly to our WhatsApp desk, Instagram (@nakharewali.handmade) or Facebook:
          </p>

          <div className="suggestionSuccessActions">
            <a
              className="whatsappShareBtn"
              href={`https://wa.me/${configuredWhatsApp}?text=${waText}`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare size={16} /> {t('share_whatsapp', 'SHARE ON WHATSAPP')}
            </a>
            <a
              className="instagramShareBtn"
              href="https://www.instagram.com/nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={16} /> INSTAGRAM
            </a>
            <a
              className="facebookShareBtn"
              href="https://www.facebook.com/Nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={16} /> FACEBOOK
            </a>
            <button
              className="outlineBtn"
              type="button"
              onClick={() => {
                setSubmittedData(null);
                setForm({
                  name: user?.name || '',
                  email: user?.email || '',
                  phone: '',
                  category: 'Custom Jewellery Design',
                  title: '',
                  description: '',
                  budget: 'Flexible',
                  imageUrl: ''
                });
              }}
            >
              SUBMIT ANOTHER IDEA
            </button>
            <Link className="goldBtn" to="/shop">
              {t('explore_collection', 'EXPLORE JEWELLERY')}
            </Link>
          </div>
        </div>
      </main>
    );
  }

  return (
    <main className="page">
      <Link to="/" className="back">
        <ArrowLeft /> {t('back_to_collection', 'Back to store')}
      </Link>

      <SectionTitle
        title={t('suggestion_title', 'Custom Ideas & Suggestions')}
        sub={t(
          'suggestion_sub',
          'Share your dream jewellery design or suggest improvements for our craft.'
        )}
      />

      <div className="suggestionLayout">
        <div className="suggestionInfoCard">
          <span className="eyebrow" style={{ color: '#f3d99d' }}>
            BESPOKE KARIGARI
          </span>
          <h3>{t('bespoke_title', 'Have a Design in Mind?')}</h3>
          <p>
            {t(
              'bespoke_desc',
              'From ancestral Peshwai bridal sets to modern custom naths, our craftsmen can bring your custom Maharashtrian jewellery ideas to life.'
            )}
          </p>

          <div className="suggestionSteps">
            <div className="suggestionStep">
              <div className="stepNum">1</div>
              <div>
                <h4>{t('step1_title', 'Share Your Vision')}</h4>
                <p>
                  {t(
                    'step1_desc',
                    'Upload a sketch, heirloom photo, or describe the silhouette.'
                  )}
                </p>
              </div>
            </div>

            <div className="suggestionStep">
              <div className="stepNum">2</div>
              <div>
                <h4>{t('step2_title', 'Artisan Review')}</h4>
                <p>
                  {t(
                    'step2_desc',
                    'Our master karigars evaluate materials, pearls, and antique finish.'
                  )}
                </p>
              </div>
            </div>

            <div className="suggestionStep">
              <div className="stepNum">3</div>
              <div>
                <h4>{t('step3_title', 'Direct Quote & Crafting')}</h4>
                <p>
                  {t(
                    'step3_desc',
                    'We connect with you on WhatsApp with a personalized quote.'
                  )}
                </p>
              </div>
            </div>
          </div>

          <div
            style={{
              borderTop: '1px solid rgba(222, 186, 126, 0.25)',
              paddingTop: 15,
              fontSize: '12px',
              color: '#f0d9a3',
              display: 'flex',
              alignItems: 'center',
              gap: 8
            }}
          >
            <Sparkles size={18} />
            <span>Have store feedback? We love customer suggestions!</span>
          </div>
        </div>

        <div className="suggestionFormCard">
          <h3>Submit Your Idea / Suggestion</h3>
          <p>Fill out the details below and upload any reference pictures.</p>

          <form className="suggestionForm" onSubmit={handleSubmit}>
            <input
              required
              placeholder={t('full_name', 'Your Full Name')}
              value={form.name}
              onChange={(e) => setForm({ ...form, name: e.target.value })}
            />

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 10 }}>
              <input
                required
                type="email"
                placeholder={t('email_address', 'Email Address')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <input
                required
                inputMode="tel"
                placeholder={t('mobile_10digit', '10-digit WhatsApp/Phone')}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1.2fr 0.8fr', gap: 10 }}>
              <select
                value={form.category}
                onChange={(e) => setForm({ ...form, category: e.target.value })}
              >
                <option value="Custom Jewellery Design">Custom Jewellery Design</option>
                <option value="Bridal Collection Request">Bridal Collection Request</option>
                <option value="Nath Modification">Nath Modification</option>
                <option value="Pearl Mala Customization">Pearl Mala Customization</option>
                <option value="Store & Product Improvement">Store & Product Feedback</option>
                <option value="Other Idea">Other Idea</option>
              </select>

              <select
                value={form.budget}
                onChange={(e) => setForm({ ...form, budget: e.target.value })}
              >
                <option value="Flexible">Budget: Flexible</option>
                <option value="Under ₹2,500">Under ₹2,500</option>
                <option value="₹2,500 - ₹5,000">₹2,500 - ₹5,000</option>
                <option value="₹5,000 - ₹10,000">₹5,000 - ₹10,000</option>
                <option value="₹10,000+">₹10,000+</option>
              </select>
            </div>

            <input
              required
              placeholder="Idea / Design Title (e.g. Peshwai Choker with Emeralds)"
              value={form.title}
              onChange={(e) => setForm({ ...form, title: e.target.value })}
            />

            <textarea
              required
              placeholder="Describe your design, desired stones, dimensions, or specific feedback in detail..."
              value={form.description}
              onChange={(e) => setForm({ ...form, description: e.target.value })}
            />

            {/* Design Reference Image Upload */}
            {!form.imageUrl ? (
              <label className="uploadDesignBox">
                <Upload />
                <span>
                  {uploading
                    ? 'Uploading image…'
                    : 'Click or drop to upload reference sketch / photo (max 5MB)'}
                </span>
                <small style={{ color: '#91796f', fontSize: '10px' }}>
                  Supports JPG, PNG, WEBP
                </small>
                <input
                  type="file"
                  accept="image/png,image/jpeg,image/webp,image/gif"
                  onChange={handleImageUpload}
                  disabled={uploading}
                />
              </label>
            ) : (
              <div className="uploadPreviewContainer">
                <img src={form.imageUrl} alt="Uploaded design preview" />
                <button
                  type="button"
                  className="removeImageBtn"
                  title="Remove image"
                  onClick={() => setForm((prev) => ({ ...prev, imageUrl: '' }))}
                >
                  <X size={16} />
                </button>
              </div>
            )}

            <button className="goldBtn" disabled={submitting || uploading} type="submit">
              {submitting
                ? t('submitting', 'SUBMITTING…')
                : t('send_to_artisans', 'SEND TO STUDIO ARTISANS')}
            </button>
          </form>
        </div>
      </div>
    </main>
  );
}
