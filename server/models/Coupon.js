import mongoose from 'mongoose';

const couponSchema = new mongoose.Schema(
  {
    code: {
      type: String,
      required: [true, 'Coupon code is required'],
      unique: true,
      trim: true,
      uppercase: true,
      index: true
    },
    discountType: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: ['percent', 'fixed'],
      default: 'percent'
    },
    discountValue: {
      type: Number,
      required: [true, 'Discount value is required'],
      min: [1, 'Discount value must be greater than 0']
    },
    minOrderValue: {
      type: Number,
      default: 0,
      min: [0, 'Minimum order value cannot be negative']
    },
    usageLimit: {
      type: Number,
      required: [true, 'Usage limit is required'],
      min: [1, 'Usage limit must be at least 1']
    },
    usageCount: {
      type: Number,
      default: 0,
      min: 0
    },
    expiryDate: {
      type: Date,
      required: [true, 'Expiry date is required']
    },
    isActive: {
      type: Boolean,
      default: true,
      index: true
    },
    description: {
      type: String,
      default: '',
      trim: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.discount_type = ret.discountType;
        ret.discount_value = ret.discountValue;
        ret.min_order_value = ret.minOrderValue;
        ret.usage_limit = ret.usageLimit;
        ret.usage_count = ret.usageCount;
        ret.expiry_date = ret.expiryDate ? ret.expiryDate.toISOString() : null;
        ret.is_active = ret.isActive;
        ret.created_at = ret.createdAt ? ret.createdAt.toISOString() : new Date().toISOString();
        ret.updated_at = ret.updatedAt ? ret.updatedAt.toISOString() : new Date().toISOString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Helper method to evaluate derived status
couponSchema.methods.getDerivedStatus = function () {
  const now = new Date();
  if (!this.isActive) return 'inactive';
  if (this.expiryDate && new Date(this.expiryDate).getTime() < now.getTime()) {
    return 'expired';
  }
  if (this.usageLimit && this.usageCount >= this.usageLimit) {
    return 'limit_reached';
  }
  return 'active';
};

export const Coupon = mongoose.model('Coupon', couponSchema);
