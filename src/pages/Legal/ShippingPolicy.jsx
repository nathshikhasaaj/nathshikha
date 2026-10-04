import React from 'react';
import { Link } from 'react-router-dom';
import { Truck, Clock, ShieldAlert } from 'lucide-react';
import SectionTitle from '../../components/common/SectionTitle';
import Breadcrumbs from '../../components/common/Breadcrumbs';
import { LegalSubNav } from '../../components/common/PageSubNav';
import './Legal.css';

export default function ShippingPolicy() {
  return (
    <main className="page legalPage">
      <Breadcrumbs items={[{ label: 'Legal Policies', path: '/privacy-policy' }, { label: 'Shipping Policy' }]} backPath="/" backLabel="Home" />

      <SectionTitle
        title="Shipping & Delivery Policy"
        sub="Safe, secure, and insured Pan-India transit for your precious jewellery."
      />

      <LegalSubNav />

      <div className="legalCard">
        <span className="legalDate">Last updated: August 2026</span>

        <div className="legalHighlight">
          <Truck style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--maroon)' }} />
          <b>Pan-India Insured Delivery:</b> We deliver to over 19,000+ pincodes across India. Free delivery on all orders of ₹1,500 and above!
        </div>

        <h2>1. Making & Crafting Timelines</h2>
        <div className="legalHighlight" style={{ borderColor: 'var(--gold)' }}>
          <Clock style={{ verticalAlign: 'middle', marginRight: 6, color: 'var(--maroon)' }} />
          <b>Artisanal Crafting:</b> Because every Nathshikha piece is intricately handmade by master karigars with authentic pearls and antique artisanal polish, our making time is <strong>15 days</strong>. Expected delivery is <strong>20 days from order confirmation</strong> (maximum delivery date). If your piece is completed earlier, it will be dispatched immediately!
        </div>

        <h2>2. Shipping Rates & Thresholds</h2>
        <ul>
          <li><strong>Orders ₹1,500 and above:</strong> <span style={{ color: 'var(--status-paid-text)', fontWeight: 700 }}>FREE Delivery</span> across India.</li>
          <li><strong>Orders below ₹1,500:</strong> Applicable standard delivery charges apply based on delivery PIN code location (Khopoli: ₹0, Maharashtra: ₹100, Rest of India: ₹120, Store Pickup: ₹0).</li>
        </ul>

        <h2>3. Delivery Timelines (After Dispatch)</h2>
        <ul>
          <li><strong>Standard Delivery:</strong> <strong>3 to 5 business days</strong> after dispatch across India.</li>
          <li><strong>Live Tracking:</strong> Once dispatched, you will receive an active tracking ID via SMS and WhatsApp to monitor your parcel in real-time.</li>
        </ul>

        <h2>4. No Cash on Delivery (COD) Policy</h2>
        <p>
          We do not offer Cash on Delivery (COD). Because all items are 100% handmade and involve immense time, effort, and personalized craftsmanship, we operate strictly on prepaid UPI orders.
        </p>

        <h2>5. Tamper-Proof Packaging</h2>
        <p>
          Every item is packed in a protective, cushioned jewellery box and sealed in tamper-evident outer packaging to ensure it reaches you in pristine condition.
        </p>

        <h2>6. Shipping Support & Queries</h2>
        <p>
          Need urgent tracking updates or express dispatch for upcoming weddings? Reach our studio team via WhatsApp (+91 9699668421) or DM us on Instagram <strong>@nakharewali.handmade</strong>.
        </p>

        <div className="legalActions">
          <Link className="goldBtn" to="/orders">
            TRACK ORDER
          </Link>
          <a
            className="outlineBtn"
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
          >
            INSTAGRAM @NAKHAREWALI.HANDMADE
          </a>
          <Link className="outlineBtn" to="/shop">
            BROWSE COLLECTION
          </Link>
        </div>
      </div>
    </main>
  );
}
