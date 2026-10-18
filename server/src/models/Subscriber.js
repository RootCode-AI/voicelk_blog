import mongoose from 'mongoose';

const subscriberSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true },
    // New subscribers become active immediately; pending remains for legacy confirmation links.
    status: { type: String, enum: ['pending', 'active', 'unsubscribed'], default: 'active' },
    confirmToken: { type: String, index: true, sparse: true },
    unsubscribeToken: { type: String, required: true, index: true },
    confirmedAt: { type: Date },
    lastConfirmSentAt: { type: Date },
    // When the last welcome email went out; limits it to one a day per address.
    welcomedAt: { type: Date },
  },
  { timestamps: true },
);

export const Subscriber = mongoose.model('Subscriber', subscriberSchema);
