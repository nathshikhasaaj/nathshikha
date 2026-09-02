import mongoose from 'mongoose';

const parameterValueSchema = new mongoose.Schema(
  {
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
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        return ret;
      }
    }
  }
);

const parameterSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Parameter name is required'],
      unique: true,
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
    values: {
      type: [parameterValueSchema],
      default: []
    },
    isActive: {
      type: Boolean,
      default: true
    },
    order: {
      type: Number,
      default: 0
    }
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id ? ret._id.toString() : undefined;
        delete ret.__v;
        return ret;
      }
    }
  }
);

export const Parameter = mongoose.model('Parameter', parameterSchema);
