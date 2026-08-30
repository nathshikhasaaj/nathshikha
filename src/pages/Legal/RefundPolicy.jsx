import React from 'react';
import { Link } from 'react-router-dom';
import { ArrowLeft, RefreshCw, AlertCircle } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import './Legal.css';

export default function RefundPolicy() {
  return (
    <main className="page legalPage">
      <Link to="/" className="back">
        <ArrowLeft /> Back to store
      </Link>

      <SectionTitle
        title="Refund & Return Policy"
        sub="Clear and transparent guidelines for returns, replacements, and cancellations."
      />

      <div className="legalCard">
        <span className="legalDate">Last updated: August 2026</span>

        <div className="legalHighlight">
          <RefreshCw style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--maroon)' }} />
          <b>7-Day Hassle-Free Replacement:</b> If your jewellery arrives damaged, defective, or incorrect, we provide a 100% free replacement or full refund within 7 days of delivery.
        </div>

        <h2>1. Eligibility for Returns & Replacements</h2>
        <p>You are eligible for a replacement or full refund under the following conditions:</p>
        <ul>
          <li>The product received is physically damaged or broken in transit.</li>
          <li>A defective piece (such as broken clasps, missing stones/pearls, or faulty locks).</li>
          <li>An incorrect piece sent that does not match your order confirmation.</li>
        </ul>

        <h2>2. Unboxing Video Requirement</h2>
        <div className="legalHighlight" style={{ borderColor: 'var(--maroon)' }}>
          <AlertCircle style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--maroon)' }} />
          <strong>Important Guideline:</strong> To protect both our patrons and our artisans, please record a continuous, unedited unboxing video from the sealed outer package opening to product inspection.
        </div>

        <h2>3. Non-Returnable Scenarios</h2>
        <p>Because our jewellery pieces are handcrafted intimate wear items, returns are not accepted in the following circumstances:</p>
        <ul>
          <li>Items damaged due to misuse, exposure to harsh chemicals, perfumes, or water.</li>
          <li>Pieces returned without original protective packaging, tags, or jewellery boxes.</li>
          <li>Requests raised after 7 days from the recorded delivery date.</li>
        </ul>

        <h2>4. Cancellation Policy</h2>
        <ul>
          <li>You may cancel an order anytime before it has been dispatched from our studio.</li>
          <li>Once dispatched with a tracking number assigned, orders cannot be cancelled mid-transit.</li>
        </ul>

        <h2>5. Refund Process & Timelines</h2>
        <p>
          Once your returned item is received and inspected at our studio, approved refunds are initiated within <strong>24 to 48 hours</strong> directly to your original <strong>UPI VPA / Bank account</strong> (settled within 2-3 business days).
        </p>

        <div className="legalActions">
          <a
            className="goldBtn"
            href="https://wa.me/919699668421?text=Hi%20Nathshikha%2C%20I%20have%20a%20return%20query"
            target="_blank"
            rel="noopener noreferrer"
          >
            WHATSAPP RETURN DESK
          </a>
          <a
            className="outlineBtn"
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            INSTAGRAM @NAKHAREWALI.HANDMADE
          </a>
          <Link className="outlineBtn" to="/contact">
            CONTACT SUPPORT
          </Link>
        </div>
      </div>
    </main>
  );
}
