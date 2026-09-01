import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Package,
  Heart,
  ShoppingBag,
  LogOut,
  User,
  Phone,
  Mail,
  MapPin,
  Gift,
  Plus,
  Edit2,
  Trash2,
  CheckCircle2,
  Lock,
  X,
  ShieldCheck,
  KeyRound,
  Eye,
  EyeOff
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import { useToast } from '../../context/ToastContext';
import { api } from '../../services/api';
import SectionTitle from '../../components/common/SectionTitle';
import './Account.css';

const INDIAN_STATES = [
  'Maharashtra',
  'Andhra Pradesh',
  'Arunachal Pradesh',
  'Assam',
  'Bihar',
  'Chhattisgarh',
  'Goa',
  'Gujarat',
  'Haryana',
  'Himachal Pradesh',
  'Jharkhand',
  'Karnataka',
  'Kerala',
  'Madhya Pradesh',
  'Manipur',
  'Meghalaya',
  'Mizoram',
  'Nagaland',
  'Odisha',
  'Punjab',
  'Rajasthan',
  'Sikkim',
  'Tamil Nadu',
  'Telangana',
  'Tripura',
  'Uttar Pradesh',
  'Uttarakhand',
  'West Bengal',
  'Delhi',
  'Chandigarh'
];

export default function Account() {
  const { user, setUser, logoutCustomer } = useAuth();
  const { setToast } = useToast();

  // Profile Edit State
  const [editingProfile, setEditingProfile] = useState(false);
  const [profileForm, setProfileForm] = useState({
    name: user?.name || '',
    phone: user?.phone || ''
  });
  const [savingProfile, setSavingProfile] = useState(false);

  // Address State
  const [addresses, setAddresses] = useState({
    defaultAddress: null,
    giftAddresses: []
  });
  const [loadingAddresses, setLoadingAddresses] = useState(false);

  // Default Address Edit State
  const [editingDefaultAddress, setEditingDefaultAddress] = useState(false);
  const [defaultAddressForm, setDefaultAddressForm] = useState({
    recipientName: '',
    recipientPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Maharashtra',
    pincode: ''
  });
  const [savingDefaultAddress, setSavingDefaultAddress] = useState(false);

  // Gift Address Modal State
  const [showGiftModal, setShowGiftModal] = useState(false);
  const [editingGiftId, setEditingGiftId] = useState(null);
  const [giftForm, setGiftForm] = useState({
    recipientName: '',
    recipientPhone: '',
    addressLine1: '',
    addressLine2: '',
    city: '',
    state: 'Maharashtra',
    pincode: ''
  });
  const [savingGift, setSavingGift] = useState(false);

  // Change Password State
  const [showPasswordModal, setShowPasswordModal] = useState(false);
  const [passwordForm, setPasswordForm] = useState({
    currentPassword: '',
    newPassword: '',
    confirmPassword: ''
  });
  const [showPasswords, setShowPasswords] = useState({
    current: false,
    new: false,
    confirm: false
  });
  const [savingPassword, setSavingPassword] = useState(false);
  const [passwordError, setPasswordError] = useState('');

  // Sync profileForm when user changes
  useEffect(() => {
    if (user) {
      setProfileForm({
        name: user.name || '',
        phone: user.phone || ''
      });
    }
  }, [user]);

  // Fetch addresses
  const loadAddresses = async () => {
    if (!user) return;
    setLoadingAddresses(true);
    try {
      const data = await api('/auth/addresses');
      if (data) {
        setAddresses({
          defaultAddress: data.defaultAddress || data.default_address || null,
          giftAddresses: data.giftAddresses || data.gift_addresses || []
        });

        if (data.defaultAddress || data.default_address) {
          const d = data.defaultAddress || data.default_address;
          setDefaultAddressForm({
            recipientName: d.recipientName || d.recipient_name || user.name || '',
            recipientPhone: d.recipientPhone || d.recipient_phone || user.phone || '',
            addressLine1: d.addressLine1 || d.address_line1 || '',
            addressLine2: d.addressLine2 || d.address_line2 || '',
            city: d.city || '',
            state: d.state || 'Maharashtra',
            pincode: d.pincode || ''
          });
        }
      }
    } catch {
      // ignore
    } finally {
      setLoadingAddresses(false);
    }
  };

  useEffect(() => {
    loadAddresses();
  }, [user]);

  // Handle Profile Update
  const handleSaveProfile = async (e) => {
    e.preventDefault();
    const cleanPhone = String(profileForm.phone).replace(/\D/g, '');
    if (cleanPhone && cleanPhone.length !== 10) {
      alert('Please enter a valid 10-digit mobile number.');
      return;
    }

    setSavingProfile(true);
    try {
      const res = await api('/auth/profile', {
        method: 'PUT',
        body: JSON.stringify({
          name: profileForm.name.trim(),
          phone: cleanPhone
        })
      });

      if (res.user) {
        setUser(res.user);
        localStorage.setItem('nw-customer-user', JSON.stringify(res.user));
        setToast('Personal details updated successfully!');
        setEditingProfile(false);
      }
    } catch (err) {
      alert(err.message || 'Failed to update profile.');
    } finally {
      setSavingProfile(false);
    }
  };

  // Handle Default Address Save
  const handleSaveDefaultAddress = async (e) => {
    e.preventDefault();
    if (!defaultAddressForm.addressLine1.trim()) {
      alert('Address Line 1 is required.');
      return;
    }
    if (!defaultAddressForm.city.trim()) {
      alert('City is required.');
      return;
    }
    if (!defaultAddressForm.pincode.trim() || defaultAddressForm.pincode.trim().length !== 6) {
      alert('Please enter a valid 6-digit delivery PIN code.');
      return;
    }

    setSavingDefaultAddress(true);
    try {
      const res = await api('/auth/address', {
        method: 'PUT',
        body: JSON.stringify(defaultAddressForm)
      });
      if (res.user) {
        setUser(res.user);
        localStorage.setItem('nw-customer-user', JSON.stringify(res.user));
      }
      setToast('Default address saved.');
      setEditingDefaultAddress(false);
      loadAddresses();
    } catch (err) {
      alert(err.message || 'Failed to save address.');
    } finally {
      setSavingDefaultAddress(false);
    }
  };

  // Handle Gift Address Open
  const handleOpenAddGift = () => {
    setGiftForm({
      recipientName: '',
      recipientPhone: '',
      addressLine1: '',
      addressLine2: '',
      city: '',
      state: 'Maharashtra',
      pincode: ''
    });
    setEditingGiftId(null);
    setShowGiftModal(true);
  };

  const handleOpenEditGift = (gift) => {
    setGiftForm({
      recipientName: gift.recipient_name || gift.recipientName || '',
      recipientPhone: gift.recipient_phone || gift.recipientPhone || '',
      addressLine1: gift.address_line1 || gift.addressLine1 || '',
      addressLine2: gift.address_line2 || gift.addressLine2 || '',
      city: gift.city || '',
      state: gift.state || 'Maharashtra',
      pincode: gift.pincode || ''
    });
    setEditingGiftId(gift.id || gift._id);
    setShowGiftModal(true);
  };

  // Handle Gift Address Submit
  const handleSaveGiftAddress = async (e) => {
    e.preventDefault();
    if (!giftForm.recipientName.trim()) {
      alert('Recipient name is required.');
      return;
    }
    if (!giftForm.recipientPhone.trim()) {
      alert('Recipient phone number is required.');
      return;
    }
    if (!giftForm.addressLine1.trim()) {
      alert('Address line 1 is required.');
      return;
    }
    if (!giftForm.city.trim()) {
      alert('City is required.');
      return;
    }
    if (!giftForm.pincode.trim() || giftForm.pincode.trim().length !== 6) {
      alert('Valid 6-digit PIN code is required.');
      return;
    }

    setSavingGift(true);
    try {
      if (editingGiftId) {
        await api(`/auth/gift-addresses/${editingGiftId}`, {
          method: 'PUT',
          body: JSON.stringify(giftForm)
        });
        setToast('Gift address updated successfully.');
      } else {
        await api('/auth/gift-addresses', {
          method: 'POST',
          body: JSON.stringify(giftForm)
        });
        setToast('Gift delivery address saved.');
      }
      setShowGiftModal(false);
      loadAddresses();
    } catch (err) {
      alert(err.message || 'Failed to save gift address.');
    } finally {
      setSavingGift(false);
    }
  };

  // Handle Delete Gift Address
  const handleDeleteGiftAddress = async (giftId) => {
    if (!window.confirm('Remove this saved gift address?')) return;
    try {
      await api(`/auth/gift-addresses/${giftId}`, {
        method: 'DELETE'
      });
      setToast('Gift address removed.');
      loadAddresses();
    } catch (err) {
      alert(err.message || 'Failed to remove gift address.');
    }
  };

  // Handle Save Password
  const handleSavePassword = async (e) => {
    e.preventDefault();
    setPasswordError('');

    if (!passwordForm.currentPassword) {
      setPasswordError('Please enter your current password.');
      return;
    }
    if (!passwordForm.newPassword || passwordForm.newPassword.length < 6) {
      setPasswordError('New password must be at least 6 characters long.');
      return;
    }
    if (passwordForm.newPassword !== passwordForm.confirmPassword) {
      setPasswordError('New password and confirm password do not match.');
      return;
    }
    if (passwordForm.currentPassword === passwordForm.newPassword) {
      setPasswordError('New password cannot be the same as your current password.');
      return;
    }

    setSavingPassword(true);
    try {
      await api('/auth/change-password', {
        method: 'PUT',
        body: JSON.stringify(passwordForm)
      });
      setToast('Password updated successfully! Please use your new password next time you login.');
      setShowPasswordModal(false);
      setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
      setShowPasswords({ current: false, new: false, confirm: false });
    } catch (err) {
      setPasswordError(err.message || 'Failed to update password.');
    } finally {
      setSavingPassword(false);
    }
  };

  return (
    <main className="page accountPage">
      <SectionTitle
        title="My Account"
        sub={
          user
            ? `Namaste, ${user.name}. Manage your profile, addresses, orders and saved heirlooms.`
            : 'Login to manage your profile and orders.'
        }
      />

      {user ? (
        <div className="accountLayout">
          {/* Top Quick Navigation Tiles */}
          <div className="accountGrid">
            <Link to="/orders">
              <Package />
              <b>My Orders</b>
              <span>Track orders & history</span>
            </Link>
            <Link to="/wishlist">
              <Heart />
              <b>Wishlist</b>
              <span>Saved favourites</span>
            </Link>
            <Link to="/cart">
              <ShoppingBag />
              <b>My Bag</b>
              <span>Items ready to checkout</span>
            </Link>
            <button className="outlineBtn logoutTileBtn" onClick={logoutCustomer} type="button">
              <LogOut />
              <b>Logout</b>
              <span>Sign out securely</span>
            </button>
          </div>

          {/* Section 1: Personal Details */}
          <div className="accountCard profileDetailsCard">
            <div className="accountCardHeader">
              <div className="headerTitleBox">
                <User size={20} color="var(--maroon)" />
                <div>
                  <h3>Personal Information</h3>
                  <p>Your primary account details used for notifications and communications.</p>
                </div>
              </div>

              {!editingProfile && (
                <button
                  type="button"
                  className="editSectionBtn"
                  onClick={() => setEditingProfile(true)}
                >
                  <Edit2 size={13} />
                  <span>Edit Details</span>
                </button>
              )}
            </div>

            {!editingProfile ? (
              <div className="profileInfoDisplayGrid">
                <div className="infoField">
                  <span className="fieldLabel">Full Name</span>
                  <b className="fieldVal">{user.name || 'Not provided'}</b>
                </div>

                <div className="infoField">
                  <span className="fieldLabel">
                    Email Address <Lock size={11} color="#94a3b8" title="Registered email address (non-editable)" />
                  </span>
                  <b className="fieldVal emailVal">{user.email}</b>
                  <small className="fieldHint">Linked to your account login.</small>
                </div>

                <div className="infoField">
                  <span className="fieldLabel">Mobile Phone Number</span>
                  <b className="fieldVal">
                    {user.phone ? `+91 ${user.phone}` : <span className="dimText">Not added yet</span>}
                  </b>
                  <small className="fieldHint">Used for order tracking and WhatsApp updates.</small>
                </div>
              </div>
            ) : (
              <form onSubmit={handleSaveProfile} className="profileEditForm">
                <div className="formGrid">
                  <div className="formGroup">
                    <label>Full Name *</label>
                    <input
                      type="text"
                      required
                      value={profileForm.name}
                      onChange={(e) =>
                        setProfileForm((prev) => ({ ...prev, name: e.target.value }))
                      }
                    />
                  </div>

                  <div className="formGroup">
                    <label>Mobile Number (10 digits)</label>
                    <input
                      type="tel"
                      maxLength={10}
                      placeholder="e.g. 9876543210"
                      value={profileForm.phone}
                      onChange={(e) =>
                        setProfileForm((prev) => ({
                          ...prev,
                          phone: e.target.value.replace(/\D/g, '')
                        }))
                      }
                    />
                  </div>

                  <div className="formGroup disabled">
                    <label>
                      Email Address <Lock size={12} />
                    </label>
                    <input type="email" value={user.email} disabled />
                    <small className="fieldHint">Email address cannot be changed.</small>
                  </div>
                </div>

                <div className="formActionsRow">
                  <button
                    type="button"
                    className="outlineBtn cancelBtn"
                    onClick={() => {
                      setProfileForm({ name: user.name || '', phone: user.phone || '' });
                      setEditingProfile(false);
                    }}
                    disabled={savingProfile}
                  >
                    Cancel
                  </button>
                  <button
                    type="submit"
                    className="goldBtn saveBtn"
                    disabled={savingProfile}
                  >
                    {savingProfile ? 'Saving...' : 'Save Profile'}
                  </button>
                </div>
              </form>
            )}
          </div>

          {/* Section 2: Security & Password */}
          <div className="accountCard securityCard">
            <div className="accountCardHeader">
              <div className="headerTitleBox">
                <ShieldCheck size={20} color="var(--maroon)" />
                <div>
                  <h3>Account Security & Password</h3>
                  <p>Keep your account secure by updating your password periodically.</p>
                </div>
              </div>

              <button
                type="button"
                className="editSectionBtn changePasswordBtn"
                onClick={() => {
                  setPasswordError('');
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setShowPasswordModal(true);
                }}
              >
                <KeyRound size={13} />
                <span>Change Password</span>
              </button>
            </div>

            <div className="securityInfoRow">
              <div className="securityStatusBox">
                <div className="securityIconBubble">
                  <Lock size={16} color="var(--gold)" />
                </div>
                <div className="securityStatusText">
                  <b>Password Protection Active</b>
                  <span>Your account is protected with encrypted authentication.</span>
                </div>
              </div>

              <button
                type="button"
                className="outlineBtn compact changePassActionBtn"
                onClick={() => {
                  setPasswordError('');
                  setPasswordForm({ currentPassword: '', newPassword: '', confirmPassword: '' });
                  setShowPasswordModal(true);
                }}
              >
                <KeyRound size={13} />
                <span>Update Password</span>
              </button>
            </div>
          </div>

          {/* Section 3: Address Book & Gift Addresses */}
          <div className="accountCard addressesSectionCard">
            <div className="accountCardHeader">
              <div className="headerTitleBox">
                <MapPin size={20} color="var(--maroon)" />
                <div>
                  <h3>Address Book & Saved Delivery Addresses</h3>
                  <p>Manage your own delivery address as well as gift addresses for family and friends.</p>
                </div>
              </div>
            </div>

            {/* Sub-section A: Default My Address */}
            <div className="addressSubSection">
              <div className="subSectionHeader">
                <div className="subHeaderLeft">
                  <User size={15} color="var(--gold)" />
                  <h4>My Default Delivery Address</h4>
                </div>
                {!editingDefaultAddress && (
                  <button
                    type="button"
                    className="editAddressBtn"
                    onClick={() => setEditingDefaultAddress(true)}
                  >
                    <Edit2 size={12} />
                    <span>{addresses.defaultAddress ? 'Edit Address' : '+ Add My Address'}</span>
                  </button>
                )}
              </div>

              {!editingDefaultAddress ? (
                addresses.defaultAddress && addresses.defaultAddress.addressLine1 ? (
                  <div className="savedAddressCard default">
                    <div className="addressRecipientRow">
                      <b>{addresses.defaultAddress.recipientName || user.name}</b>
                      <span className="defaultTag">Default (My Address)</span>
                    </div>
                    <p className="addressText">
                      {addresses.defaultAddress.addressLine1}
                      {addresses.defaultAddress.addressLine2 && `, ${addresses.defaultAddress.addressLine2}`}
                    </p>
                    <p className="addressCityState">
                      {addresses.defaultAddress.city}, {addresses.defaultAddress.state} - <b>{addresses.defaultAddress.pincode}</b>
                    </p>
                    {addresses.defaultAddress.recipientPhone && (
                      <p className="addressPhone">
                        <Phone size={12} /> +91 {addresses.defaultAddress.recipientPhone}
                      </p>
                    )}
                  </div>
                ) : (
                  <div className="noAddressPrompt">
                    <p>No default address saved yet. Save your primary delivery address for faster checkout.</p>
                    <button
                      type="button"
                      className="outlineBtn compact"
                      onClick={() => setEditingDefaultAddress(true)}
                    >
                      + Add My Delivery Address
                    </button>
                  </div>
                )
              ) : (
                <form onSubmit={handleSaveDefaultAddress} className="addressEditForm">
                  <div className="addressFormGrid">
                    <div className="formGroup">
                      <label>Recipient Name</label>
                      <input
                        type="text"
                        placeholder="Your full name"
                        value={defaultAddressForm.recipientName}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({ ...prev, recipientName: e.target.value }))
                        }
                      />
                    </div>
                    <div className="formGroup">
                      <label>Phone Number (10 digits)</label>
                      <input
                        type="tel"
                        maxLength={10}
                        placeholder="10-digit mobile number"
                        value={defaultAddressForm.recipientPhone}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({
                            ...prev,
                            recipientPhone: e.target.value.replace(/\D/g, '')
                          }))
                        }
                      />
                    </div>
                    <div className="formGroup fullWidth">
                      <label>Address Line 1 (Flat, House no., Building, Street) *</label>
                      <input
                        type="text"
                        required
                        value={defaultAddressForm.addressLine1}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({ ...prev, addressLine1: e.target.value }))
                        }
                      />
                    </div>
                    <div className="formGroup fullWidth">
                      <label>Address Line 2 (Area, Landmark)</label>
                      <input
                        type="text"
                        value={defaultAddressForm.addressLine2}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({ ...prev, addressLine2: e.target.value }))
                        }
                      />
                    </div>
                    <div className="formGroup">
                      <label>City / Town *</label>
                      <input
                        type="text"
                        required
                        value={defaultAddressForm.city}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({ ...prev, city: e.target.value }))
                        }
                      />
                    </div>
                    <div className="formGroup">
                      <label>State *</label>
                      <select
                        value={defaultAddressForm.state}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({ ...prev, state: e.target.value }))
                        }
                      >
                        {INDIAN_STATES.map((s) => (
                          <option key={s} value={s}>
                            {s}
                          </option>
                        ))}
                      </select>
                    </div>
                    <div className="formGroup">
                      <label>PIN Code (6 digits) *</label>
                      <input
                        type="text"
                        required
                        maxLength={6}
                        value={defaultAddressForm.pincode}
                        onChange={(e) =>
                          setDefaultAddressForm((prev) => ({
                            ...prev,
                            pincode: e.target.value.replace(/\D/g, '')
                          }))
                        }
                      />
                    </div>
                  </div>

                  <div className="formActionsRow">
                    <button
                      type="button"
                      className="outlineBtn cancelBtn"
                      onClick={() => setEditingDefaultAddress(false)}
                      disabled={savingDefaultAddress}
                    >
                      Cancel
                    </button>
                    <button
                      type="submit"
                      className="goldBtn saveBtn"
                      disabled={savingDefaultAddress}
                    >
                      {savingDefaultAddress ? 'Saving...' : 'Save My Address'}
                    </button>
                  </div>
                </form>
              )}
            </div>

            {/* Sub-section B: Gift Addresses */}
            <div className="addressSubSection giftAddressesBlock">
              <div className="subSectionHeader">
                <div className="subHeaderLeft">
                  <Gift size={16} color="var(--maroon)" />
                  <h4>Saved Gift / Alternate Delivery Addresses</h4>
                </div>
                <button
                  type="button"
                  className="goldBtn compact addGiftAddressBtn"
                  onClick={handleOpenAddGift}
                >
                  <Plus size={13} />
                  <span>+ Add Gift Address</span>
                </button>
              </div>

              <p className="giftAddressesSubtext">
                Surprise your loved ones! Save recipient addresses here and select them effortlessly at Checkout under <b>"Send as a Gift"</b>.
              </p>

              {addresses.giftAddresses && addresses.giftAddresses.length > 0 ? (
                <div className="giftAddressesListGrid">
                  {addresses.giftAddresses.map((gift) => (
                    <div key={gift.id || gift._id} className="savedAddressCard giftCard">
                      <div className="addressRecipientRow">
                        <b>{gift.recipient_name || gift.recipientName}</b>
                        <span className="giftTag">
                          <Gift size={11} /> Gift Recipient
                        </span>
                      </div>
                      <p className="addressText">
                        {gift.address_line1 || gift.addressLine1}
                        {(gift.address_line2 || gift.addressLine2) && `, ${gift.address_line2 || gift.addressLine2}`}
                      </p>
                      <p className="addressCityState">
                        {gift.city}, {gift.state} - <b>{gift.pincode}</b>
                      </p>
                      <p className="addressPhone">
                        <Phone size={12} /> +91 {gift.recipient_phone || gift.recipientPhone}
                      </p>

                      <div className="giftCardActions">
                        <button
                          type="button"
                          className="giftActionBtn"
                          onClick={() => handleOpenEditGift(gift)}
                        >
                          <Edit2 size={12} /> Edit
                        </button>
                        <button
                          type="button"
                          className="giftActionBtn delete"
                          onClick={() => handleDeleteGiftAddress(gift.id || gift._id)}
                        >
                          <Trash2 size={12} /> Delete
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              ) : (
                <div className="noAddressPrompt giftPrompt">
                  <Gift size={24} color="#b45309" />
                  <p>No gift addresses saved yet. Add addresses of friends and family to easily send gifts.</p>
                  <button
                    type="button"
                    className="goldBtn compact"
                    onClick={handleOpenAddGift}
                  >
                    + Add First Gift Address
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      ) : (
        <div className="empty">
          <User />
          <Link className="goldBtn" to="/login">
            LOGIN
          </Link>
        </div>
      )}

      {/* Gift Address Modal */}
      {showGiftModal && (
        <div className="accountModalOverlay" onClick={() => setShowGiftModal(false)}>
          <div
            className="accountModalContent"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="accountModalHeader">
              <div className="modalTitleBox">
                <Gift size={18} color="var(--maroon)" />
                <h3>{editingGiftId ? 'Edit Gift Delivery Address' : 'Add New Gift Address'}</h3>
              </div>
              <button
                type="button"
                className="closeModalBtn"
                onClick={() => setShowGiftModal(false)}
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSaveGiftAddress} className="modalAddressForm">
              <div className="addressFormGrid">
                <div className="formGroup">
                  <label>Recipient Full Name *</label>
                  <input
                    type="text"
                    required
                    placeholder="Recipient's Name"
                    value={giftForm.recipientName}
                    onChange={(e) =>
                      setGiftForm((prev) => ({ ...prev, recipientName: e.target.value }))
                    }
                  />
                </div>

                <div className="formGroup">
                  <label>Recipient Mobile Number (10 digits) *</label>
                  <input
                    type="tel"
                    required
                    maxLength={10}
                    placeholder="Recipient's 10-digit mobile"
                    value={giftForm.recipientPhone}
                    onChange={(e) =>
                      setGiftForm((prev) => ({
                        ...prev,
                        recipientPhone: e.target.value.replace(/\D/g, '')
                      }))
                    }
                  />
                </div>

                <div className="formGroup fullWidth">
                  <label>Address Line 1 (Flat, House no., Building, Street) *</label>
                  <input
                    type="text"
                    required
                    placeholder="Street address"
                    value={giftForm.addressLine1}
                    onChange={(e) =>
                      setGiftForm((prev) => ({ ...prev, addressLine1: e.target.value }))
                    }
                  />
                </div>

                <div className="formGroup fullWidth">
                  <label>Address Line 2 (Area, Landmark)</label>
                  <input
                    type="text"
                    placeholder="Apartment, suite, unit, landmark"
                    value={giftForm.addressLine2}
                    onChange={(e) =>
                      setGiftForm((prev) => ({ ...prev, addressLine2: e.target.value }))
                    }
                  />
                </div>

                <div className="formGroup">
                  <label>City / Town *</label>
                  <input
                    type="text"
                    required
                    placeholder="City"
                    value={giftForm.city}
                    onChange={(e) =>
                      setGiftForm((prev) => ({ ...prev, city: e.target.value }))
                    }
                  />
                </div>

                <div className="formGroup">
                  <label>State *</label>
                  <select
                    value={giftForm.state}
                    onChange={(e) =>
                      setGiftForm((prev) => ({ ...prev, state: e.target.value }))
                    }
                  >
                    {INDIAN_STATES.map((s) => (
                      <option key={s} value={s}>
                        {s}
                      </option>
                    ))}
                  </select>
                </div>

                <div className="formGroup">
                  <label>PIN Code (6 digits) *</label>
                  <input
                    type="text"
                    required
                    maxLength={6}
                    placeholder="e.g. 410203"
                    value={giftForm.pincode}
                    onChange={(e) =>
                      setGiftForm((prev) => ({
                        ...prev,
                        pincode: e.target.value.replace(/\D/g, '')
                      }))
                    }
                  />
                </div>
              </div>

              <div className="modalFooterActions">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => setShowGiftModal(false)}
                  disabled={savingGift}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="goldBtn"
                  disabled={savingGift}
                >
                  {savingGift ? 'Saving Address...' : editingGiftId ? 'Update Gift Address' : 'Save Gift Address'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
      {/* Change Password Modal */}
      {showPasswordModal && (
        <div className="accountModalOverlay" onClick={() => !savingPassword && setShowPasswordModal(false)}>
          <div className="accountModalContent passwordModalContent" onClick={(e) => e.stopPropagation()}>
            <div className="accountModalHeader">
              <div className="modalTitleBox">
                <KeyRound size={20} color="var(--maroon)" />
                <h3>Change Account Password</h3>
              </div>
              <button
                type="button"
                className="closeModalBtn"
                onClick={() => !savingPassword && setShowPasswordModal(false)}
                aria-label="Close"
              >
                <X size={18} />
              </button>
            </div>

            <form onSubmit={handleSavePassword} className="passwordChangeForm">
              {passwordError && (
                <div className="passwordErrorBanner">
                  <span>{passwordError}</span>
                </div>
              )}

              <div className="passwordFormFields">
                {/* Current Password */}
                <div className="formGroup">
                  <label>Current Password *</label>
                  <div className="passwordInputWrapper">
                    <input
                      type={showPasswords.current ? 'text' : 'password'}
                      required
                      placeholder="Enter your current password"
                      value={passwordForm.currentPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, currentPassword: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="togglePasswordBtn"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, current: !prev.current }))
                      }
                      title={showPasswords.current ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.current ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* New Password */}
                <div className="formGroup">
                  <label>New Password * (Min. 6 characters)</label>
                  <div className="passwordInputWrapper">
                    <input
                      type={showPasswords.new ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Enter strong new password"
                      value={passwordForm.newPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, newPassword: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="togglePasswordBtn"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, new: !prev.new }))
                      }
                      title={showPasswords.new ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.new ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>

                {/* Confirm New Password */}
                <div className="formGroup">
                  <label>Confirm New Password *</label>
                  <div className="passwordInputWrapper">
                    <input
                      type={showPasswords.confirm ? 'text' : 'password'}
                      required
                      minLength={6}
                      placeholder="Re-enter your new password"
                      value={passwordForm.confirmPassword}
                      onChange={(e) =>
                        setPasswordForm((prev) => ({ ...prev, confirmPassword: e.target.value }))
                      }
                    />
                    <button
                      type="button"
                      className="togglePasswordBtn"
                      onClick={() =>
                        setShowPasswords((prev) => ({ ...prev, confirm: !prev.confirm }))
                      }
                      title={showPasswords.confirm ? 'Hide password' : 'Show password'}
                    >
                      {showPasswords.confirm ? <EyeOff size={16} /> : <Eye size={16} />}
                    </button>
                  </div>
                </div>
              </div>

              <div className="modalFooterActions">
                <button
                  type="button"
                  className="outlineBtn"
                  onClick={() => setShowPasswordModal(false)}
                  disabled={savingPassword}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="goldBtn"
                  disabled={savingPassword}
                >
                  {savingPassword ? 'Updating Password...' : 'Save New Password'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </main>
  );
}
