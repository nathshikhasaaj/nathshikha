import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import './Legal.css';

export default function TermsOfService() {
  return (
    <main className="page legalPage">
      <Link to="/" className="back">
        <ArrowLeft /> Back to store
      </Link>

      <SectionTitle
        title="Terms of Service"
        sub="Guidelines and agreement for shopping at Nathshikha."
      />

      <div className="legalCard">
        <span className="legalDate">Last updated: August 2026</span>

        <div className="legalHighlight">
          <b>Welcome to Nathshikha.</b> By accessing our website, placing an order, or browsing our catalogue, you agree to be bound by the following terms and conditions.
        </div>

        <h2>1. Handcrafted Product Authenticity</h2>
        <p>
          Every piece in the Nathshikha catalogue (including Peshwai Thushi, Kolhapuri Saaj, Moti Tanmani, and traditional Naths) is meticulously handcrafted by skilled artisans.
        </p>
        <p>
          Due to the nature of artisanal handmade jewellery, subtle variations in pearl luster, antique finish patina, and stone settings are natural characteristics of authentic craftsmanship and make each piece unique.
        </p>

        <h2>2. Pricing & Orders</h2>
        <ul>
          <li>All prices are listed in Indian National Rupees (INR / ₹) and are inclusive of applicable taxes.</li>
          <li>We reserve the right to modify prices or discontinue items without prior notice.</li>
          <li>Receipt of an order confirmation does not signify our final acceptance. We reserve the right to cancel orders in case of unforeseen inventory stockouts, pricing inaccuracies, or unverified payment submissions.</li>
        </ul>

        <h2>3. Payment & Verification</h2>
        <p>
          For orders placed via UPI (Google Pay, PhonePe, Paytm, BHIM), customers must submit their authentic 12-digit UTR (Unique Transaction Reference) / Bank Transaction ID.
        </p>
        <p>
          Orders will be processed for dispatch once payment is verified and cleared by our studio accounts team.
        </p>

        <h2>4. Intellectual Property</h2>
        <p>
          All content, photography, branding, logo marks, product designs, and text displayed on this website are the intellectual property of Nathshikha Handmade Jewellery and protected under Indian copyright laws.
        </p>

        <h2>5. Limitation of Liability</h2>
        <p>
          Nathshikha shall not be liable for any indirect, incidental, or consequential damages resulting from the use or inability to use our products or services.
        </p>

        <h2>6. Governing Law & Jurisdiction</h2>
        <p>
          These Terms of Service are governed by and construed in accordance with the laws of India. Any disputes arising shall be subject to the exclusive jurisdiction of the courts in Maharashtra, India.
        </p>

        <h2>7. Studio Contact Details</h2>
        <p>
          For queries regarding these terms, your orders, or custom jewellery requests:
        </p>
        <ul>
          <li><strong>Instagram:</strong> <a href="https://www.instagram.com/nakharewali.handmade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--maroon)' }}>@nakharewali.handmade</a></li>
          <li><strong>Facebook:</strong> <a href="https://www.facebook.com/Nakharewali.handmade" target="_blank" rel="noopener noreferrer" style={{ color: 'var(--maroon)' }}>Nakharewali.handmade</a></li>
          <li><strong>Email:</strong> nakharewali.saaj@gmail.com</li>
          <li><strong>WhatsApp / Phone:</strong> +91 9699668421</li>
        </ul>

        <div className="legalActions">
          <Link className="goldBtn" to="/shop">
            SHOP COLLECTION
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
            HAVE QUESTIONS?
          </Link>
        </div>
      </div>
    </main>
  );
}
