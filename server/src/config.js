function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} — copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
}

// Values still holding the .env.example placeholder count as unset.
function optional(name) {
  const value = process.env[name]?.trim() ?? '';
  return /^(replace-with|sb_secret_replace)/.test(value) ? '' : value;
}

const clientOrigin = process.env.CLIENT_ORIGIN ?? 'http://localhost:5173';

export const config = {
  env: process.env.NODE_ENV ?? 'development',
  port: Number(process.env.PORT ?? 5000),
  mongoUri: required('MONGODB_URI'),
  jwtSecret: required('JWT_SECRET'),
  clientOrigin,
  publicUrl: (process.env.PUBLIC_URL ?? clientOrigin).replace(/\/$/, ''),
  mail: {
    resendApiKey: process.env.RESEND_API_KEY ?? '',
    from: process.env.MAIL_FROM ?? 'VoiceLK <onboarding@resend.dev>',
    contactTo: process.env.CONTACT_TO ?? '',
  },
  uploadLimitBytes: Number(process.env.UPLOAD_LIMIT_MB ?? 4) * 1024 * 1024,
  // The listening evaluation lives in Supabase; the rest of the blog stays on MongoDB.
  // Left unset, the blog runs as before and the evaluation API answers 503.
  supabase: {
    url: (process.env.SUPABASE_URL ?? '').replace(/\/$/, ''),
    // The secret key (sb_secret_…); the legacy service_role JWT still works as a fallback.
    secretKey: optional('SUPABASE_SECRET_KEY') || optional('SUPABASE_SERVICE_ROLE_KEY'),
    audioBucket: process.env.EVALUATION_AUDIO_BUCKET ?? 'evaluation-audio',
  },
  // Keys the one-way hash of a rater's IP address; changing it lets every IP rate again.
  feedbackIpSecret: optional('FEEDBACK_IP_SECRET') || process.env.JWT_SECRET,
};

export const isProduction = config.env === 'production';
