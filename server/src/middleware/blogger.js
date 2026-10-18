import jwt from 'jsonwebtoken';
import { config, isProduction } from '../config.js';
import { HttpError } from '../lib/errors.js';
import { Blogger } from '../models/Blogger.js';
import { sessionAdmin } from './auth.js';

// Bloggers have their own cookie and a token audience the admin check refuses, so
// signing in to the writing desk never opens /admin (the same pattern as evaluators).
export const BLOGGER_COOKIE = 'voicelk_writer';
const AUDIENCE = 'voicelk-blogger';
const SESSION_DAYS = 7;

export function startBloggerSession(res, blogger) {
  const token = jwt.sign({ sub: String(blogger._id) }, config.jwtSecret, { audience: AUDIENCE, expiresIn: `${SESSION_DAYS}d` });
  res.cookie(BLOGGER_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function endBloggerSession(res) {
  res.clearCookie(BLOGGER_COOKIE, { path: '/' });
}

export const publicBlogger = (b) => ({ id: b._id, email: b.email, name: b.name, role: 'blogger' });

async function sessionBlogger(req) {
  const token = req.cookies?.[BLOGGER_COOKIE];
  if (!token) return null;
  try {
    const { sub } = jwt.verify(token, config.jwtSecret, { audience: AUDIENCE });
    // Looked up on every request, so a removed blogger is signed out at once.
    return await Blogger.findById(sub).lean();
  } catch {
    return null;
  }
}

export async function requireBlogger(req, _res, next) {
  try {
    const blogger = await sessionBlogger(req);
    if (!blogger) return next(new HttpError(401, 'Please sign in to write.'));
    req.blogger = blogger;
    next();
  } catch (err) {
    next(err);
  }
}

// For what both may do, such as uploading images and audio for a post.
export async function requireAdminOrBlogger(req, _res, next) {
  try {
    const admin = await sessionAdmin(req);
    if (admin) {
      req.admin = admin;
      return next();
    }
    const blogger = await sessionBlogger(req);
    if (!blogger) return next(new HttpError(401, 'Please sign in.'));
    req.blogger = blogger;
    next();
  } catch (err) {
    next(err);
  }
}
