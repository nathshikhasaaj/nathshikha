import mongoose from 'mongoose';

const suggestionSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      trim: true,
      lowercase: true
    },
    phone: {
      type: String,
      required: [true, 'Phone number is required'],
      trim: true
    },
    category: {
      type: String,
      required: true,
      default: 'Custom Jewellery Design',
      enum: [
        'Custom Jewellery Design',
        'Bridal Collection Request',
        'Nath Modification',
        'Pearl Mala Customization',
        'Store & Product Improvement',
        'Other Idea'
      ]
    },
    title: {
      type: String,
      required: [true, 'Idea title is required'],
      trim: true
    },
    description: {
      type: String,
      required: [true, 'Detailed description is required'],
      trim: true
    },
    budget: {
      type: String,
      default: 'Flexible'
    },
    imageUrl: {
      type: String,
      default: null
    },
    status: {
      type: String,
      enum: ['received', 'under_review', 'in_progress', 'completed'],
      default: 'received'
    },
    notes: {
      type: String,
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

export const Suggestion = mongoose.model('Suggestion', suggestionSchema);
