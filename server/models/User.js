import mongoose from 'mongoose';
import bcrypt from 'bcryptjs';

const userSchema = new mongoose.Schema(
  {
    name: {
      type: String,
      required: [true, 'Name is required'],
      trim: true
    },
    email: {
      type: String,
      required: [true, 'Email is required'],
      unique: true,
      lowercase: true,
      trim: true
    },
    passwordHash: {
      type: String,
      required: [true, 'Password hash is required']
    },
    role: {
      type: String,
      enum: ['customer', 'admin'],
      default: 'customer'
    },
    phone: {
      type: String,
      default: '',
      trim: true
    },
    emailVerified: {
      type: Boolean,
      default: false,
      alias: 'email_verified'
    },
    emailVerificationTokenHash: {
      type: String,
      default: null
    },
    emailVerificationExpiresAt: {
      type: Date,
      default: null
    },
    passwordResetTokenHash: {
      type: String,
      default: null
    },
    passwordResetExpiresAt: {
      type: Date,
      default: null
    },
    defaultAddress: {
      recipientName: { type: String, default: '', trim: true },
      recipientPhone: { type: String, default: '', trim: true },
      addressLine1: { type: String, default: '', trim: true },
      addressLine2: { type: String, default: '', trim: true },
      city: { type: String, default: '', trim: true },
      state: { type: String, default: '', trim: true },
      pincode: { type: String, default: '', trim: true }
    },
    giftAddresses: [
      {
        recipientName: { type: String, required: true, trim: true },
        recipientPhone: { type: String, required: true, trim: true },
        addressLine1: { type: String, required: true, trim: true },
        addressLine2: { type: String, default: '', trim: true },
        city: { type: String, required: true, trim: true },
        state: { type: String, required: true, trim: true },
        pincode: { type: String, required: true, trim: true },
        isDefault: { type: Boolean, default: false }
      }
    ]
  },
  {
    timestamps: true,
    toJSON: {
      virtuals: true,
      transform: (doc, ret) => {
        ret.id = ret._id.toString();
        ret.phone = ret.phone || '';
        ret.email_verified = ret.emailVerified !== undefined ? Boolean(ret.emailVerified) : false;
        ret.default_address = ret.defaultAddress || null;
        ret.gift_addresses = (ret.giftAddresses || []).map((ga) => ({
          id: ga._id ? ga._id.toString() : ga.id,
          recipient_name: ga.recipientName,
          recipient_phone: ga.recipientPhone,
          address_line1: ga.addressLine1,
          address_line2: ga.addressLine2 || '',
          city: ga.city,
          state: ga.state,
          pincode: ga.pincode,
          is_default: Boolean(ga.isDefault)
        }));
        delete ret._id;
        delete ret.__v;
        delete ret.passwordHash;
        delete ret.emailVerificationTokenHash;
        delete ret.passwordResetTokenHash;
        return ret;
      }
    }
  }
);

userSchema.methods.comparePassword = function (candidatePassword) {
  return bcrypt.compareSync(candidatePassword, this.passwordHash);
};

userSchema.statics.hashPassword = function (password) {
  return bcrypt.hashSync(password, 10);
};

export const User = mongoose.model('User', userSchema);
