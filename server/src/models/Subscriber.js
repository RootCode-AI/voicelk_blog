import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // Double opt-in: an address only receives posts after clicking the confirmation link.
    status: { type: String, enum: ['pending', 'active', 'unsubscribed'], default: 'pending' },
    confirmToken: { type: String, index: true, sparse: true },
    unsubscribeToken: { type: String, required: true, index: true },
    confirmedAt: { type: Date },
    lastConfirmSentAt: { type: Date },
  },
  { timestamps: true },
);

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
