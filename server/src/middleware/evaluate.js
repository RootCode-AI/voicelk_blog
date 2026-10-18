import jwt from 'jsonwebtoken';
import { config, isProduction } from '../config.js';
import { HttpError } from '../lib/errors.js';
import { must, supabase } from '../supabase.js';
import { sessionAdmin } from './auth.js';

// Evaluators sign in separately from blog administrators: their own cookie, and a
// token audience the admin middleware refuses, so an evaluator can never reach /admin.
export const EVALUATOR_COOKIE = 'voicelk_evaluator';
const AUDIENCE = 'voicelk-evaluator';
const SESSION_DAYS = 7;

export function startEvaluatorSession(res, evaluator) {
  const token = jwt.sign({ sub: evaluator.id }, config.jwtSecret, { audience: AUDIENCE, expiresIn: `${SESSION_DAYS}d` });
  res.cookie(EVALUATOR_COOKIE, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: isProduction,
    maxAge: SESSION_DAYS * 24 * 60 * 60 * 1000,
    path: '/',
  });
}

export function endEvaluatorSession(res) {
  res.clearCookie(EVALUATOR_COOKIE, { path: '/' });
}

export const publicEvaluateUser = (user) => ({ id: user.id, role: user.role, email: user.email, name: user.name });

// Blog administrators can use the evaluation console too, and are the only ones
// who manage evaluator accounts.
async function evaluateUser(req) {
  const admin = await sessionAdmin(req);
  if (admin) return { id: String(admin._id), role: 'admin', email: admin.email, name: admin.name ?? '' };

  const token = req.cookies?.[EVALUATOR_COOKIE];
  if (!token) return null;
  let sub;
  try {
    ({ sub } = jwt.verify(token, config.jwtSecret, { audience: AUDIENCE }));
  } catch {
    return null;
  }
  const evaluator = must(await supabase().from('evaluators').select('id, email, name').eq('id', sub).maybeSingle());
  return evaluator && { ...evaluator, role: 'evaluator' };
}

export async function requireEvaluateAccess(req, _res, next) {
  try {
    const user = await evaluateUser(req);
    if (!user) return next(new HttpError(401, 'Please sign in to the evaluation console.'));
    req.evaluateUser = user;
    next();
  } catch (err) {
    next(err);
  }
}

export function requireEvaluateAdmin(req, _res, next) {
  if (req.evaluateUser?.role !== 'admin') return next(new HttpError(403, 'Only administrators can manage evaluators.'));
  next();
}
