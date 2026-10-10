import { seoPages } from '../../../shared/seo.js';

export const analyticsPreferenceKey = 'voicelk-analytics-consent';
export function sanitizeAnalyticsEvent(event) {
  try {
    const url = new URL(event.url);
    if (url.origin !== 'https://voicelk.dev' || event.type !== 'pageview') return null;
    if (!seoPages[url.pathname] && !/^\/blog\/[a-z0-9]+(?:-[a-z0-9]+)*$/.test(url.pathname)) return null;
    url.search = '';
    url.hash = '';
    return { ...event, url: url.href };
  } catch { return null; }
}
