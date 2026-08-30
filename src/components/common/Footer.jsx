import React from 'react';
import { Link } from 'react-router-dom';
import { Phone, Mail, MessageSquare, Instagram, Facebook } from 'lucide-react';
import './Footer.css';

export default function Footer() {
  const whatsappNumber = import.meta.env.VITE_WHATSAPP_NUMBER || '919699668421';

  return (
    <footer>
      <div>
        <img
          className="footerLogo"
          src="/assets/nathshikha-logo.png"
          alt="Nathshikha logo"
        />
        <h3>NATHSHIKHA</h3>
        <p>Handmade Maharashtrian jewellery for modern heirlooms.</p>
        <p style={{ color: '#deb87b', fontSize: '10px' }}>
          ✦ Authentic Peshwai Craft
        </p>

        {/* Quick Social & Chat buttons in footer branding */}
        <div className="footerSocialBtns">
          <a
            className="footerWhatsAppBtn"
            href={`https://wa.me/${whatsappNumber}?text=Hi%20Nathshikha%20Studio%2C%20I%20have%20an%20inquiry%20about%20your%20jewellery`}
            target="_blank"
            rel="noopener noreferrer"
            title="Chat on WhatsApp (+91 9699668421)"
          >
            <MessageSquare size={13} /> CHAT ON WHATSAPP
          </a>
          <a
            className="footerInstagramBtn"
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            title="Follow us on Instagram @nakharewali.handmade"
          >
            <Instagram size={13} /> @nakharewali.handmade
          </a>
          <a
            className="footerFacebookBtn"
            href="https://www.facebook.com/Nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            title="Follow us on Facebook Nakharewali.handmade"
          >
            <Facebook size={13} /> Nakharewali.handmade
          </a>
        </div>
      </div>

      <div>
        <b>OUR COLLECTIONS</b>
        <Link to="/shop">All Jewellery</Link>
        <Link to="/category/Signature">Signature Collections</Link>
        <Link to="/category/Pearl">Handmade Collections</Link>
        <Link to="/category/Traditional">Traditional Collections</Link>
        <Link to="/category/Nath">Bridal Collections</Link>
      </div>

      <div>
        <b>HELP & SUPPORT</b>
        <Link to="/orders">Track Order</Link>
        <Link to="/hall-of-fame">Our Brides & Hall of Fame</Link>
        <Link to="/account">Profile</Link>
        <Link to="/about">About Us</Link>
        <Link to="/suggestion">Suggestions & Ideas</Link>
        <Link to="/contact">Contact & Studio Support</Link>
      </div>

      <div>
        <b>STUDIO CONTACT</b>
        <a href={`tel:+${whatsappNumber}`} className="footerContactRow">
          <Phone size={13} /> +91 9699668421
        </a>
        <a href="mailto:nakharewali.saaj@gmail.com" className="footerContactRow">
          <Mail size={13} /> nakharewali.saaj@gmail.com
        </a>
        <a
          href="https://www.instagram.com/nakharewali.handmade"
          target="_blank"
          rel="noopener noreferrer"
          className="footerContactRow footerInstagramRow"
        >
          <Instagram size={13} /> @nakharewali.handmade
        </a>
        <a
          href="https://www.facebook.com/Nakharewali.handmade"
          target="_blank"
          rel="noopener noreferrer"
          className="footerContactRow footerFacebookRow"
        >
          <Facebook size={13} /> Nakharewali.handmade
        </a>
        <p style={{ fontSize: '10.5px', color: '#b9a595', marginTop: 8 }}>
          Nakharewali Handmade Jewellery, Khopoli, Raigad
        </p>
        <p style={{ fontSize: '10px', color: '#9c857d' }}>
          Mon – Sat: 10:00 AM – 7:00 PM IST
        </p>
      </div>

      <div className="copy">
        <span>© 2026 Nathshikha Handmade Jewellery. All rights reserved.</span>
        <div className="copyLinks">
          <Link to="/hall-of-fame">Our Brides</Link>
          <Link to="/suggestion">Suggestions</Link>
          <a
            href="https://www.instagram.com/nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#e4c786' }}
          >
            Instagram
          </a>
          <a
            href="https://www.facebook.com/Nakharewali.handmade"
            target="_blank"
            rel="noopener noreferrer"
            style={{ color: '#e4c786' }}
          >
            Facebook
          </a>
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
