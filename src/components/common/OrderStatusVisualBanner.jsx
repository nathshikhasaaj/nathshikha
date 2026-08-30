import React from 'react';
import {
  Sparkles,
  CheckCircle2,
  Clock,
  Box,
  Truck,
  FileCheck
} from 'lucide-react';
import './OrderStatusVisualBanner.css';

export const ORDER_STAGE_CONFIG = {
  placed: {
    key: 'placed',
    label: 'Order Received',
    badge: 'ORDER RECEIVED',
    title: 'Order Received & Queued',
    desc: 'Your order details have been securely recorded and are being queued for verification.',
    img: '/assets/order-placed.svg',
    icon: FileCheck,
    themeClass: 'bannerThemePlaced'
  },
  confirmed: {
    key: 'confirmed',
    label: 'Order Confirmed',
    badge: 'PAYMENT VERIFIED',
    title: 'Order Confirmed & Verified ✓',
    desc: 'Your payment is verified. Your design is confirmed and queued for artisan allocation.',
    img: '/assets/order-confirmed.svg',
    icon: CheckCircle2,
    themeClass: 'bannerThemeConfirmed'
  },
  making: {
    key: 'making',
    label: 'Artisan Crafting',
    badge: 'IN CRAFTING',
    title: 'Artisan Handcrafting in Progress ✨',
    desc: 'Our master artisans are handcrafting, shaping intricate filigree, and setting kemp stones with precision.',
    img: '/assets/order-making.svg',
    icon: Sparkles,
    themeClass: 'bannerThemeMaking'
  },
  packing: {
    key: 'packing',
    label: 'Quality Check & Packaging',
    badge: 'QC & PACKAGING',
    title: 'Quality Inspection & Luxury Packaging 📦',
    desc: 'Your piece is undergoing thorough quality inspection and being secured in luxury velvet packaging.',
    img: '/assets/order-packing.svg',
    icon: Box,
    themeClass: 'bannerThemePacking'
  },
  processing: {
    key: 'packing',
    label: 'Quality Check & Packaging',
    badge: 'QC & PACKAGING',
    title: 'Quality Inspection & Luxury Packaging 📦',
    desc: 'Your piece is undergoing thorough quality inspection and being secured in luxury velvet packaging.',
    img: '/assets/order-packing.svg',
    icon: Box,
    themeClass: 'bannerThemePacking'
  },
  shipped: {
    key: 'shipped',
    label: 'Dispatched & In Transit',
    badge: 'DISPATCHED',
    title: 'Dispatched & In Transit 🚚',
    desc: 'Your order is securely dispatched with our insured courier partner and heading to your doorstep.',
    img: '/assets/order-shipped.svg',
    icon: Truck,
    themeClass: 'bannerThemeShipped'
  },
  delivered: {
    key: 'delivered',
    label: 'Delivered',
    badge: 'DELIVERED',
    title: 'Successfully Delivered ✓',
    desc: 'Your jewellery has arrived! We hope you cherish this handcrafted heirloom piece.',
    img: '/assets/order-delivered.svg',
    icon: CheckCircle2,
    themeClass: 'bannerThemeDelivered'
  }
};

export default function OrderStatusVisualBanner({ status }) {
  const normalizedStatus = String(status || 'placed').toLowerCase();
  const config = ORDER_STAGE_CONFIG[normalizedStatus] || ORDER_STAGE_CONFIG.placed;
  const IconComponent = config.icon;

  return (
    <div className={`orderLifecycleVisualBanner ${config.themeClass}`}>
      <div className="lifecycleVisualWrap">
        <img
          src={config.img}
          alt={config.title}
          className="lifecycleVisualGif"
          loading="lazy"
        />
      </div>
      <div className="lifecycleBannerDetails">
        <span className="lifecycleStageBadge">
          <IconComponent size={12} />
          <span>{config.badge}</span>
        </span>
        <h4>{config.title}</h4>
        <p>{config.desc}</p>
      </div>
    </div>
  );
}
