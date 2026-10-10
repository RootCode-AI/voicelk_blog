import { postSections } from '../../../shared/postSections.js';
import { badRequest } from './errors.js';

export function sectionFilter(section) {
  if (section === undefined || section === '') return {};
  if (typeof section !== 'string' || !Object.hasOwn(postSections, section)) throw badRequest('Section must be journey or research');
  return section === 'journey'
    ? { $or: [{ section: 'journey' }, { section: { $exists: false } }, { section: null }] }
    : { section: 'research' };
}
