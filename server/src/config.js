function required(name) {
  const value = process.env[name];
  if (!value) {
    throw new Error(`Missing environment variable ${name} — copy server/.env.example to server/.env and fill it in.`);
  }
  return value;
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
    from: process.env.MAIL_FROM ?? 'VoiceLK Journal <onboarding@resend.dev>',
    contactTo: process.env.CONTACT_TO ?? '',
  },
  uploadLimitBytes: Number(process.env.UPLOAD_LIMIT_MB ?? 25) * 1024 * 1024,
};

export const isProduction = config.env === 'production';
