import mongoose from 'mongoose';

const shipmentGroupSchema = new mongoose.Schema(
  {
    groupCode: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      uppercase: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null
    },
    customerName: {
      type: String,
      required: true,
      trim: true
    },
    customerEmail: {
      type: String,
      required: true,
      trim: true,
      lowercase: true
    },
    customerPhone: {
      type: String,
      required: true,
      trim: true
    },
    pincode: {
      type: String,
      required: true,
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
      required: true,
      trim: true
    },
    shipmentPartner: {
      type: String,
      enum: ['Speed Post', 'Shree Anjani', 'Shree Mahaveer', 'Shree Maruti', 'Other', null],
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
    status: {
      type: String,
      enum: ['active', 'preparing', 'shipped', 'delivered', 'cancelled'],
      default: 'active'
    },
    orders: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Order'
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.group_code = ret.groupCode;
        ret.user_id = ret.userId ? ret.userId.toString() : null;
        ret.customer_name = ret.customerName;
        ret.customer_email = ret.customerEmail;
        ret.customer_phone = ret.customerPhone;
        ret.shipping_method = ret.shippingMethod;
        ret.shipment_partner = ret.shipmentPartner;
        ret.tracking_id = ret.trackingId;
        ret.shipped_at = ret.shippedAt;
        ret.shipped_by = ret.shippedBy;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : new Date().toISOString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

/**
 * Helper to generate next sequential or unique Shipment Group Code (e.g. SHP00025)
 */
shipmentGroupSchema.statics.generateGroupCode = async function () {
  const count = await this.countDocuments();
  const nextNum = (count + 1).toString().padStart(5, '0');
  const code = `SHP${nextNum}`;
  
  // Ensure uniqueness in case of race/deletion
  const existing = await this.findOne({ groupCode: code });
  if (existing) {
    const timestampSuffix = Date.now().toString().slice(-5);
    return `SHP${timestampSuffix}`;
  }
  return code;
};

export const ShipmentGroup = mongoose.model('ShipmentGroup', shipmentGroupSchema);
