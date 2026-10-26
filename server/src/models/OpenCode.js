import mongoose from 'mongoose';

const repository = new mongoose.Schema({
  id: { type: String, required: true },
  name: { type: String, required: true, maxlength: 100 },
  label: { type: String, required: true, maxlength: 100 },
  description: { type: String, default: '', maxlength: 600 },
  stack: { type: String, default: '', maxlength: 180 },
  url: { type: String, default: '', maxlength: 2048 },
  visible: { type: Boolean, default: true },
}, { _id: false });

export const OpenCode = mongoose.model('OpenCode', new mongoose.Schema({
  _id: { type: String, default: 'open-code' },
  enabled: { type: Boolean, default: true },
  revision: { type: Number, default: 0 },
  repos: { type: [repository], default: [] },
}, { timestamps: true }));
