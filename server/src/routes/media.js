import { Router } from 'express';
import mongoose from 'mongoose';
import multer from 'multer';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';
import { config } from '../config.js';
import { mediaBucket } from '../db.js';
import { badRequest, notFound } from '../lib/errors.js';
import { requireAdmin } from '../middleware/auth.js';
import { requireAdminOrBlogger } from '../middleware/blogger.js';

const router = Router();

const ALLOWED = /^(image\/(png|jpe?g|gif|webp|avif|svg\+xml)|audio\/(mpeg|mp3|wav|x-wav|wave|ogg|webm|flac|mp4|aac|x-m4a)|video\/(mp4|webm))$/;

const upload = multer({
  storage: multer.memoryStorage(),
  limits: { fileSize: config.uploadLimitBytes, files: 1 },
  fileFilter: (_req, file, cb) =>
    ALLOWED.test(file.mimetype) ? cb(null, true) : cb(badRequest(`Files of type ${file.mimetype} cannot be uploaded`)),
});

// Bloggers upload images and audio for their posts too; deleting files stays admin-only.
router.post('/', requireAdminOrBlogger, upload.single('file'), async (req, res) => {
  if (!req.file) throw badRequest('Choose a file to upload');

  const { originalname, mimetype, buffer, size } = req.file;
  const stream = mediaBucket().openUploadStream(originalname, {
    metadata: { contentType: mimetype, uploadedBy: (req.admin ?? req.blogger)._id, uploaderRole: req.admin ? 'admin' : 'blogger' },
  });
  await pipeline(Readable.from(buffer), stream);

  res.status(201).json({
    id: stream.id,
    url: `/api/media/${stream.id}`,
    filename: originalname,
    contentType: mimetype,
    size,
  });
});

// Streams a stored file. Honours Range requests so audio and video can seek.
router.get('/:id', async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('File not found');
  const _id = new mongoose.Types.ObjectId(req.params.id);
  const file = await mediaBucket().find({ _id }).next();
  if (!file) throw notFound('File not found');

  const total = file.length;
  res.set({
    'Content-Type': file.metadata?.contentType ?? 'application/octet-stream',
    'Accept-Ranges': 'bytes',
    'Cache-Control': 'public, max-age=31536000, immutable',
    ETag: `"${file._id}"`,
    // Uploaded SVGs could carry scripts; opened directly they run in a sandbox.
    'Content-Security-Policy': "default-src 'none'; img-src 'self'; style-src 'unsafe-inline'; sandbox",
  });

  if (req.headers['if-none-match'] === `"${file._id}"`) return res.status(304).end();

  let start = 0;
  let end = total - 1;
  const range = /^bytes=(\d*)-(\d*)$/.exec(req.headers.range ?? '');
  if (range && (range[1] || range[2])) {
    if (range[1]) {
      start = Number(range[1]);
      end = range[2] ? Math.min(Number(range[2]), total - 1) : total - 1;
    } else {
      start = Math.max(0, total - Number(range[2]));
    }
    if (start > end || start >= total) {
      res.set('Content-Range', `bytes */${total}`);
      return res.status(416).end();
    }
    res.status(206).set('Content-Range', `bytes ${start}-${end}/${total}`);
  }
  res.set('Content-Length', String(end - start + 1));

  if (total === 0) return res.end();
  const download = mediaBucket().openDownloadStream(_id, { start, end: end + 1 });
  try {
    await pipeline(download, res);
  } catch (err) {
    // A reader closing the tab mid-download is not a server error.
    if (err.code !== 'ERR_STREAM_PREMATURE_CLOSE') throw err;
  }
});

router.delete('/:id', requireAdmin, async (req, res) => {
  if (!mongoose.isValidObjectId(req.params.id)) throw notFound('File not found');
  await mediaBucket().delete(new mongoose.Types.ObjectId(req.params.id));
  res.status(204).end();
});

export default router;
