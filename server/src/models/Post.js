import mongoose from 'mongoose';
import { BLOCK_TYPES } from '../lib/blocks.js';

const { Schema } = mongoose;

const blockSchema = new Schema(
  {
    id: { type: String, required: true },
    type: { type: String, enum: BLOCK_TYPES, required: true },
    data: { type: Schema.Types.Mixed, default: {} },
  },
  { _id: false, minimize: false },
);

const postSchema = new Schema(
  {
    title: { type: String, required: [true, 'A title is required'], trim: true, maxlength: 200 },
    slug: {
      type: String,
      required: true,
      unique: true,
      lowercase: true,
      trim: true,
      match: [/^[a-z0-9]+(?:-[a-z0-9]+)*$/, 'Slugs may only contain lowercase letters, numbers and dashes'],
    },
    excerpt: { type: String, default: '', trim: true, maxlength: 400 },
    coverImage: {
      url: { type: String, default: '' },
      alt: { type: String, default: '' },
    },
    tags: { type: [String], default: [] },
    section: { type: String, enum: ['journey', 'research'], default: 'journey' },
    author: { type: String, default: '', trim: true, maxlength: 120 },
    // Set when a blogger wrote the post; a blogger can only see and change their own.
    blogger: { type: Schema.Types.ObjectId, ref: 'Blogger', index: true },
    status: { type: String, enum: ['draft', 'published'], default: 'draft' },
    featured: { type: Boolean, default: false },
    publishedAt: { type: Date },
    readingMinutes: { type: Number, default: 1 },
    blocks: { type: [blockSchema], default: [] },
    plainText: { type: String, default: '', select: false },
    notifiedAt: { type: Date },
  },
  { timestamps: true },
);

postSchema.index({ status: 1, publishedAt: -1 });
postSchema.index({ tags: 1 });
postSchema.index(
  { title: 'text', excerpt: 'text', tags: 'text', plainText: 'text' },
  { weights: { title: 10, tags: 6, excerpt: 4, plainText: 1 }, name: 'post_search' },
);

export const Post = mongoose.model('Post', postSchema);
