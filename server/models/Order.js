import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true,
      min: 0
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    img: {
      type: String,
      default: ''
    },
    itemType: {
      type: String,
      default: 'product'
    },
    selectedParameters: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    },
    selectedOptions: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  { _id: false }
);

const orderSchema = new mongoose.Schema(
  {
    orderNo: {
      type: String,
      required: true,
      unique: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    isGift: {
      type: Boolean,
      default: false,
      alias: 'is_gift'
    },
    giftWrap: {
      type: Boolean,
      default: false,
      alias: 'gift_wrap'
    },
    giftWrapCharge: {
      type: Number,
      default: 0,
      min: 0,
      alias: 'gift_wrap_charge'
    },
    handwrittenNote: {
      type: String,
      default: null,
      trim: true,
      maxlength: 1000,
      alias: 'handwritten_note'
    },
    recipientName: {
      type: String,
      default: null,
      trim: true,
      alias: 'recipient_name'
    },
    recipientPhone: {
      type: String,
      default: null,
      trim: true,
      alias: 'recipient_phone'
    },
    customerName: {
      type: String,
      default: null,
      trim: true,
      alias: 'customer_name'
    },
    customerPhone: {
      type: String,
      default: null,
      trim: true,
      alias: 'customer_phone'
    },
    customerEmail: {
      type: String,
      default: null,
      trim: true,
      lowercase: true,
      alias: 'customer_email'
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    phone: {
      type: String,
      required: true,
      trim: true
    },
    email: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    address: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      default: null,
      trim: true
    },
    city: {
      type: String,
      default: null,
      trim: true
    },
    state: {
      type: String,
      default: null,
      trim: true
    },
    shippingMethod: {
      type: String,
      default: 'Standard Delivery',
      trim: true
    },
    subtotal: {
      type: Number,
      required: true
    },
    couponCode: {
      type: String,
      default: null,
      trim: true
    },
    couponDiscount: {
      type: Number,
      default: 0,
      min: 0
    },
    shipping: {
      type: Number,
      required: true
    },
    total: {
      type: Number,
      required: true
    },
    paymentMethod: {
      type: String,
      enum: ['upi', 'cod'],
      default: 'upi'
    },
    paymentStatus: {
      type: String,
      enum: ['pending', 'verification_pending', 'verified', 'paid'],
      default: 'verification_pending'
    },
    acceptedTerms: {
      type: Boolean,
      default: true
    },
    orderStatus: {
      type: String,
      enum: [
        'placed',
        'payment_pending',
        'verification_pending',
        'confirmed',
        'making',
        'packing',
        'processing',
        'shipped',
        'delivered',
        'cancelled'
      ],
      default: 'placed'
    },
    cancellationStatus: {
      type: String,
      enum: [
        'no_cancellation',
        'cancellation_requested',
        'cancellation_approved',
        'refund'
      ],
      default: 'no_cancellation'
    },
    cancellationReason: {
      type: String,
      default: null,
      trim: true
    },
    cancellationRequestedAt: {
      type: Date,
      default: null
    },
    cancellationApprovedAt: {
      type: Date,
      default: null
    },
    cancellationRejectedAt: {
      type: Date,
      default: null
    },
    cancellationCharge: {
      type: Number,
      default: 0,
      min: 0
    },
    refundAmount: {
      type: Number,
      default: 0,
      min: 0
    },
    refundStatus: {
      type: String,
      enum: ['none', 'pending', 'refund'],
      default: 'none'
    },
    refundProcessedAt: {
      type: Date,
      default: null
    },
    refundProcessedBy: {
      type: String,
      default: null
    },
    cancellationAdminNotes: {
      type: String,
      default: null,
      trim: true
    },
    upiUtr: {
      type: String,
      default: null
    },
    upiPaidAt: {
      type: Date,
      default: null
    },
    paymentTransactionId: {
      type: String,
      default: null
    },
    paymentApp: {
      type: String,
      default: null
    },
    verifiedAt: {
      type: Date,
      default: null
    },
    verifiedBy: {
      type: String,
      default: null
    },
    confirmedAt: {
      type: Date,
      default: null
    },
    expectedDeliveryDate: {
      type: Date,
      default: null
    },
    freeGift: {
      included: {
        type: Boolean,
        default: false
      }
    },
    guestToken: {
      type: String,
      default: null
    },
    shipmentGroupId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'ShipmentGroup',
      default: null
    },
    shipmentGroupCode: {
      type: String,
      default: null,
      trim: true
    },
    shipmentPartner: {
      type: String,
      enum: ['Speed Post', 'Shree Anjani', 'Shree Mahaveer', 'Shree Maruti', 'Other'],
      default: null
    },
    trackingId: {
      type: String,
      default: null,
      trim: true
    },
    shippedAt: {
      type: Date,
      default: null
    },
    shippedBy: {
      type: String,
      default: null
    },
    customization: {
      requested: {
        type: Boolean,
        default: false
      },
      details: {
        type: String,
        default: null,
        trim: true,
        maxlength: 2000
      },
      referenceImage: {
        type: String,
        default: null,
        trim: true
      },
      requestedAt: {
        type: Date,
        default: null
      }
    },
    assistedOrder: {
      isAssisted: {
        type: Boolean,
        default: false
      },
      createdBy: {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'User',
        default: null
      },
      createdByName: {
        type: String,
        default: null
      },
      sentToCustomer: {
        type: Boolean,
        default: false
      },
      sentAt: {
        type: Date,
        default: null
      },
      customerViewedAt: {
        type: Date,
        default: null
      },
      customerReviewedAt: {
        type: Date,
        default: null
      },
      paymentClaimedAt: {
        type: Date,
        default: null
      },
      lastEditedAt: {
        type: Date,
        default: null
      },
      resendCount: {
        type: Number,
        default: 0
      }
    },
    isDeleted: {
      type: Boolean,
      default: false,
      index: true
    },
    deletedAt: {
      type: Date,
      default: null,
      index: true
    },
    deletedBy: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    deletedByName: {
      type: String,
      default: null,
      trim: true
    },
    deleteReason: {
      type: String,
      default: null,
      maxlength: 500,
      trim: true
    },
    restoreUntil: {
      type: Date,
      default: null,
      index: true
    },
    editHistory: [
      {
        editedAt: {
          type: Date,
          default: Date.now
        },
        editedBy: {
          type: String,
          default: 'Admin'
        },
        changedFields: [
          {
            type: String
          }
        ],
        notes: {
          type: String,
          default: null,
          trim: true
        }
      }
    ],
    emailDeliveryStatus: {
      type: String,
      enum: ['none', 'delivered', 'failed', 'pending'],
      default: 'none'
    },
    emailDeliveryError: {
      type: String,
      default: null,
      trim: true
    },
    emailDeliveryFailedAt: {
      type: Date,
      default: null
    },
    emailDeliveryFailedRecipient: {
      type: String,
      default: null,
      trim: true
    },
    emailAdminCorrected: {
      type: Boolean,
      default: false
    },
    emailAdminCorrectedAt: {
      type: Date,
      default: null
    },
    emailAdminCorrectedBy: {
      type: String,
      default: null,
      trim: true
    },
    items: [orderItemSchema]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.order_no = ret.orderNo;
        ret.user_id = ret.userId ? ret.userId.toString() : null;
        ret.is_gift = Boolean(ret.isGift);
        ret.gift_wrap = Boolean(ret.giftWrap);
        ret.giftWrap = Boolean(ret.giftWrap);
        ret.gift_wrap_charge = ret.giftWrapCharge || 0;
        ret.giftWrapCharge = ret.giftWrapCharge || 0;
        ret.handwritten_note = ret.handwrittenNote || null;
        ret.handwrittenNote = ret.handwrittenNote || null;
        ret.recipient_name = ret.recipientName || ret.name;
        ret.recipient_phone = ret.recipientPhone || ret.phone;
        ret.customer_name = ret.customerName || ret.name;
        ret.customer_phone = ret.customerPhone || ret.phone;
        ret.customer_email = ret.customerEmail || ret.email;
        ret.shipment_group_id = ret.shipmentGroupId ? ret.shipmentGroupId.toString() : null;
        ret.shipment_group_code = ret.shipmentGroupCode || null;
        ret.pincode = ret.pincode;
        ret.city = ret.city;
        ret.state = ret.state;
        ret.shipping_method = ret.shippingMethod;
        ret.coupon_code = ret.couponCode;
        ret.coupon_discount = ret.couponDiscount || 0;
        ret.shipping_charge = ret.shipping;
        ret.payment_method = ret.paymentMethod;
        ret.payment_status = ret.paymentStatus;
        ret.order_status = ret.orderStatus;
        ret.cancellation_status = ret.cancellationStatus || 'no_cancellation';
        ret.cancellation_reason = ret.cancellationReason || null;
        ret.cancellation_requested_at = ret.cancellationRequestedAt || null;
        ret.cancellation_approved_at = ret.cancellationApprovedAt || null;
        ret.cancellation_rejected_at = ret.cancellationRejectedAt || null;
        ret.cancellation_charge = ret.cancellationCharge || 0;
        ret.refund_amount = ret.refundAmount || 0;
        ret.refund_status = ret.refundStatus || 'none';
        ret.refund_processed_at = ret.refundProcessedAt || null;
        ret.refund_processed_by = ret.refundProcessedBy || null;
        ret.cancellation_admin_notes = ret.cancellationAdminNotes || null;
        ret.assisted_order = {
          is_assisted: Boolean(ret.assistedOrder?.isAssisted),
          isAssisted: Boolean(ret.assistedOrder?.isAssisted),
          created_by: ret.assistedOrder?.createdBy ? ret.assistedOrder.createdBy.toString() : null,
          created_by_name: ret.assistedOrder?.createdByName || null,
          sent_to_customer: Boolean(ret.assistedOrder?.sentToCustomer),
          sent_at: ret.assistedOrder?.sentAt || null,
          customer_viewed_at: ret.assistedOrder?.customerViewedAt || null,
          customer_reviewed_at: ret.assistedOrder?.customerReviewedAt || null,
          payment_claimed_at: ret.assistedOrder?.paymentClaimedAt || null,
          last_edited_at: ret.assistedOrder?.lastEditedAt || null,
          resend_count: ret.assistedOrder?.resendCount || 0
        };
        ret.assistedOrder = ret.assisted_order;
        ret.is_deleted = Boolean(ret.isDeleted);
        ret.isDeleted = Boolean(ret.isDeleted);
        ret.deleted_at = ret.deletedAt || null;
        ret.deletedAt = ret.deletedAt || null;
        ret.deleted_by = ret.deletedBy ? ret.deletedBy.toString() : null;
        ret.deleted_by_name = ret.deletedByName || null;
        ret.delete_reason = ret.deleteReason || null;
        ret.deleteReason = ret.deleteReason || null;
        ret.restore_until = ret.restoreUntil || null;
        ret.restoreUntil = ret.restoreUntil || null;

        if (ret.isDeleted && ret.restoreUntil) {
          const now = Date.now();
          const until = new Date(ret.restoreUntil).getTime();
          const diffMs = until - now;
          const daysRemaining = Math.max(0, Math.ceil(diffMs / (1000 * 60 * 60 * 24)));
          ret.days_remaining = daysRemaining;
          ret.daysRemaining = daysRemaining;
          ret.is_expired = diffMs <= 0;
          ret.isExpired = diffMs <= 0;
        } else {
          ret.days_remaining = null;
          ret.daysRemaining = null;
          ret.is_expired = false;
          ret.isExpired = false;
        }

        ret.edit_history = Array.isArray(ret.editHistory)
          ? ret.editHistory.map((h) => ({
              edited_at: h.editedAt || h.edited_at,
              edited_by: h.editedBy || h.edited_by,
              changed_fields: h.changedFields || h.changed_fields || [],
              notes: h.notes || null
            }))
          : [];
        ret.email_delivery_status = ret.emailDeliveryStatus || 'none';
        ret.emailDeliveryStatus = ret.email_delivery_status;
        ret.email_delivery_error = ret.emailDeliveryError || null;
        ret.emailDeliveryError = ret.email_delivery_error;
        ret.email_delivery_failed_at = ret.emailDeliveryFailedAt || null;
        ret.emailDeliveryFailedAt = ret.email_delivery_failed_at;
        ret.email_delivery_failed_recipient = ret.emailDeliveryFailedRecipient || null;
        ret.emailDeliveryFailedRecipient = ret.email_delivery_failed_recipient;
        ret.email_admin_corrected = Boolean(ret.emailAdminCorrected);
        ret.emailAdminCorrected = Boolean(ret.emailAdminCorrected);
        ret.email_admin_corrected_at = ret.emailAdminCorrectedAt || null;
        ret.emailAdminCorrectedAt = ret.email_admin_corrected_at;
        ret.email_admin_corrected_by = ret.emailAdminCorrectedBy || null;
        ret.emailAdminCorrectedBy = ret.email_admin_corrected_by;

        ret.customization = {
          requested: Boolean(ret.customization?.requested),
          details: ret.customization?.details || null,
          reference_image: ret.customization?.referenceImage || ret.customization?.reference_image || null,
          referenceImage: ret.customization?.referenceImage || ret.customization?.reference_image || null,
          requested_at: ret.customization?.requestedAt || null,
          requestedAt: ret.customization?.requestedAt || null
        };
        ret.upi_utr = ret.upiUtr;
        ret.upi_paid_at = ret.upiPaidAt;
        ret.payment_transaction_id = ret.paymentTransactionId || ret.upiUtr;
        ret.payment_app = ret.paymentApp;
        ret.verified_at = ret.verifiedAt;
        ret.verified_by = ret.verifiedBy;
        ret.confirmed_at = ret.confirmedAt || (ret.orderStatus === 'confirmed' || ret.paymentStatus === 'verified' ? ret.verifiedAt : null);
        ret.confirmedAt = ret.confirmed_at;

        if (ret.expectedDeliveryDate) {
          ret.expected_delivery_date = ret.expectedDeliveryDate;
        } else if (ret.confirmed_at) {
          const confTime = new Date(ret.confirmed_at).getTime();
          if (!isNaN(confTime)) {
            ret.expected_delivery_date = new Date(confTime + 20 * 24 * 60 * 60 * 1000).toISOString();
          } else {
            ret.expected_delivery_date = null;
          }
        } else {
          ret.expected_delivery_date = null;
        }
        ret.expectedDeliveryDate = ret.expected_delivery_date;

        ret.free_gift = {
          included: Boolean(ret.freeGift?.included)
        };
        ret.freeGift = ret.free_gift;

        if (Array.isArray(ret.items)) {
          ret.items = ret.items.map((item) => ({
            ...item,
            item_type: item.itemType || 'product',
            itemType: item.itemType || 'product'
          }));
        }

        ret.shipment_partner = ret.shipmentPartner;
        ret.tracking_id = ret.trackingId;
        ret.shipped_at = ret.shippedAt;
        ret.shipped_by = ret.shippedBy;
        ret.guest_token = ret.guestToken;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : new Date().toISOString();
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : undefined;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

orderSchema.pre('validate', function () {
  if (this.is_gift !== undefined && this.isGift === undefined) this.isGift = this.is_gift;
  if (this.gift_wrap !== undefined && this.giftWrap === undefined) this.giftWrap = this.gift_wrap;
  if (this.gift_wrap_charge !== undefined && this.giftWrapCharge === undefined) this.giftWrapCharge = this.gift_wrap_charge;
  if (this.handwritten_note !== undefined && this.handwrittenNote === undefined) this.handwrittenNote = this.handwritten_note;
  if (this.recipient_name && !this.recipientName) this.recipientName = this.recipient_name;
  if (this.recipient_phone && !this.recipientPhone) this.recipientPhone = this.recipient_phone;
  if (this.customer_name && !this.customerName) this.customerName = this.customer_name;
  if (this.customer_phone && !this.customerPhone) this.customerPhone = this.customer_phone;
  if (this.customer_email && !this.customerEmail) this.customerEmail = this.customer_email;

  if (this.free_gift !== undefined && this.freeGift === undefined) {
    this.freeGift = typeof this.free_gift === 'object' && this.free_gift !== null
      ? { included: Boolean(this.free_gift.included) }
      : { included: Boolean(this.free_gift) };
  } else if (this.freeGift && typeof this.freeGift === 'object' && this.freeGift.included === undefined) {
    this.freeGift = { included: Boolean(this.freeGift) };
  }

  // Synchronize Free Gift line item in items array when freeGift is explicitly managed
  if (this.freeGift && this.freeGift.included === true) {
    const isGiftItem = (i) => i && (i.itemType === 'free_gift' || i.item_type === 'free_gift' || i.name === 'Free Complimentary Gift');
    if (!this.items.some(isGiftItem)) {
      this.items.push({
        name: 'Free Complimentary Gift',
        price: 0,
        qty: 1,
        img: '',
        itemType: 'free_gift',
        selectedParameters: {},
        selectedOptions: {}
      });
    }
  } else if (this.freeGift && this.freeGift.included === false) {
    const isGiftItem = (i) => i && (i.itemType === 'free_gift' || i.item_type === 'free_gift' || i.name === 'Free Complimentary Gift');
    if (Array.isArray(this.items) && this.items.some(isGiftItem)) {
      this.items = this.items.filter((i) => !isGiftItem(i));
    }
  }

  if (this.confirmed_at && !this.confirmedAt) this.confirmedAt = this.confirmed_at;
  if (this.expected_delivery_date && !this.expectedDeliveryDate) this.expectedDeliveryDate = this.expected_delivery_date;

  if (this.confirmedAt && !this.expectedDeliveryDate) {
    const d = new Date(this.confirmedAt);
    d.setDate(d.getDate() + 20);
    this.expectedDeliveryDate = d;
  }

  // For new orders, automatically populate customer identity fields if not already populated
  if (this.isNew) {
    if (!this.customerName && this.name) this.customerName = this.name;
    if (!this.customerPhone && this.phone) this.customerPhone = this.phone;
    if (!this.customerEmail && this.email) this.customerEmail = this.email;
  }

  if (this.customization) {
    if (this.customization.reference_image && !this.customization.referenceImage) {
      this.customization.referenceImage = this.customization.reference_image;
    }
    if (this.customization.requested_at && !this.customization.requestedAt) {
      this.customization.requestedAt = this.customization.requested_at;
    }
  }
});

// Enforce strict schema-level immutability for buyer identity and orderNo on existing orders
orderSchema.pre('save', function () {
  if (!this.isNew) {
    if (this.isModified('orderNo')) {
      throw new Error('Order ID (orderNo) cannot be modified after order creation.');
    }
    // Protect buyer identity fields if they were previously set and are now modified
    const allowEmailUpdate = Boolean(this._allowEmailCorrection || this.$locals?.allowEmailCorrection);
    if (!allowEmailUpdate && this.isModified('customerEmail') && this._original?.customerEmail && this.customerEmail !== this._original.customerEmail) {
      throw new Error('Buyer email (customerEmail) cannot be modified after order creation.');
    }
    if (this.isModified('customerPhone') && this._original?.customerPhone && this.customerPhone !== this._original.customerPhone) {
      throw new Error('Buyer phone (customerPhone) cannot be modified after order creation.');
    }
    if (this.isModified('customerName') && this._original?.customerName && this.customerName !== this._original.customerName) {
      throw new Error('Buyer name (customerName) cannot be modified after order creation.');
    }
    if (this.isModified('userId') && this._original?.userId && String(this.userId) !== String(this._original.userId)) {
      throw new Error('Buyer account (userId) cannot be modified after order creation.');
    }
  }
});

// Cache original values on document init for reliable immutability checks
orderSchema.post('init', function () {
  this._original = {
    orderNo: this.orderNo,
    userId: this.userId,
    customerName: this.customerName || this.name,
    customerPhone: this.customerPhone || this.phone,
    customerEmail: this.customerEmail || this.email
  };
});

export const Order = mongoose.model('Order', orderSchema);


