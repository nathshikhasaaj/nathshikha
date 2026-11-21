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
    // Coupon Category: 'general' (cart-wide), 'product_specific', 'bulk_quantity'
    couponType: {
      type: String,
      enum: ['general', 'product_specific', 'bulk_quantity'],
      default: 'general',
      index: true
    },
    // Product restriction for 'product_specific' and 'bulk_quantity'
    applicableProductId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      default: null
    },
    applicableProductName: {
      type: String,
      default: '',
      trim: true
    },
    // Minimum quantity threshold for 'bulk_quantity' coupons
    minQuantity: {
      type: Number,
      default: 1,
      min: [1, 'Minimum quantity must be at least 1']
    },
    // Bulk pricing strategy: 'discount' (percentage or fixed discount) or 'special_price' (fixed price per piece)
    bulkPricingType: {
      type: String,
      enum: ['discount', 'special_price'],
      default: 'discount'
    },
    specialPerPiecePrice: {
      type: Number,
      default: 0,
      min: [0, 'Special per-piece price cannot be negative']
    },
    // Whether discount applies to all units or only units beyond the minimum threshold
    bulkApplyTo: {
      type: String,
      enum: ['all_units', 'excess_units'],
      default: 'all_units'
    },
    // Customer restriction: 'all' or 'existing_customers_only'
    customerEligibility: {
      type: String,
      enum: ['all', 'existing_customers_only'],
      default: 'all',
      index: true
    },
    // Display in public Available Coupons list during checkout or keep private for manual sharing
    isPublic: {
      type: Boolean,
      default: true
    },
    discountType: {
      type: String,
      required: [true, 'Discount type is required'],
      enum: ['percent', 'fixed'],
      default: 'percent'
    },
    discountValue: {
      type: Number,
      default: 0,
      min: [0, 'Discount value cannot be negative']
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
        ret.coupon_type = ret.couponType || 'general';
        ret.applicable_product_id = ret.applicableProductId ? ret.applicableProductId.toString() : null;
        ret.applicable_product_name = ret.applicableProductName || '';
        ret.min_quantity = ret.minQuantity || 1;
        ret.bulk_pricing_type = ret.bulkPricingType || 'discount';
        ret.special_per_piece_price = ret.specialPerPiecePrice || 0;
        ret.bulk_apply_to = ret.bulkApplyTo || 'all_units';
        ret.customer_eligibility = ret.customerEligibility || 'all';
        ret.is_public = ret.isPublic !== undefined ? ret.isPublic : true;
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
