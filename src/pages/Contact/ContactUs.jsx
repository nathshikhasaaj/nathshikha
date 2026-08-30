import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Phone,
  Mail,
  MapPin,
  Clock,
  MessageSquare,
  ArrowLeft,
  Send,
  ChevronDown,
  HelpCircle,
  Sparkles,
  Truck,
  ShieldAlert,
  Instagram,
  Facebook
} from 'lucide-react';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import SectionTitle from '../../components/common/SectionTitle';
import './ContactUs.css';

export default function ContactUs() {
  const { setToast } = useToast();
  const { t } = useLanguage();

  const [form, setForm] = useState({
    name: '',
    email: '',
    phone: '',
    subject: 'Order Inquiry',
    message: ''
  });

  const [openFaq, setOpenFaq] = useState(0);

  const handleSubmit = (e) => {
    e.preventDefault();
    setToast('Thank you! Your message has been received. We will get back to you shortly.');
    setForm({
      name: '',
      email: '',
      phone: '',
      subject: 'Order Inquiry',
      message: ''
    });
  };

  const configuredWhatsApp = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';

  const faqs = [
    {
      q: t('faq_q1', 'What is the making and crafting time for jewellery?'),
      a: t(
        'faq_a1',
        'Since every piece is intricately handcrafted by our master artisans with authentic pearls and antique gold finish, our standard making time is 15 to 20 days. If your piece is completed earlier, it will be dispatched immediately!'
      )
    },
    {
      q: t('faq_q2', 'How long does delivery take after dispatch?'),
      a: t(
        'faq_a2',
        'Delivery takes 3 to 5 business days after dispatch across India. Once dispatched, you will receive an active tracking ID via SMS and WhatsApp to monitor your parcel in real time.'
      )
    },
    {
      q: t('faq_q3', 'Is Cash on Delivery (COD) available?'),
      a: t(
        'faq_a3',
        'No, we do not have a COD option. Because these pieces are 100% handmade, requiring immense artisanal efforts, dedicated time, and precious materials, we only operate on secure prepaid UPI payments.'
      )
    },
    {
      q: t('faq_q4', 'How do I place an order and track it?'),
      a: t(
        'faq_a4',
        'Choose your desired jewellery, add it to your bag, and complete the checkout using UPI. Enter your 12-digit UTR number for confirmation. You can track your order status anytime using the Track Order link in the menu.'
      )
    }
  ];

  return (
    <main className="page">
      <Link to="/" className="back">
        <ArrowLeft /> {t('back_to_collection', 'Back to store')}
      </Link>

      <SectionTitle
        title={t('contact_title', 'Contact & Studio Support')}
        sub={t(
          'contact_sub',
          'We are here to assist with your bespoke Maharashtrian jewellery queries.'
        )}
      />

      <div className="contactContainer">
        <div className="contactInfoCard">
          <h3>Nathshikha Studio</h3>
          <p>
            Have questions about custom sizing, bridal collections, or existing orders?
            Reach out to our customer care team.
          </p>

          <div className="contactInfoItems">
            <div className="contactInfoItem">
              <Phone />
              <div>
                <b>Phone / WhatsApp</b>
                <a href={`tel:+${configuredWhatsApp}`}>+91 9699668421</a>
              </div>
            </div>

            <div className="contactInfoItem">
              <Mail />
              <div>
                <b>Email Support</b>
                <a href="mailto:nakharewali.saaj@gmail.com">nakharewali.saaj@gmail.com</a>
              </div>
            </div>

            <div className="contactInfoItem">
              <Instagram />
              <div>
                <b>Instagram Official</b>
                <a
                  href="https://www.instagram.com/nakharewali.handmade"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  @nakharewali.handmade
                </a>
              </div>
            </div>

            <div className="contactInfoItem">
              <Facebook />
              <div>
                <b>Facebook Page</b>
                <a
                  href="https://www.facebook.com/Nakharewali.handmade"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  Nakharewali.handmade
                </a>
              </div>
            </div>

            <div className="contactInfoItem">
              <MapPin />
              <div>
                <b>Studio Location</b>
                <span>Nakharewali Handmade Jewellery, Khopoli, Raigad</span>
              </div>
            </div>

            <div className="contactInfoItem">
              <Clock />
              <div>
                <b>Working Hours</b>
                <span>Monday – Saturday: 10:00 AM – 7:00 PM IST</span>
              </div>
            </div>
          </div>

          <div className="contactActionBtns">
            <a
              className="contactWhatsAppBtn"
              href={`https://wa.me/${configuredWhatsApp}?text=Hi%20Nathshikha%20Studio%2C%20I%20have%20an%20inquiry%20about%20your%20jewellery`}
              target="_blank"
              rel="noopener noreferrer"
            >
              <MessageSquare size={15} /> WHATSAPP
            </a>
            <a
              className="contactInstagramBtn"
              href="https://www.instagram.com/nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Instagram size={15} /> INSTAGRAM
            </a>
            <a
              className="contactFacebookBtn"
              href="https://www.facebook.com/Nakharewali.handmade"
              target="_blank"
              rel="noopener noreferrer"
            >
              <Facebook size={15} /> FACEBOOK
            </a>
          </div>
        </div>

        <div className="contactFormCard">
          <h3>Send Us a Message</h3>
          <p>Fill in the form below and our studio team will respond within 24 business hours.</p>

          <form className="contactForm" onSubmit={handleSubmit}>
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
                placeholder={t('mobile_10digit', 'Mobile Number')}
                value={form.phone}
                onChange={(e) => setForm({ ...form, phone: e.target.value })}
              />
            </div>

            <select
              value={form.subject}
              onChange={(e) => setForm({ ...form, subject: e.target.value })}
            >
              <option value="Order Inquiry">Order Inquiry & Tracking</option>
              <option value="Making Time">Making Time & Dispatch Inquiries</option>
              <option value="Product Sizing">Product Sizing & Customization</option>
              <option value="Payment & UTR">UPI Payment / UTR Verification</option>
              <option value="Returns & Exchanges">Returns & Exchanges</option>
              <option value="Other">Other</option>
            </select>

            <textarea
              required
              placeholder="How can we help you?"
              value={form.message}
              onChange={(e) => setForm({ ...form, message: e.target.value })}
            />

            <button className="goldBtn" type="submit">
              <Send size={14} /> SEND MESSAGE
            </button>
          </form>
        </div>
      </div>

      {/* Frequently Asked Questions Section */}
      <section className="faqSection">
        <div className="faqHeadingBox">
          <span className="eyebrow" style={{ color: 'var(--maroon)' }}>
            STUDIO ASSISTANCE
          </span>
          <h2>{t('faq_heading', 'Frequently Asked Questions')}</h2>
          <p>
            {t(
              'faq_sub',
              'Everything you need to know about crafting timelines, delivery, and payments.'
            )}
          </p>
        </div>

        <div className="faqGrid">
          {faqs.map((item, idx) => {
            const isOpen = openFaq === idx;
            return (
              <div key={idx} className={`faqItem ${isOpen ? 'open' : ''}`}>
                <button
                  className="faqQuestion"
                  type="button"
                  onClick={() => setOpenFaq(isOpen ? -1 : idx)}
                  aria-expanded={isOpen}
                >
                  <b>{item.q}</b>
                  <ChevronDown className="faqToggleIcon" size={18} />
                </button>
                {isOpen && (
                  <div className="faqAnswer">
                    <p>{item.a}</p>
                  </div>
                )}
              </div>
            );
          })}
        </div>
      </section>
    </main>
  );
}
