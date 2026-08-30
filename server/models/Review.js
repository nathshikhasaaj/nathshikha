import mongoose from 'mongoose';

const reviewSchema = new mongoose.Schema(
  {
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
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
    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating'
      }
    },
    title: {
      type: String,
      default: '',
      trim: true
    },
    comment: {
      type: String,
      required: true,
      trim: true
    },
    photoUrl: {
      type: String,
      default: null,
      trim: true
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true
    },
    isVerifiedPurchase: {
      type: Boolean,
      default: true
    },
    reviewSource: {
      type: String,
      enum: ['customer_account', 'admin_link'],
      default: 'customer_account'
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.product_id = ret.productId ? ret.productId.toString() : null;
        ret.order_id = ret.orderId ? ret.orderId.toString() : null;
        ret.customer_id = ret.userId ? ret.userId.toString() : null;
        ret.customer_name = ret.customerName;
        ret.customer_email = ret.customerEmail;
        ret.photo_url = ret.photoUrl;
        ret.is_visible = ret.isVisible;
        ret.is_verified_purchase = ret.isVerifiedPurchase;
        ret.review_source = ret.reviewSource;
        ret.created_at = ret.createdAt;
        ret.updated_at = ret.updatedAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Prevent duplicate reviews for the same product in the same order
reviewSchema.index({ orderId: 1, productId: 1 }, { unique: true });

export const Review = mongoose.model('Review', reviewSchema);
