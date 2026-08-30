import mongoose from 'mongoose';

const reviewTokenSchema = new mongoose.Schema(
  {
    token: {
      type: String,
      required: true,
      unique: true,
      index: true
    },
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      required: true
    },
    productId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Product',
      required: true
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
    isUsed: {
      type: Boolean,
      default: false
    },
    usedAt: {
      type: Date,
      default: null
    },
    expiresAt: {
      type: Date,
      required: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (_, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.order_id = ret.orderId ? ret.orderId.toString() : null;
        ret.product_id = ret.productId ? ret.productId.toString() : null;
        ret.customer_name = ret.customerName;
        ret.customer_email = ret.customerEmail;
        ret.is_used = ret.isUsed;
        ret.used_at = ret.usedAt;
        ret.expires_at = ret.expiresAt;
        ret.created_at = ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const ReviewToken = mongoose.model('ReviewToken', reviewTokenSchema);
