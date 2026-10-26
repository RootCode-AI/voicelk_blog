import { DEFAULT_OPEN_CODE, publicOpenCode } from '../../../shared/openCode.js';
import { OpenCode } from '../models/OpenCode.js';
import { badRequest, HttpError } from './errors.js';

export function validateOpenCode(body) {
  const details = {};
  if (typeof body?.enabled !== 'boolean') details.enabled = 'Choose whether to show the section.';
  if (!Number.isSafeInteger(body?.revision) || body.revision < 0) details.revision = 'Reload this page before saving.';
  if (!Array.isArray(body?.repos) || body.repos.length > 24) throw badRequest('Use a list of at most 24 repositories.');
  const ids = new Set();
  const repos = body.repos.map((repo, index) => {
    const result = {};
    const prefix = `repos.${index}`;
    const id = repo?.id;
    if (typeof id !== 'string' || !/^[a-zA-Z0-9_-]{1,80}$/.test(id) || ids.has(id)) details[`${prefix}.id`] = 'Repository IDs must be unique.';
    ids.add(id);
    result.id = id;
    for (const [field, max] of Object.entries({ name: 100, label: 100, description: 600, stack: 180, url: 2048 })) {
      const value = repo?.[field];
      if (typeof value !== 'string' || value.trim().length > max || (['name', 'label'].includes(field) && !value.trim())) {
        details[`${prefix}.${field}`] = `Enter ${field === 'label' ? 'a display title' : field} (${max} characters maximum).`;
      }
      result[field] = typeof value === 'string' ? value.trim() : '';
    }
    if (result.url) {
      try {
        const url = new URL(result.url);
        if (!['https:', 'http:'].includes(url.protocol) || url.username || url.password || /[\u0000-\u0020]/.test(result.url)) throw new Error();
        result.url = url.href;
      } catch { details[`${prefix}.url`] = 'Use a full https:// or http:// URL without credentials, or leave it blank.'; }
    }
    if (typeof repo?.visible !== 'boolean') details[`${prefix}.visible`] = 'Choose whether to show this repository.';
    result.visible = repo?.visible;
    return result;
  });
  if (Object.keys(details).length) throw badRequest('Please check the highlighted fields.', details);
  return { enabled: body.enabled, revision: body.revision, repos };
}

export async function readOpenCode() {
  const stored = await OpenCode.findById('open-code').lean();
  if (!stored) return structuredClone(DEFAULT_OPEN_CODE);
  return { enabled: stored.enabled, revision: stored.revision, repos: stored.repos };
}

export async function readPublicOpenCode() { return publicOpenCode(await readOpenCode()); }

export async function saveOpenCode(body) {
  const { revision, ...content } = validateOpenCode(body);
  let saved;
  try {
    saved = await OpenCode.findOneAndUpdate({ _id: 'open-code', revision },
      { $set: content, $inc: { revision: 1 } },
      { upsert: revision === 0, new: true, runValidators: true }).lean();
  } catch (error) {
    if (error.code !== 11000) throw error;
  }
  if (!saved) throw new HttpError(409, 'Someone else updated Open code. Reload this page before saving again.');
  return { enabled: saved.enabled, revision: saved.revision, repos: saved.repos };
}
