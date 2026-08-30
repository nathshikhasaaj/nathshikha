import mongoose from 'mongoose';

const orderItemSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product'
    },
    name: {
      type: String,
      required: true
    },
    price: {
      type: Number,
      required: true
    },
    qty: {
      type: Number,
      required: true,
      min: 1
    },
    img: {
      type: String,
      required: true
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
        ret.upi_utr = ret.upiUtr;
        ret.upi_paid_at = ret.upiPaidAt;
        ret.payment_transaction_id = ret.paymentTransactionId || ret.upiUtr;
        ret.payment_app = ret.paymentApp;
        ret.verified_at = ret.verifiedAt;
        ret.verified_by = ret.verifiedBy;
        ret.shipment_partner = ret.shipmentPartner;
        ret.tracking_id = ret.trackingId;
        ret.shipped_at = ret.shippedAt;
        ret.shipped_by = ret.shippedBy;
        ret.guest_token = ret.guestToken;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : new Date().toISOString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Order = mongoose.model('Order', orderSchema);
