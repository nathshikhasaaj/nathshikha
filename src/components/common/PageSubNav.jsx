import React from 'react';
import { Link, useLocation } from 'react-router-dom';
import { ShieldCheck, FileText, Truck, RotateCcw, Info, Phone, Lightbulb, Star, Sparkles } from 'lucide-react';
import './PageSubNav.css';

export function LegalSubNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const links = [
    { title: 'Terms & Conditions', path: '/terms', icon: FileText },
    { title: 'Privacy Policy', path: '/privacy-policy', icon: ShieldCheck },
    { title: 'Shipping Policy', path: '/shipping-policy', icon: Truck },
    { title: 'Refund Policy', path: '/refund-policy', icon: RotateCcw }
  ];

  return (
    <nav className="pageSubNavWrapper" aria-label="Legal Policies Navigation">
      <div className="pageSubNavScroll">
        {links.map((link) => {
          const isActive = currentPath === link.path || (link.path === '/terms' && currentPath === '/terms-of-service');
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`pageSubNavLink ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{link.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}

export function InfoSubNav() {
  const location = useLocation();
  const currentPath = location.pathname;

  const links = [
    { title: 'About Us', path: '/about', icon: Info },
    { title: 'Contact Us', path: '/contact', icon: Phone },
    { title: 'Suggestions', path: '/suggestion', icon: Lightbulb },
    { title: 'Reviews', path: '/reviews', icon: Star },
    { title: 'Hall of Fame', path: '/hall-of-fame', icon: Sparkles }
  ];

  return (
    <nav className="pageSubNavWrapper" aria-label="About & Community Navigation">
      <div className="pageSubNavScroll">
        {links.map((link) => {
          const isActive = currentPath === link.path || (link.path === '/reviews' && currentPath === '/review');
          const Icon = link.icon;
          return (
            <Link
              key={link.path}
              to={link.path}
              className={`pageSubNavLink ${isActive ? 'active' : ''}`}
            >
              <Icon size={14} />
              <span>{link.title}</span>
            </Link>
          );
        })}
      </div>
    </nav>
  );
}
