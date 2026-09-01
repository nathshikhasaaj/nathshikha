import mongoose from 'mongoose';

const showcaseReviewSchema = new mongoose.Schema(
  {
    customerName: {
      type: String,
      required: [true, 'Customer name is required'],
      trim: true
    },
    rating: {
      type: Number,
      required: [true, 'Rating is required'],
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: '{VALUE} is not an integer rating'
      }
    },
    reviewText: {
      type: String,
      required: [true, 'Review text is required'],
      trim: true
    },
    image: {
      type: String,
      default: null,
      trim: true
    },
    isVisible: {
      type: Boolean,
      default: true,
      index: true
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : ret.id;
        ret.customerName = ret.customerName;
        ret.customer_name = ret.customerName;
        ret.rating = ret.rating;
        ret.reviewText = ret.reviewText;
        ret.review_text = ret.reviewText;
        ret.image = ret.image;
        ret.isVisible = ret.isVisible;
        ret.is_visible = ret.isVisible;
        ret.created_at = ret.createdAt;
        ret.updated_at = ret.updatedAt;
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

showcaseReviewSchema.index({ isVisible: 1, createdAt: -1 });

export const ShowcaseReview = mongoose.model('ShowcaseReview', showcaseReviewSchema);
