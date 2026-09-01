import React from 'react';
import { Link } from 'react-router-dom';
import { ShieldCheck, ArrowLeft } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import './Legal.css';

export default function PrivacyPolicy() {
  return (
    <main className="page legalPage">
      <Link to="/" className="back">
        <ArrowLeft /> Back to store
      </Link>

      <SectionTitle
        title="Privacy Policy"
        sub="Your trust and privacy are paramount to our artisanal craft."
      />

      <div className="legalCard">
        <span className="legalDate">Last updated: August 2026</span>

        <div className="legalHighlight">
          <ShieldCheck style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--maroon)' }} />
          <b>Privacy Commitment:</b> Nathshikha is dedicated to safeguarding your personal and transactional information. We never sell, rent, or trade your data to third parties.
        </div>

        <h2>1. Information We Collect</h2>
        <p>When you visit or place an order on our store, we collect information necessary to fulfill your purchases and provide exceptional service:</p>
        <ul>
          <li><strong>Personal Details:</strong> Full name, shipping and billing address, email address, and 10-digit mobile contact number.</li>
          <li><strong>Transactional Information:</strong> Order numbers, product selections, payment method (UPI / Cash on Delivery), and payment verification identifiers (such as UPI UTR / Transaction Reference IDs).</li>
          <li><strong>Device & Usage Data:</strong> IP address, browser type, device information, and interaction logs on our website for performance and security purposes.</li>
        </ul>

        <h2>2. How We Use Your Information</h2>
        <p>We process your data for legitimate business purposes, including:</p>
        <ul>
          <li>Processing, packing, and delivering your handcrafted Maharashtrian jewellery orders.</li>
          <li>Verifying UPI payments and validating UTR submission details.</li>
          <li>Sending real-time order tracking, confirmation, and WhatsApp dispatch updates.</li>
          <li>Responding to customer support queries and after-sales service requests.</li>
          <li>Preventing fraudulent transactions and ensuring overall store security.</li>
        </ul>

        <h2>3. Data Protection & Security</h2>
        <p>
          We implement rigorous administrative, technical, and physical security measures. Sensitive passwords are encrypted using one-way bcrypt hashing algorithms, and all communication is encrypted over Secure Sockets Layer (SSL/TLS).
        </p>

        <h2>4. Payment Security</h2>
        <p>
          Nathshikha uses direct UPI merchant payment protocols and verified bank channels. We do not store your private bank PINs, UPI MPINs, or debit/credit card CVV details on our servers.
        </p>

        <h2>5. Sharing with Third-Party Logistics</h2>
        <p>
          We only share essential shipping information (recipient name, address, and mobile number) with trusted national courier partners (e.g. BlueDart, Delhivery, India Post) solely for doorstep delivery.
        </p>

        <h2>6. Customer Photographs & Marketing Permission</h2>
        <p>
          When you voluntarily share, upload, or submit your photographs, bridal looks, or styling pictures with Nathshikha (via product reviews, Hall of Fame submissions, customer accounts, WhatsApp, social media tags, or email), you grant Nathshikha permission to use those photographs for promotional and marketing purposes across our website, official social media handles, and marketing collateral. You retain ownership of your original photos and may request removal of your photo by contacting our team.
        </p>

        <h2>7. Your Rights & Contact</h2>
        <p>
          You have the right to access, review, or request the deletion of your personal account data at any time. To exercise these rights, reach out to our team at <strong>nakharewali.saaj@gmail.com</strong>, message us on Instagram <strong>@nakharewali.handmade</strong>, or on Facebook at <strong>Nakharewali.handmade</strong>.
        </p>

        <div className="legalActions">
          <Link className="goldBtn" to="/shop">
            EXPLORE JEWELLERY
          </Link>
          <a
            className="outlineBtn"
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            INSTAGRAM
          </a>
          <a
            className="outlineBtn"
            href="https://www.facebook.com/Nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            FACEBOOK
          </a>
          <Link className="outlineBtn" to="/contact">
            CONTACT SUPPORT
          </Link>
        </div>
      </div>
    </main>
  );
}
