// Upload limits for the listening evaluation, shared by the browser and the API so
// both reject the same files with the same words. Supabase enforces the audio limit
// a third time through the bucket's file_size_limit (server/supabase/evaluation.sql).

export const MAX_AUDIO_BYTES = 10 * 1024 * 1024;

// Audio types the evaluation accepts, and the extension each is stored under. The
// Storage bucket's "Allowed MIME types" must list exactly these keys; evaluation.sql
// sets them, and a test fails if the two drift apart.
export const AUDIO_TYPES = {
  'audio/mpeg': 'mp3',
  'audio/mp3': 'mp3',
  'audio/wav': 'wav',
  'audio/x-wav': 'wav',
  'audio/wave': 'wav',
  'audio/ogg': 'ogg',
  'audio/webm': 'webm',
  'audio/flac': 'flac',
  'audio/x-flac': 'flac',
  'audio/mp4': 'm4a',
  'audio/x-m4a': 'm4a',
  'audio/aac': 'aac',
};
export const ALLOWED_AUDIO_MIME_TYPES = Object.keys(AUDIO_TYPES);
export const AUDIO_EXTENSIONS = [...new Set(Object.values(AUDIO_TYPES))];
const SUPPORTED = 'MP3, WAV, OGG, WebM, FLAC, M4A or AAC';

// Some browsers leave a file's type empty (often for FLAC or M4A); the extension decides then.
const TYPE_BY_EXTENSION = { mp3: 'audio/mpeg', wav: 'audio/wav', ogg: 'audio/ogg', oga: 'audio/ogg', webm: 'audio/webm',
  flac: 'audio/flac', m4a: 'audio/mp4', aac: 'audio/aac' };
export const audioTypeOf = ({ type, name }) =>
  (type || TYPE_BY_EXTENSION[String(name).split('.').pop().toLowerCase()] || '').toLowerCase();
export const MAX_TRANSCRIPT_CHARS = 20000;
// Only guards against reading a huge file into memory; the character count is the
// real limit (20,000 Sinhala characters are about 60 KB of UTF-8).
export const MAX_TEXT_FILE_BYTES = 256 * 1024;

// Rounded up, so a file just over the limit never reads as exactly "10.0 MB".
const megabytes = (bytes) => `${(Math.ceil((bytes / 1024 / 1024) * 10) / 10).toFixed(1)} MB`;
const count = new Intl.NumberFormat('en-GB');

// Each check returns a message for the person, or null when the value is fine.
export function audioTypeProblem(type) {
  if (AUDIO_TYPES[type]) return null;
  return type ? `${type} files can't be used. Upload ${SUPPORTED} audio.` : `Upload ${SUPPORTED} audio.`;
}

export function audioSizeProblem(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'That audio file is empty.';
  if (bytes > MAX_AUDIO_BYTES) return `Audio files can be at most 10 MB; this one is ${megabytes(bytes)}.`;
  return null;
}

export function textFileSizeProblem(bytes) {
  if (!Number.isFinite(bytes) || bytes <= 0) return 'That text file is empty.';
  if (bytes > MAX_TEXT_FILE_BYTES) return `That text file is ${Math.round(bytes / 1024)} KB; keep it under 256 KB.`;
  return null;
}

export function transcriptProblem(text) {
  if (!text) return 'Add the text the clip was generated from.';
  if (text.length > MAX_TRANSCRIPT_CHARS) {
    return `The text can be at most ${count.format(MAX_TRANSCRIPT_CHARS)} characters; this has ${count.format(text.length)}.`;
  }
  return null;
}
