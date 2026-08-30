import mongoose from 'mongoose';

const hallOfFameSchema = new mongoose.Schema(
  {
    customer_name: {
      type: String,
      trim: true,
      default: ''
    },
    photo_url: {
      type: String,
      required: [true, 'Customer photo is required'],
      trim: true
    },
    photo_urls: [
      {
        type: String,
        trim: true
      }
    ],
    occasion: {
      type: String,
      trim: true,
      default: 'Wedding'
    },
    description: {
      type: String,
      trim: true,
      default: ''
    },
    products: [
      {
        type: mongoose.Schema.Types.ObjectId,
        ref: 'Product'
      }
    ],
    is_visible: {
      type: Boolean,
      default: true
    },
    display_order: {
      type: Number,
      default: 0
    },
    photo_consent: {
      type: Boolean,
      default: true
    },
    order_id: {
      type: String,
      trim: true,
      default: ''
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Index for efficient sorting
hallOfFameSchema.index({ is_visible: 1, display_order: 1, createdAt: -1 });

export const HallOfFame = mongoose.model('HallOfFame', hallOfFameSchema);
