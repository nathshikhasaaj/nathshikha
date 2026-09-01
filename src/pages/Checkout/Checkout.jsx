import React, { useState, useEffect } from 'react';
import { useNavigate, Link, Navigate } from 'react-router-dom';
import { QRCodeSVG } from 'qrcode.react';
import {
  User,
  Sparkles,
  Phone,
  ShieldCheck,
  CheckCircle2,
  Clock,
  ShoppingBag,
  ExternalLink,
  MapPin,
  Truck,
  Store,
  AlertCircle,
  Loader2,
  Tag,
  Boxes,
  PackagePlus,
  Check,
  ArrowRight,
  Gift
} from 'lucide-react';
import { api } from '../../services/api';
import { useAuth } from '../../context/AuthContext';
import { useCart } from '../../context/CartContext';
import { useToast } from '../../context/ToastContext';
import { useLanguage } from '../../context/LanguageContext';
import { money, formatOrderStatus } from '../../utils/formatters';
import SectionTitle from '../../components/common/SectionTitle';
import './Checkout.css';

const DEFAULT_UPI_ID = 'shwetadarekar04-1@okhdfcbank';

export default function Checkout() {
  const navigate = useNavigate();
  const { user, loginCustomer } = useAuth();
  const { cart, subtotal, clearCart } = useCart();
  const { setToast } = useToast();
  const { t } = useLanguage();

  // Delivery Address Mode: 'my_address' | 'gift_address'
  const [addressMode, setAddressMode] = useState('my_address');

  const [form, setForm] = useState({
    name: '',
    phone: '',
    email: '',
    address: '',
    pincode: ''
  });

  // Gift Recipient and Buyer Forms
  const [giftForm, setGiftForm] = useState({
    recipientName: '',
    recipientPhone: '',
    address: '',
    pincode: ''
  });

  const [buyerForm, setBuyerForm] = useState({
    name: '',
    phone: '',
    email: ''
  });

  const [savedAddresses, setSavedAddresses] = useState({
    defaultAddress: null,
    giftAddresses: []
  });
  const [selectedSavedGiftId, setSelectedSavedGiftId] = useState('');

  const [pincodeLoading, setPincodeLoading] = useState(false);
  const [pincodeError, setPincodeError] = useState('');
  const [locationData, setLocationData] = useState(null);
  const [selectedShippingMethod, setSelectedShippingMethod] = useState('');

  // Combine Shipment / Merge Order State
  const [eligibleMergeOrders, setEligibleMergeOrders] = useState([]);
  const [combineChoice, setCombineChoice] = useState('separate'); // 'combine' | 'separate'
  const [selectedCombineOrderId, setSelectedCombineOrderId] = useState(null);

  // Coupon state
  const [couponCode, setCouponCode] = useState('');
  const [appliedCoupon, setAppliedCoupon] = useState(null);
  const [couponLoading, setCouponLoading] = useState(false);
  const [couponError, setCouponError] = useState('');

  const [agreeTerms, setAgreeTerms] = useState(false);
  const [createAccount, setCreateAccount] = useState(false);
  const [accountPassword, setAccountPassword] = useState('');
  const [saveDetails, setSaveDetails] = useState(false);

  const [loading, setLoading] = useState(false);
  const [orderPlacedModal, setOrderPlacedModal] = useState(null);

  // If cart is empty and no order was just placed, redirect to cart
  if (!cart.length && !orderPlacedModal) {
    return <Navigate to="/cart" replace />;
  }

  // Fetch saved customer addresses if logged in
  useEffect(() => {
    if (user) {
      setBuyerForm({
        name: user.name || '',
        phone: user.phone || '',
        email: user.email || ''
      });

      api('/auth/addresses')
        .then((res) => {
          if (res) {
            const def = res.defaultAddress || res.default_address || null;
            const gifts = res.giftAddresses || res.gift_addresses || [];
            setSavedAddresses({
              defaultAddress: def,
              giftAddresses: gifts
            });

            if (def && def.addressLine1) {
              setForm((prev) => ({
                ...prev,
                name: def.recipientName || def.recipient_name || user.name || prev.name,
                phone: def.recipientPhone || def.recipient_phone || user.phone || prev.phone,
                email: user.email || prev.email,
                address: `${def.addressLine1 || def.address_line1}${def.addressLine2 || def.address_line2 ? ', ' + (def.addressLine2 || def.address_line2) : ''}, ${def.city}, ${def.state}`,
                pincode: def.pincode || prev.pincode
              }));
            }
          }
        })
        .catch(() => {});
    }
  }, [user]);

  // Pre-fill saved details or authenticated user information
  useEffect(() => {
    try {
      const saved = JSON.parse(localStorage.getItem('nw-saved-checkout-details') || 'null');
      if (saved) {
        setForm((prev) => ({
          ...prev,
          name: saved.name || prev.name,
          phone: saved.phone || prev.phone,
          email: saved.email || prev.email,
          address: saved.address || prev.address,
          pincode: saved.pincode || prev.pincode
        }));
        setSaveDetails(true);
      } else if (user) {
        setForm((prev) => ({
          ...prev,
          name: user.name || prev.name,
          email: user.email || prev.email,
          phone: user.phone || prev.phone
        }));
      }
    } catch {
      // ignore
    }
  }, [user]);

  // Handle Saved Gift Address dropdown selection
  const handleSelectSavedGift = (giftId) => {
    setSelectedSavedGiftId(giftId);
    if (!giftId) {
      setGiftForm({ recipientName: '', recipientPhone: '', address: '', pincode: '' });
      return;
    }
    const match = (savedAddresses.giftAddresses || []).find(
      (g) => (g.id || g._id) === giftId
    );
    if (match) {
      setGiftForm({
        recipientName: match.recipient_name || match.recipientName || '',
        recipientPhone: match.recipient_phone || match.recipientPhone || '',
        address: `${match.address_line1 || match.addressLine1}${match.address_line2 || match.addressLine2 ? ', ' + (match.address_line2 || match.addressLine2) : ''}, ${match.city}, ${match.state}`,
        pincode: match.pincode || ''
      });
    }
  };

  // Fetch merge-eligible active orders for customer
  useEffect(() => {
    let isMounted = true;
    const fetchEligible = async () => {
      try {
        const queryParams = new URLSearchParams();
        const activeEmail = addressMode === 'gift_address' ? (buyerForm.email || user?.email) : form.email;
        const activePhone = addressMode === 'gift_address' ? (buyerForm.phone || user?.phone) : form.phone;

        if (activeEmail && activeEmail.trim()) queryParams.set('email', activeEmail.trim());
        if (activePhone && activePhone.trim()) queryParams.set('phone', activePhone.trim());

        const data = await api(`/orders/eligible-merge-orders?${queryParams.toString()}`).catch(() => []);
        if (isMounted && Array.isArray(data)) {
          setEligibleMergeOrders(data);
          setSelectedCombineOrderId((prev) => {
            if (prev && !data.some((o) => o.id === prev || o.order_no === prev)) {
              return null;
            }
            return prev;
          });
        }
      } catch {
        if (isMounted) setEligibleMergeOrders([]);
      }
    };

    if (user || (form.email.trim().includes('@') && form.phone.trim().length >= 10)) {
      fetchEligible();
    } else {
      setEligibleMergeOrders([]);
    }

    return () => {
      isMounted = false;
    };
  }, [user, form.email, form.phone, buyerForm.email, buyerForm.phone, addressMode]);

  // Handle PIN Code Lookup when 6 digits are entered (always on destination PIN)
  useEffect(() => {
    const activePin = (addressMode === 'gift_address' ? giftForm.pincode : form.pincode).trim();
    if (activePin.length === 6 && /^[1-9][0-9]{5}$/.test(activePin)) {
      let isMounted = true;
      setPincodeLoading(true);
      setPincodeError('');

      api(`/shipping/lookup/${activePin}`)
        .then((data) => {
          if (!isMounted) return;
          if (data && data.valid && Array.isArray(data.options)) {
            setLocationData(data);
            setPincodeError('');
            const defaultMethod = data.options[1]?.id || data.options[0]?.id || 'self_pickup';
            setSelectedShippingMethod((prev) => {
              return data.options.some((o) => o.id === prev) ? prev : defaultMethod;
            });
          } else {
            setLocationData(null);
            setPincodeError(data?.error || "We couldn't verify this PIN code. Please check and try again.");
            setSelectedShippingMethod('');
          }
        })
        .catch((err) => {
          if (!isMounted) return;
          setLocationData(null);
          setPincodeError(err.message || "We couldn't verify this PIN code. Please check and try again.");
          setSelectedShippingMethod('');
        })
        .finally(() => {
          if (isMounted) setPincodeLoading(false);
        });

      return () => {
        isMounted = false;
      };
    } else if (activePin.length > 0 && activePin.length < 6) {
      setLocationData(null);
      setPincodeError('Please enter a full 6-digit PIN code.');
      setSelectedShippingMethod('');
    } else if (activePin.length === 0) {
      setLocationData(null);
      setPincodeError('');
      setSelectedShippingMethod('');
    }
  }, [addressMode, form.pincode, giftForm.pincode]);

  // Compute compatible eligible orders based on destination & shipping method
  const compatibleOrders = (eligibleMergeOrders || []).filter((o) => {
    if (locationData?.pincode && String(o.pincode).trim() !== String(locationData.pincode).trim()) {
      return false;
    }
    const isNewSelfPickup = selectedShippingMethod === 'self_pickup';
    const isExistingSelfPickup = o.shipping_method === 'Self Pickup' || o.shipping_method === 'self_pickup';
    if (isNewSelfPickup !== isExistingSelfPickup) {
      return false;
    }
    return true;
  });

  // Automatically select first compatible order if user opts to combine
  useEffect(() => {
    if (combineChoice === 'combine') {
      if (!selectedCombineOrderId && compatibleOrders.length > 0) {
        setSelectedCombineOrderId(compatibleOrders[0].id);
      }
    } else {
      setSelectedCombineOrderId(null);
    }
  }, [combineChoice, compatibleOrders]);

  // Derived Shipping Charge & Totals
  const activeOption = locationData?.options?.find((opt) => opt.id === selectedShippingMethod);
  const isCombinedShipment = combineChoice === 'combine' && Boolean(selectedCombineOrderId);
  const rawShippingCharge = activeOption ? activeOption.charge : 0;
  const shippingCharge = isCombinedShipment ? 0 : rawShippingCharge;
  const couponDiscount = appliedCoupon ? appliedCoupon.discount : 0;
  const grandTotal = Math.max(0, subtotal - couponDiscount) + shippingCharge;
  const shippingSavings = isCombinedShipment ? rawShippingCharge : 0;

  // Selected combined order details
  const selectedCombineOrder = compatibleOrders.find((o) => o.id === selectedCombineOrderId);

  // Handle Coupon Apply
  const handleApplyCoupon = async (e) => {
    e?.preventDefault();
    if (!couponCode.trim()) {
      return setCouponError('Please enter a coupon code.');
    }
    setCouponLoading(true);
    setCouponError('');
    try {
      const res = await api('/coupons/validate', {
        method: 'POST',
        body: JSON.stringify({
          code: couponCode.trim(),
          items: cart.map((x) => ({ id: x.id, qty: x.qty }))
        })
      });

      if (res.valid) {
        setAppliedCoupon(res);
        setCouponError('');
        setToast(`${res.code} applied successfully!`);
      } else {
        setAppliedCoupon(null);
        setCouponError(res.error || 'Invalid coupon code.');
      }
    } catch (err) {
      setAppliedCoupon(null);
      setCouponError(err.message || 'Failed to apply coupon.');
    } finally {
      setCouponLoading(false);
    }
  };

  const handleRemoveCoupon = () => {
    setAppliedCoupon(null);
    setCouponCode('');
    setCouponError('');
    setToast('Coupon removed.');
  };

  const configuredUpiId = import.meta.env.VITE_UPI_ID || DEFAULT_UPI_ID;

  const upiLink = `upi://pay?pa=${encodeURIComponent(configuredUpiId)}&pn=${encodeURIComponent(
    'Nathshikha Handmade Jewellery'
  )}&am=${grandTotal}&cu=INR&tn=${encodeURIComponent('Nathshikha Jewellery Order')}`;

  const placeOrder = async (e) => {
    e?.preventDefault();

    const isGiftOrder = addressMode === 'gift_address';

    if (isGiftOrder) {
      if (!giftForm.recipientName.trim()) {
        return setToast("Please enter the gift recipient's full name.");
      }
      if (!giftForm.recipientPhone.trim() || giftForm.recipientPhone.trim().length !== 10) {
        return setToast("Please enter a valid 10-digit mobile number for the recipient.");
      }
      if (!buyerForm.name.trim() && !user?.name) {
        return setToast("Please enter your name (Sender / Buyer).");
      }
      if (!buyerForm.phone.trim() && !user?.phone) {
        return setToast("Please enter your mobile number (Sender / Buyer).");
      }
      if (!buyerForm.email.trim() && !user?.email) {
        return setToast("Please enter your email address (for order updates).");
      }
      if (!giftForm.address.trim()) {
        return setToast("Please enter the complete delivery address for the recipient.");
      }
      const cleanPin = giftForm.pincode.trim();
      if (!cleanPin || cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
        return setToast("Please enter a valid 6-digit PIN code for the recipient.");
      }
    } else {
      if (!form.name.trim()) {
        return setToast('Please enter your full name.');
      }
      if (!form.phone.trim() || form.phone.trim().length !== 10) {
        return setToast('Please enter a valid 10-digit mobile number.');
      }
      if (!form.email.trim()) {
        return setToast('Please enter your email address.');
      }
      if (!form.address.trim()) {
        return setToast('Please enter your complete delivery address.');
      }
      const cleanPin = form.pincode.trim();
      if (!cleanPin || cleanPin.length !== 6 || !/^[1-9][0-9]{5}$/.test(cleanPin)) {
        return setToast('Please enter a valid 6-digit PIN code.');
      }
    }

    if (!locationData || !locationData.valid) {
      return setToast('Please verify the delivery PIN code to select a shipping method.');
    }
    if (!selectedShippingMethod) {
      return setToast('Please select a shipping method.');
    }

    if (!agreeTerms) {
      return setToast(
        t('terms_required_error', 'Please agree to the Terms & Conditions and Privacy Policy to proceed.')
      );
    }

    const effectiveBuyerName = isGiftOrder ? (buyerForm.name.trim() || user?.name || '') : form.name.trim();
    const effectiveBuyerEmail = isGiftOrder ? (buyerForm.email.trim().toLowerCase() || user?.email || '') : form.email.trim().toLowerCase();
    const effectiveBuyerPhone = isGiftOrder ? (buyerForm.phone.trim() || user?.phone || '') : form.phone.trim();

    if (!user && createAccount) {
      if (!accountPassword || accountPassword.trim().length < 6) {
        return setToast(
          t('password_required_error', 'Password must be at least 6 characters to create an account.')
        );
      }
    }

    setLoading(true);
    try {
      // 1. If guest opted to create account, register and log in before placing order
      if (!user && createAccount) {
        try {
          const authData = await api('/auth/register', {
            method: 'POST',
            body: JSON.stringify({
              name: effectiveBuyerName,
              email: effectiveBuyerEmail,
              password: accountPassword
            })
          });
          loginCustomer(authData.user, authData.token);
        } catch (regErr) {
          throw new Error(
            regErr.message || 'Failed to create account. Please check your details or continue without creating account.'
          );
        }
      }

      // 2. Save or clear details for later
      if (saveDetails && !isGiftOrder) {
        localStorage.setItem(
          'nw-saved-checkout-details',
          JSON.stringify({
            name: form.name.trim(),
            phone: form.phone.trim(),
            email: form.email.trim(),
            address: form.address.trim(),
            pincode: form.pincode.trim()
          })
        );
      } else if (!isGiftOrder) {
        localStorage.removeItem('nw-saved-checkout-details');
      }

      // 3. Place order with accurate gift snapshot fields
      const cleanDestinationPin = (isGiftOrder ? giftForm.pincode : form.pincode).trim();
      const orderPayload = {
        isGift: isGiftOrder,
        recipientName: isGiftOrder ? giftForm.recipientName.trim() : null,
        recipientPhone: isGiftOrder ? giftForm.recipientPhone.trim() : null,
        customerName: isGiftOrder ? effectiveBuyerName : form.name.trim(),
        customerPhone: isGiftOrder ? effectiveBuyerPhone : form.phone.trim(),
        customerEmail: isGiftOrder ? effectiveBuyerEmail : form.email.trim(),
        name: isGiftOrder ? giftForm.recipientName.trim() : form.name.trim(),
        phone: isGiftOrder ? giftForm.recipientPhone.trim() : form.phone.trim(),
        email: effectiveBuyerEmail,
        address: isGiftOrder ? giftForm.address.trim() : form.address.trim(),
        pincode: cleanDestinationPin,
        shippingMethod: selectedShippingMethod,
        couponCode: appliedCoupon ? appliedCoupon.code : null,
        city: locationData.city,
        state: locationData.state,
        items: cart.map((x) => ({ id: x.id, qty: x.qty })),
        paymentMethod: 'upi',
        combineWithOrderId: isCombinedShipment ? selectedCombineOrderId : null
      };

      const created = await api('/orders', {
        method: 'POST',
        body: JSON.stringify(orderPayload)
      });

      const orderData = created.order;
      if (created.combined_with_order_no) {
        orderData.combined_with_order_no = created.combined_with_order_no;
      }
      if (created.shipment_group_code) {
        orderData.shipment_group_code = created.shipment_group_code;
      }

      localStorage.setItem(
        'nw-last-order',
        JSON.stringify({ order: orderData, token: created.guest_token || null })
      );

      // Clear the cart on successful order creation
      clearCart();

      // Show Order Placed Successfully popup modal
      setOrderPlacedModal(orderData);
      setToast(
        isCombinedShipment
          ? `Order placed and successfully combined with #${created.combined_with_order_no}!`
          : isGiftOrder
          ? 'Gift order placed successfully! 🎁'
          : 'Order placed successfully!'
      );
    } catch (err) {
      setToast(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <main className="page checkoutPage">
      <SectionTitle
        title={t('checkout_title', 'Checkout')}
        sub={t(
          'checkout_sub',
          'Complete your delivery details. Dynamic shipping calculated by PIN code.'
        )}
      />

      {!user && (
        <div className="guestBanner">
          <span>
            <User /> <b>{t('guest_banner_title', 'Guest checkout available')}</b>
            <small>
              {t(
                'guest_banner_desc',
                'Place your order without creating an account. You can create one later to save your details and track orders.'
              )}
            </small>
          </span>
          <Link className="outlineBtn" to="/login">
            {t('login_instead', 'LOGIN INSTEAD')}
          </Link>
        </div>
      )}

      <div className="checkout">
        {/* Left Side: Delivery Details & Shipping Method */}
        <form id="checkoutForm" onSubmit={placeOrder}>
          <div className="formSectionHeader">
            <MapPin size={16} />
            <h3>Delivery & Contact Details</h3>
          </div>

          {/* Delivery Mode Selector: My Address vs Send as a Gift */}
          <div className="addressModeSelector">
            <label className={`addressModeOption ${addressMode === 'my_address' ? 'active' : ''}`}>
              <input
                type="radio"
                name="addressMode"
                value="my_address"
                checked={addressMode === 'my_address'}
                onChange={() => setAddressMode('my_address')}
              />
              <User size={15} />
              <span>Deliver to My Address</span>
            </label>

            <label className={`addressModeOption ${addressMode === 'gift_address' ? 'active' : ''}`}>
              <input
                type="radio"
                name="addressMode"
                value="gift_address"
                checked={addressMode === 'gift_address'}
                onChange={() => setAddressMode('gift_address')}
              />
              <Gift size={15} color="var(--maroon)" />
              <span>Send as a Gift 🎁</span>
            </label>
          </div>

          {addressMode === 'my_address' ? (
            <>
              <input
                required
                placeholder={t('full_name', 'Full Name')}
                value={form.name}
                onChange={(e) => setForm({ ...form, name: e.target.value })}
              />
              <input
                required
                inputMode="tel"
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder={t('mobile_10digit', '10-digit Mobile Number')}
                value={form.phone}
                onChange={(e) =>
                  setForm({ ...form, phone: e.target.value.replace(/\D/g, '') })
                }
              />
              <input
                required
                type="email"
                placeholder={t('email_address', 'Email Address')}
                value={form.email}
                onChange={(e) => setForm({ ...form, email: e.target.value })}
              />
              <textarea
                required
                placeholder={t('delivery_address', 'Complete Delivery Address (House/Flat No, Street, Area)')}
                value={form.address}
                onChange={(e) => setForm({ ...form, address: e.target.value })}
              />

              {/* PIN Code Input with Live Lookup */}
              <div className="pincodeInputGroup">
                <div className="pincodeFieldWrap">
                  <input
                    required
                    inputMode="numeric"
                    pattern="[1-9][0-9]{5}"
                    maxLength="6"
                    placeholder="6-digit PIN Code (e.g. 410203 or 411001)"
                    value={form.pincode}
                    onChange={(e) =>
                      setForm({
                        ...form,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6)
                      })
                    }
                    className={`pincodeInput ${
                      locationData ? 'pincodeInputValid' : pincodeError ? 'pincodeInputError' : ''
                    }`}
                  />
                  {pincodeLoading && (
                    <Loader2 size={16} className="pincodeSpinner" />
                  )}
                </div>

                {locationData && (
                  <div className="locationVerifiedBadge">
                    <CheckCircle2 size={14} />
                    <span>
                      <b>{locationData.city}</b>, {locationData.state}{' '}
                      {locationData.location_type === 'khopoli' && (
                        <small className="khopoliTag">✦ Khopoli City (Raigad)</small>
                      )}
                    </span>
                  </div>
                )}

                {pincodeError && (
                  <div className="pincodeErrorText">
                    <AlertCircle size={13} />
                    <span>{pincodeError}</span>
                  </div>
                )}
              </div>
            </>
          ) : (
            <>
              <div className="giftCheckoutNotice">
                <Gift size={20} color="var(--maroon)" />
                <div>
                  <b>Gift Delivery Order 🎁</b>
                  <p>We'll deliver this jewellery directly to your recipient. Shipping charges will be calculated based on their delivery PIN code.</p>
                </div>
              </div>

              {/* Saved Gift Addresses Picker (if available) */}
              {savedAddresses.giftAddresses && savedAddresses.giftAddresses.length > 0 && (
                <div className="savedGiftDropdownWrap">
                  <label>Select Saved Gift Recipient:</label>
                  <select
                    value={selectedSavedGiftId}
                    onChange={(e) => handleSelectSavedGift(e.target.value)}
                  >
                    <option value="">-- Or enter new recipient details below --</option>
                    {savedAddresses.giftAddresses.map((ga) => (
                      <option key={ga.id || ga._id} value={ga.id || ga._id}>
                        {ga.recipient_name || ga.recipientName} ({ga.city}, {ga.pincode})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              <div className="formSectionSubheader">
                <span>1. Gift Recipient's Delivery Information</span>
              </div>

              <input
                required
                placeholder="Recipient Full Name"
                value={giftForm.recipientName}
                onChange={(e) => setGiftForm({ ...giftForm, recipientName: e.target.value })}
              />
              <input
                required
                inputMode="tel"
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="Recipient 10-digit Mobile Number"
                value={giftForm.recipientPhone}
                onChange={(e) =>
                  setGiftForm({ ...giftForm, recipientPhone: e.target.value.replace(/\D/g, '') })
                }
              />
              <textarea
                required
                placeholder="Recipient Complete Delivery Address (House/Flat No, Street, Area)"
                value={giftForm.address}
                onChange={(e) => setGiftForm({ ...giftForm, address: e.target.value })}
              />

              {/* Recipient PIN Code Input with Live Lookup */}
              <div className="pincodeInputGroup">
                <div className="pincodeFieldWrap">
                  <input
                    required
                    inputMode="numeric"
                    pattern="[1-9][0-9]{5}"
                    maxLength="6"
                    placeholder="Recipient 6-digit PIN Code"
                    value={giftForm.pincode}
                    onChange={(e) =>
                      setGiftForm({
                        ...giftForm,
                        pincode: e.target.value.replace(/\D/g, '').slice(0, 6)
                      })
                    }
                    className={`pincodeInput ${
                      locationData ? 'pincodeInputValid' : pincodeError ? 'pincodeInputError' : ''
                    }`}
                  />
                  {pincodeLoading && (
                    <Loader2 size={16} className="pincodeSpinner" />
                  )}
                </div>

                {locationData && (
                  <div className="locationVerifiedBadge">
                    <CheckCircle2 size={14} />
                    <span>
                      <b>{locationData.city}</b>, {locationData.state}{' '}
                      {locationData.location_type === 'khopoli' && (
                        <small className="khopoliTag">✦ Khopoli City (Raigad)</small>
                      )}
                    </span>
                  </div>
                )}

                {pincodeError && (
                  <div className="pincodeErrorText">
                    <AlertCircle size={13} />
                    <span>{pincodeError}</span>
                  </div>
                )}
              </div>

              <div className="formSectionSubheader buyerHeader">
                <span>2. Your Details (Sender / Buyer)</span>
              </div>

              <input
                required
                placeholder="Your Full Name (Sender)"
                value={buyerForm.name}
                onChange={(e) => setBuyerForm({ ...buyerForm, name: e.target.value })}
              />
              <input
                required
                inputMode="tel"
                pattern="[0-9]{10}"
                maxLength="10"
                placeholder="Your 10-digit Mobile Number"
                value={buyerForm.phone}
                onChange={(e) =>
                  setBuyerForm({ ...buyerForm, phone: e.target.value.replace(/\D/g, '') })
                }
              />
              <input
                required
                type="email"
                placeholder="Your Email Address (for order tracking & updates)"
                value={buyerForm.email}
                onChange={(e) => setBuyerForm({ ...buyerForm, email: e.target.value })}
              />
            </>
          )}

          {/* Shipping Method Section */}
          <div className="shippingMethodSection">
            <div className="shippingSectionHeader">
              <Truck size={16} />
              <h4>Shipping Method</h4>
            </div>

            {locationData && Array.isArray(locationData.options) && locationData.options.length > 0 ? (
              <div className="shippingOptionsList">
                {locationData.options.map((opt) => {
                  const isSelected = selectedShippingMethod === opt.id;
                  const isSelfPickup = opt.id === 'self_pickup';

                  return (
                    <label
                      key={opt.id}
                      className={`shippingOptionCard ${isSelected ? 'selected' : ''}`}
                      htmlFor={`shipping_${opt.id}`}
                    >
                      <input
                        type="radio"
                        id={`shipping_${opt.id}`}
                        name="shippingMethod"
                        value={opt.id}
                        checked={isSelected}
                        onChange={() => setSelectedShippingMethod(opt.id)}
                      />
                      <div className="optionIcon">
                        {isSelfPickup ? <Store size={18} /> : <Truck size={18} />}
                      </div>
                      <div className="optionDetails">
                        <div className="optionTitleRow">
                          <span className="optionName">{opt.name}</span>
                          <span className={`optionChargeBadge ${opt.charge === 0 ? 'freeBadge' : ''}`}>
                            {opt.charge === 0 ? 'FREE' : money(opt.charge)}
                          </span>
                        </div>
                        <p className="optionDesc">{opt.description}</p>
                      </div>
                    </label>
                  );
                })}
              </div>
            ) : (
              <div className="shippingPromptBox">
                <Truck size={20} />
                <p>Enter your 6-digit PIN code above to view available delivery options and charges.</p>
              </div>
            )}
          </div>

          {/* Combine Shipment / Merge Order Section (If eligible orders found for customer within 0-15 days) */}
          {compatibleOrders.length > 0 && (
            <div className="combineOrderSection">
              <div className="combineSectionHeader">
                <div className="combineHeaderTitle">
                  <div className="combineBadgeIcon">
                    <Boxes size={18} />
                  </div>
                  <div>
                    <h4>📦 Combine With Your Existing Order</h4>
                    <p>
                      You have active order(s) placed within the last 15 days. You can combine this new order into your existing shipment to save on delivery fees and receive all pieces together in one parcel.
                    </p>
                  </div>
                </div>
              </div>

              <div className="combineOptionsContainer">
                {/* 1. Combine Option */}
                <div className={`combineChoiceCard ${combineChoice === 'combine' ? 'activeChoice' : ''}`}>
                  <label className="combineChoiceRadioLabel" htmlFor="choiceCombine">
                    <input
                      type="radio"
                      id="choiceCombine"
                      name="combineShipmentChoice"
                      value="combine"
                      checked={combineChoice === 'combine'}
                      onChange={() => setCombineChoice('combine')}
                    />
                    <div className="combineChoiceText">
                      <div className="combineTitleBadgeRow">
                        <span className="combineChoiceTitle">Combine with an existing shipment</span>
                        <span className="freeCombineBadge">₹0 FREE Combined Shipping</span>
                      </div>
                      <p className="combineChoiceSub">
                        Both orders will travel together under one Shipment Group without charging duplicate delivery fees.
                      </p>
                    </div>
                  </label>

                  {/* List of eligible orders to pick from */}
                  {combineChoice === 'combine' && (
                    <div className="eligibleOrdersList">
                      <span className="eligibleListLabel">Select which existing shipment/order to combine with:</span>
                      {compatibleOrders.map((ord) => {
                        const isOrdSelected = selectedCombineOrderId === ord.id;
                        return (
                          <div
                            key={ord.id}
                            className={`eligibleOrderItemCard ${isOrdSelected ? 'selectedOrder' : ''}`}
                            onClick={() => setSelectedCombineOrderId(ord.id)}
                          >
                            <div className="orderSelectRadio">
                              <input
                                type="radio"
                                name="selectedCombineOrderRadio"
                                checked={isOrdSelected}
                                onChange={() => setSelectedCombineOrderId(ord.id)}
                              />
                            </div>
                            <div className="orderMetaCol">
                              <div className="orderNoAgeRow">
                                <span className="ordNoText">Order #{ord.order_no}</span>
                                <span className="ordAgeBadge">Order Age: {ord.order_age_label}</span>
                                <span className="ordStatusBadge">Status: {formatOrderStatus(ord.order_status)}</span>
                              </div>
                              {ord.shipment_group_code && (
                                <small className="ordShipmentGroupText">
                                  ✦ Shipment Group <b>{ord.shipment_group_code}</b>
                                </small>
                              )}
                              {ord.items_preview && (
                                <p className="ordItemsText">Items: {ord.items_preview} ({ord.items_count} item{ord.items_count > 1 ? 's' : ''})</p>
                              )}
                            </div>
                          </div>
                        );
                      })}

                      {selectedCombineOrder && (
                        <div className="combineConfirmationNote">
                          <CheckCircle2 size={14} color="#198754" />
                          <span>
                            This order will be combined with <b>#{selectedCombineOrder.order_no}</b> (placed {selectedCombineOrder.order_age_label} ago). Both orders will be shipped together in one package.
                          </span>
                        </div>
                      )}
                    </div>
                  )}
                </div>

                {/* 2. Ship Separately Option */}
                <div className={`combineChoiceCard ${combineChoice === 'separate' ? 'activeChoice' : ''}`}>
                  <label className="combineChoiceRadioLabel" htmlFor="choiceSeparate">
                    <input
                      type="radio"
                      id="choiceSeparate"
                      name="combineShipmentChoice"
                      value="separate"
                      checked={combineChoice === 'separate'}
                      onChange={() => setCombineChoice('separate')}
                    />
                    <div className="combineChoiceText">
                      <span className="combineChoiceTitle">Ship separately</span>
                      <p className="combineChoiceSub">
                        Deliver this order as an independent parcel with standard shipping rates and separate courier tracking.
                      </p>
                    </div>
                  </label>
                </div>
              </div>
            </div>
          )}

          {/* 3 Checkboxes Section */}
          <div className="checkoutCheckboxes">
            {/* Checkbox 1: Agree to Terms and Conditions */}
            <label className="checkoutCheckboxLabel" htmlFor="agreeTerms">
              <input
                type="checkbox"
                id="agreeTerms"
                checked={agreeTerms}
                onChange={(e) => setAgreeTerms(e.target.checked)}
                required
              />
              <span className="checkboxCustom"></span>
              <span className="checkboxText">
                {t('agree_terms_text', 'I agree to the')}{' '}
                <Link
                  to="/terms"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policyLink"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('terms_of_service', 'Terms & Conditions')}
                </Link>{' '}
                {t('and', 'and')}{' '}
                <Link
                  to="/privacy-policy"
                  target="_blank"
                  rel="noopener noreferrer"
                  className="policyLink"
                  onClick={(e) => e.stopPropagation()}
                >
                  {t('privacy_policy', 'Privacy Policy')}
                </Link>
                <span className="requiredStar"> *</span>
              </span>
            </label>

            {/* Checkbox 2: Create User Account with Details */}
            {!user ? (
              <div className="accountCreationWrapper">
                <label className="checkoutCheckboxLabel" htmlFor="createAccount">
                  <input
                    type="checkbox"
                    id="createAccount"
                    checked={createAccount}
                    onChange={(e) => setCreateAccount(e.target.checked)}
                  />
                  <span className="checkboxCustom"></span>
                  <span className="checkboxText">
                    {t(
                      'create_account_checkbox',
                      'Create an account with these details for faster checkout & order tracking'
                    )}
                  </span>
                </label>

                {createAccount && (
                  <div className="accountPasswordContainer">
                    <input
                      type="password"
                      minLength="6"
                      required={createAccount}
                      placeholder={t(
                        'account_password_placeholder',
                        'Create password for your account (min 6 characters)'
                      )}
                      value={accountPassword}
                      onChange={(e) => setAccountPassword(e.target.value)}
                      autoComplete="new-password"
                      className="accountPasswordInput"
                    />
                    <small className="passwordHint">
                      ✦ Your account will be created automatically upon checkout with your name, email, and password.
                    </small>
                  </div>
                )}
              </div>
            ) : (
              <div className="userLoggedInBadge">
                <User size={14} />
                <span>
                  {t('logged_in_as', 'Logged in as')} <b>{user.name}</b> ({user.email})
                </span>
              </div>
            )}

            {/* Checkbox 3: Save Details for Later */}
            <label className="checkoutCheckboxLabel" htmlFor="saveDetails">
              <input
                type="checkbox"
                id="saveDetails"
                checked={saveDetails}
                onChange={(e) => setSaveDetails(e.target.checked)}
              />
              <span className="checkboxCustom"></span>
              <span className="checkboxText">
                {t(
                  'save_details_checkbox',
                  'Save this delivery information for future orders'
                )}
              </span>
            </label>
          </div>

          <div className="payment">
            <b>{t('payment_method', 'Payment Method')}</b>
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                gap: 10,
                padding: '12px 14px',
                background: '#fbf7ee',
                border: '1.5px solid var(--gold)',
                borderRadius: 4,
                color: 'var(--maroon)',
                fontSize: 12,
                fontWeight: 600
              }}
            >
              <ShieldCheck size={18} />
              <span>{t('pay_upi', 'Prepaid UPI — Google Pay / PhonePe / Paytm / BHIM')}</span>
            </div>
            <small style={{ color: '#887870', fontSize: '10px', marginTop: 4, display: 'block' }}>
              ✦ 100% Handcrafted artisanal jewellery — only prepaid UPI accepted.
            </small>
          </div>
        </form>

        {/* Right Side: Order Summary, UPI QR Code & "I Have Paid" Button */}
        <div className="checkoutPaymentCard">
          <div className="paymentCardHeader">
            <span className="paymentEyebrow">PREPAID UPI PAYMENT</span>
            <h3>Order Summary & Payment</h3>
          </div>

          {/* Apply Coupon / Promo Code Section */}
          <div className="checkoutCouponBox">
            <div className="couponBoxHeader">
              <Tag size={15} />
              <span>Apply Coupon / Promo Code</span>
            </div>

            {!appliedCoupon ? (
              <div className="couponInputForm">
                <input
                  type="text"
                  placeholder="Enter promo code (e.g. WELCOME20)"
                  value={couponCode}
                  onChange={(e) => {
                    setCouponCode(e.target.value.replace(/\s+/g, '').toUpperCase());
                    setCouponError('');
                  }}
                  onKeyDown={(e) => {
                    if (e.key === 'Enter') {
                      e.preventDefault();
                      handleApplyCoupon(e);
                    }
                  }}
                  className="checkoutCouponInput"
                  disabled={couponLoading}
                />
                <button
                  type="button"
                  className="goldBtn checkoutApplyBtn"
                  onClick={handleApplyCoupon}
                  disabled={couponLoading || !couponCode.trim()}
                >
                  {couponLoading ? <Loader2 size={14} className="spinIcon" /> : 'APPLY'}
                </button>
              </div>
            ) : (
              <div className="checkoutAppliedCouponBadge">
                <div className="appliedBadgeDetails">
                  <span className="appliedBadgeTitle">
                    <b>{appliedCoupon.code}</b> applied ✓
                  </span>
                  <small className="appliedBadgeDiscount">
                    {appliedCoupon.discountType === 'percent'
                      ? `${appliedCoupon.discountValue}% OFF`
                      : `₹${appliedCoupon.discountValue} OFF`} · Saved {money(appliedCoupon.discount)}
                  </small>
                </div>
                <button
                  type="button"
                  className="removeCouponLink"
                  onClick={handleRemoveCoupon}
                  title="Remove coupon"
                >
                  Remove
                </button>
              </div>
            )}

            {couponError && (
              <div className="couponErrorBanner">
                <AlertCircle size={13} />
                <span>{couponError}</span>
              </div>
            )}
          </div>

          {/* Dynamic Order Summary Breakdown */}
          <div className="checkoutOrderSummaryBox">
            <div className="summaryRow">
              <span>Subtotal:</span>
              <b>{money(subtotal)}</b>
            </div>

            {appliedCoupon && (
              <div className="summaryRow couponDiscountRow">
                <span className="couponDiscountLabel">
                  <Tag size={13} />
                  Coupon Discount ({appliedCoupon.code}):
                </span>
                <b className="discountNegativeAmount">-{money(appliedCoupon.discount)}</b>
              </div>
            )}

            <div className="summaryRow">
              <span>Shipping:</span>
              <b>
                {isCombinedShipment ? (
                  <span className="combinedFreeBadge">
                    FREE <small className="savingSmall">(-{money(rawShippingCharge)})</small>
                  </span>
                ) : locationData && activeOption ? (
                  activeOption.charge === 0 ? (
                    <span className="freeText">FREE</span>
                  ) : (
                    money(activeOption.charge)
                  )
                ) : (
                  <span className="pendingCalcText">Calculated via PIN</span>
                )}
              </b>
            </div>

            {isCombinedShipment && selectedCombineOrder ? (
              <div className="combinedSummaryNotice">
                <Boxes size={13} color="var(--gold)" />
                <span>Combined with Order #{selectedCombineOrder.order_no}</span>
              </div>
            ) : activeOption ? (
              <div className="selectedMethodNameRow">
                <Truck size={12} />
                <span>{activeOption.name}</span>
              </div>
            ) : null}

            <div className="summaryDivider"></div>
            <div className="summaryRow summaryTotalRow">
              <span>Total:</span>
              <b className="paymentCardTotal">{money(grandTotal)}</b>
            </div>
          </div>

          {/* UPI QR Code Container */}
          <div className="checkoutQrWrap">
            <QRCodeSVG value={upiLink} size={185} includeMargin />
            <small className="qrScanHint">
              Scan with GPay, PhonePe, Paytm, BHIM or any UPI app
            </small>
          </div>

          {/* Studio UPI ID box */}
          <div className="studioUpiBox">
            <span>Studio UPI ID:</span>
            <b>{configuredUpiId}</b>
          </div>

          {/* Open UPI App Link (Mobile) */}
          <a className="outlineBtn openUpiBtn" href={upiLink}>
            <ExternalLink size={14} /> OPEN UPI APP DIRECTLY
          </a>

          <p className="paymentInstructionNote">
            ✦ Scan & pay the exact total above. Once done, click <b>"I HAVE PAID"</b> to complete your order.
          </p>

          {/* I Have Paid Submit Button */}
          <button
            className="goldBtn iHavePaidBtn"
            form="checkoutForm"
            disabled={loading}
            type="submit"
          >
            {loading ? (
              <>
                <Loader2 size={16} className="btnSpinner" style={{ marginRight: 8 }} />
                <span>{t('processing', 'PROCESSING ORDER…')}</span>
              </>
            ) : (
              <span>✓ {t('i_have_paid', 'I HAVE PAID')} · {money(grandTotal)}</span>
            )}
          </button>
        </div>
      </div>

      {/* Order Placed Successfully Popup Modal */}
      {orderPlacedModal && (
        <div className="orderSuccessModalOverlay">
          <div className="orderSuccessModal" role="dialog" aria-modal="true">
            <div className="successModalIcon">
              🎉
            </div>
            <h2>Order Placed Successfully 🎉</h2>
            <p className="successSubtitle">
              Your order has been placed successfully.
            </p>

            <div className="successOrderHighlight">
              <div className="highlightRow">
                <span>Order ID:</span>
                <b className="highlightOrderNo">#{orderPlacedModal.order_no}</b>
              </div>

              {orderPlacedModal.shipment_group_code && (
                <div className="highlightRow combinedGroupRow">
                  <span>Shipment Group:</span>
                  <b className="highlightGroupCode">
                    <Boxes size={13} /> {orderPlacedModal.shipment_group_code}
                  </b>
                </div>
              )}

              {orderPlacedModal.combined_with_order_no && (
                <div className="highlightRow">
                  <span>Combined With:</span>
                  <b>#{orderPlacedModal.combined_with_order_no}</b>
                </div>
              )}

              <div className="highlightRow">
                <span>Shipping Method:</span>
                <b>{orderPlacedModal.shipping_method || 'Standard Delivery'}</b>
              </div>
              <div className="highlightRow">
                <span>Total Amount:</span>
                <b>{money(orderPlacedModal.total)}</b>
              </div>
              <div className="highlightRow">
                <span>Payment Status:</span>
                <span className="pendingVerificationTag">
                  <Clock size={12} /> Pending Verification
                </span>
              </div>
            </div>

            {orderPlacedModal.shipment_group_code && (
              <div className="combinedShipmentSuccessBox">
                <Boxes size={16} />
                <div>
                  <strong>Combined Shipment Active</strong>
                  <p>This order is linked to Shipment Group <b>{orderPlacedModal.shipment_group_code}</b> and will be packaged & dispatched together with your existing order.</p>
                </div>
              </div>
            )}

            <div className="successExplanationBox">
              <p>
                <strong>Payment verification is pending from our side.</strong>
              </p>
              <p>
                Once we verify your payment, your order will be confirmed.
              </p>
            </div>

            <div className="successModalActions">
              <Link
                to={`/order-success/${orderPlacedModal.order_no}`}
                className="goldBtn successBtn"
              >
                View Order
              </Link>
              <Link
                to="/shop"
                className="outlineBtn successBtn"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        </div>
      )}
    </main>
  );
}
