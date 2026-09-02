import mongoose from 'mongoose';

const productParameterSelectedValueSchema = new mongoose.Schema(
  {
    valueId: {
      type: String,
      required: true,
      trim: true
    },
    label: {
      type: String,
      required: true,
      trim: true
    },
    value: {
      type: String,
      required: true,
      trim: true
    },
    colorCode: {
      type: String,
      default: null,
      trim: true
    },
    inStock: {
      type: Boolean,
      default: true
    }
  },
  { _id: false }
);

const productParameterAssignmentSchema = new mongoose.Schema(
  {
    parameterId: {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'Parameter',
      required: true
    },
    name: {
      type: String,
      required: true,
      trim: true
    },
    displayType: {
      type: String,
      enum: ['buttons', 'dropdown', 'color'],
      default: 'buttons'
    },
    selectionMode: {
      type: String,
      enum: ['single', 'multiple'],
      default: 'single'
    },
    required: {
      type: Boolean,
      default: true
    },
    selectedValueIds: {
      type: [String],
      default: []
    },
    selectedValues: {
      type: [productParameterSelectedValueSchema],
      default: []
    }
  },
  { _id: false }
);

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
      default: 'Traditional',
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
    productParameters: {
      type: [productParameterAssignmentSchema],
      default: []
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
        if (!Array.isArray(ret.productParameters)) {
          ret.productParameters = [];
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
