import mongoose from 'mongoose';

const productSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Product name is required'],
      trim: true
    },
    price: {
      type: Number,
      required: [true, 'Product price is required'],
      min: [1, 'Price must be greater than 0']
    },
    category: {
      type: String,
      required: [true, 'Product category is required'],
      trim: true
    },
    tag: {
      type: String,
      default: 'NEW',
      trim: true
    },
    img: {
      type: String,
      required: [true, 'Product image is required']
    },
    images: {
      type: [String],
      default: []
    },
    description: {
      type: String,
      default: ''
    },
    stock: {
      type: Number,
      default: 10,
      min: [0, 'Stock cannot be negative']
    },
    active: {
      type: Number,
      default: 1,
      enum: [0, 1]
    },
    isBestseller: {
      type: Boolean,
      default: false
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        // Ensure images array always contains at least the primary img
        if (!ret.images || ret.images.length === 0) {
          ret.images = ret.img ? [ret.img] : [];
        }
        delete ret._id;
        delete ret.__v;
        return ret;
      }
    }
  }
);

// Ensure images and img are always synchronized before saving
productSchema.pre('validate', function () {
  if (this.images && this.images.length > 0) {
    if (!this.img) {
      this.img = this.images[0];
    }
  } else if (this.img) {
    this.images = [this.img];
  }
});

export const Product = mongoose.model('Product', productSchema);
