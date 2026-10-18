import mongoose from 'mongoose';

// Writers who may create and publish their own posts, and nothing else. Kept apart
// from Admin on purpose: a blogger session can never satisfy an admin check.
const bloggerSchema = new mongoose.Schema(
  {
    email: { type: String, required: true, unique: true, lowercase: true, trim: true, maxlength: 200 },
    name: { type: String, default: '', trim: true, maxlength: 120 },
    passwordHash: { type: String, required: true, select: false },
    createdBy: { type: String, default: '' },
  },
  { timestamps: true },
);

export const Blogger = mongoose.model('Blogger', bloggerSchema);
