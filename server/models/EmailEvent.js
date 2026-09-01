import mongoose from 'mongoose';

const emailEventSchema = new mongoose.Schema(
  {
    orderId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Order',
      default: null,
      index: true
    },
    userId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
      default: null,
      index: true
    },
    emailType: {
      type: String,
      required: true,
      enum: [
        'EMAIL_VERIFICATION',
        'PASSWORD_RESET',
        'ORDER_PLACED',
        'ORDER_CONFIRMED',
        'ORDER_SHIPPED',
        'ORDER_DELIVERED',
        'CANCELLATION_APPROVED',
        'REFUND_COMPLETED',
        'ADMIN_TEST'
      ],
      index: true
    },
    recipient: {
      type: String,
      required: true,
      lowercase: true,
      trim: true
    },
    subject: {
      type: String,
      required: true,
      trim: true
    },
    status: {
      type: String,
      enum: ['sent', 'failed', 'skipped'],
      default: 'sent',
      index: true
    },
    errorMessage: {
      type: String,
      default: null
    },
    sentAt: {
      type: Date,
      default: Date.now
    },
    metadata: {
      type: mongoose.Schema.Types.Mixed,
      default: {}
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.order_id = ret.orderId ? ret.orderId.toString() : null;
        ret.user_id = ret.userId ? ret.userId.toString() : null;
        ret.email_type = ret.emailType;
        ret.error_message = ret.errorMessage;
        ret.sent_at = ret.sentAt;
        ret.created_at = ret.createdAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Compound index for querying events by order & type for deduplication
emailEventSchema.index({ orderId: 1, emailType: 1, status: 1 });

export const EmailEvent = mongoose.model('EmailEvent', emailEventSchema);
