import jwt from 'jsonwebtoken';
import { config, isProduction } from '../config.js';
import { Admin } from '../models/Admin.js';
import { HttpError } from '../lib/errors.js';

export const SESSION_COOKIE = 'voicelk_session';
const SESSION_DAYS = 7;

export function startSession(res, admin) {
  const token = jwt.sign({ sub: String(admin._id) }, config.jwtSecret, { expiresIn: `${SESSION_DAYS}d` });
  res.cookie(SESSION_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function endSession(res) {
  res.clearCookie(SESSION_COOKIE, { path: '/' });
}

async function adminFromToken(token) {
  const { sub, aud } = jwt.verify(token, config.jwtSecret);
  // Evaluator sessions share the secret but carry an audience; they are never admins.
  if (aud) return null;
  return Admin.findById(sub).lean();
}

// The signed-in administrator, or null — for routes that admins share with other roles.
export async function sessionAdmin(req) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return null;
  try {
    return await adminFromToken(token);
  } catch {
    return null;
  }
}

export async function requireAdmin(req, _res, next) {
  const token = req.cookies?.[SESSION_COOKIE];
  if (!token) return next(new HttpError(401, 'Please sign in.'));
  try {
    const admin = await adminFromToken(token);
    if (!admin) return next(new HttpError(401, 'Please sign in.'));
    req.admin = admin;
    next();
  } catch {
    next(new HttpError(401, 'Your session has expired. Please sign in again.'));
  }
}
