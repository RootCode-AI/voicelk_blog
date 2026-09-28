import mongoose from 'mongoose';

let bucket = null;

export async function connectDb(uri) {
  await mongoose.connect(uri);
  // Uploaded images, audio samples and videos live in GridFS so the whole blog
  // needs nothing but MongoDB — no separate object store.
  bucket = new mongoose.mongo.GridFSBucket(mongoose.connection.db, { bucketName: 'media' });
  return mongoose.connection;
}

export function mediaBucket() {
  if (!bucket) throw new Error('Database is not connected');
  return bucket;
}
