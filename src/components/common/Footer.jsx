import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MessageSquare, Instagram, Facebook, MapPin, Clock, ShieldCheck } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';

  return (
    <footer>
      {/* 1. BRAND HEADER BLOCK */}
      <div className="footerBrandHeader">
        <img
          className="footerLogo"
          src="/assets/nathshikha-logo.png"
          alt="Nathshikha logo"
        />
        <h3>NATHSHIKHA</h3>
        <p className="footerTagline">
          Handcrafted Maharashtrian jewellery for modern heirlooms.
        </p>
        <span className="footerPeshwaiBadge">
          ✦ Authentic Peshwai Craft & Heritage ✦
        </span>

        {/* Quick Social & Connect Pills */}
        <div className="footerQuickPills">
          <a
            className="footerPill footerWhatsAppPill"
            href={`https://wa.me/${whatsappNumber}?text=Hi%20Nathshikha%20Studio%2C%20I%20have%20an%20inquiry%20about%20your%20jewellery`}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat on WhatsApp (+91 9699668421)"
          >
            <MessageSquare size={13} /> <span>WhatsApp Chat</span>
          </a>
          <a
            className="footerPill footerInstagramPill"
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            title="Follow on Instagram"
          >
            <Instagram size={13} /> <span>@nakharewali.handmade</span>
          </a>
          <a
            className="footerPill footerFacebookPill"
            href="https://www.facebook.com/Nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            title="Follow on Facebook"
          >
            <Facebook size={13} /> <span>Facebook</span>
          </a>
        </div>
      </div>

      {/* 2. THREE-COLUMN NAVIGATION GRID */}
      <div className="footerCols3Grid">
        <div className="footerNavCol">
          <b>COLLECTIONS</b>
          <Link to="/shop">All Jewellery</Link>
          <Link to="/category/Signature">Signature Saaj</Link>
          <Link to="/category/Pearl">Handmade Pearls</Link>
          <Link to="/category/Traditional">Traditional Nath</Link>
          <Link to="/category/Nath">Bridal Chokers</Link>
        </div>

        <div className="footerNavCol">
          <b>HELP & INFO</b>
          <Link to="/orders">Track Order</Link>
          <Link to="/hall-of-fame">Our Brides</Link>
          <Link to="/account">My Account</Link>
          <Link to="/about">About Studio</Link>
          <Link to="/suggestion">Suggestions</Link>
          <Link to="/contact">Support</Link>
        </div>

        <div className="footerNavCol">
          <b>POLICIES</b>
          <Link to="/privacy-policy">Privacy Policy</Link>
          <Link to="/terms">Terms of Service</Link>
          <Link to="/shipping-policy">Shipping Policy</Link>
          <Link to="/refund-policy">Refund Policy</Link>
          <Link to="/orders">360° Unboxing</Link>
        </div>
      </div>

      {/* 3. FULL-WIDTH STUDIO CONTACT & TRUST CARD */}
      <div className="footerStudioCard">
        <div className="footerStudioGrid">
          <a href={`tel:+${whatsappNumber}`} className="footerStudioItem">
            <Phone size={14} className="footerStudioIcon" />
            <div className="footerStudioText">
              <small>CALL STUDIO</small>
              <strong>+91 9699668421</strong>
            </div>
          </a>

          <a href="mailto:nakharewali.saaj@gmail.com" className="footerStudioItem">
            <Mail size={14} className="footerStudioIcon" />
            <div className="footerStudioText">
              <small>EMAIL SUPPORT</small>
              <strong>nakharewali.saaj@gmail.com</strong>
            </div>
          </a>

          <a
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            className="footerStudioItem"
          >
            <Instagram size={14} className="footerStudioIcon" />
            <div className="footerStudioText">
              <small>INSTAGRAM</small>
              <strong>@nakharewali.handmade</strong>
            </div>
          </a>

          <div className="footerStudioItem">
            <MapPin size={14} className="footerStudioIcon" />
            <div className="footerStudioText">
              <small>STUDIO LOCATION</small>
              <strong>Khopoli, Raigad, Maharashtra</strong>
            </div>
          </div>
        </div>

        <div className="footerTimingsBar">
          <Clock size={12} />
          <span>Studio Hours: Mon – Sat, 10:00 AM – 7:00 PM IST</span>
        </div>
      </div>

      {/* 4. COPYRIGHT & LEGAL BOTTOM BAR */}
      <div className="copy">
        <span>© {new Date().getFullYear()} Nathshikha Handmade Jewellery. All rights reserved.</span>
        <div className="copyLinks">
          <Link to="/privacy-policy">Privacy</Link>
          <Link to="/terms">Terms</Link>
          <Link to="/shipping-policy">Shipping</Link>
          <Link to="/refund-policy">Refunds</Link>
          <Link to="/contact">Contact</Link>
        </div>
      </div>
    </footer>
  );
}
