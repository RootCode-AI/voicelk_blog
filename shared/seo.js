import { publicPages } from './pages.js';
import { postSections, isPostListing, sectionForPost } from './postSections.js';

export const seoSite = {
  name: 'VoiceLK',
  url: 'https://voicelk.dev',
  title: 'VoiceLK | Sinhala-English Text to Speech',
  description: 'VoiceLK is a Sinhala-English text-to-speech product built from research, bringing mixed-language text to life as speech.',
  publisher: 'VoiceLK Team',
  image: '/og-image.png',
  imageAlt: 'VoiceLK — Sinhala-English text-to-speech product',
};

export function socialImage(value, alt, base = seoSite.url) {
  const custom = value ? absoluteUrl(value, base) : '';
  return { url: custom || absoluteUrl(seoSite.image, base),
    alt: custom ? alt || seoSite.imageAlt : seoSite.imageAlt,
    ...(!custom && { width: 1200, height: 630, type: 'image/png' }) };
}

export function websiteSchema(path = '/', title = seoSite.title, base = seoSite.url) {
  const organization = { '@type': 'Organization', '@id': `${base}/#organization`, name: seoSite.publisher, url: base };
  const website = { '@type': 'WebSite', '@id': `${base}/#website`, name: seoSite.name, url: `${base}/`,
    description: seoSite.description, inLanguage: 'en-LK', publisher: { '@id': organization['@id'] } };
  return { '@context': 'https://schema.org', '@graph': [organization, website,
    ...(path === '/' ? [] : [{ '@type': path === '/about' ? 'AboutPage' : isPostListing(path.split('?')[0]) ? 'CollectionPage' : 'WebPage',
      name: title, url: absoluteUrl(path, base), isPartOf: { '@id': website['@id'] } }])] };
}

export const seoPages = {
  ...Object.fromEntries(Object.values(postSections).map((section) => [section.path, { title: `${section.title} | ${seoSite.name}`, description: section.description }])),
  ...Object.fromEntries(Object.entries(publicPages).map(([path, page]) => [path, { title: `${page.title} | ${seoSite.name}`, description: page.description }])),
  '/': { title: seoSite.title, description: seoSite.description },
  '/blog': {
    title: `Product updates | ${seoSite.name}`,
    description: 'Experiments, design decisions and results from building a Sinhala-English code-switched text-to-speech system.',
  },
  '/about': {
    title: `About VoiceLK | ${seoSite.name}`,
    description: 'Meet VoiceLK, a Sinhala-English text-to-speech product developed from research at Rajarata University of Sri Lanka.',
  },
};

// Public but deliberately kept out of search results and the sitemap: the listening
// test is a research instrument, not content.
export const unlistedPages = {
  '/evaluate': {
    title: `Rate VoiceLK speech | ${seoSite.name}`,
    description: 'Listen to VoiceLK Sinhala-English speech samples and rate their quality, clarity and naturalness.',
  },
};

// The evaluation sign-in and console behind /evaluate are private, like /admin.
export const isEvaluateConsolePath = (path) => /^\/evaluate\/./.test(path);

export function absoluteUrl(value, base = seoSite.url) {
  try {
    const url = new URL(value, base);
    return ['http:', 'https:'].includes(url.protocol) ? url.href : '';
  } catch {
    return '';
  }
}

export function articleSchema(post, base = seoSite.url) {
  const url = absoluteUrl(`/blog/${post.slug}`, base);
  const image = socialImage(post.coverImage?.url, post.coverImage?.alt, base).url;
  return {
    '@context': 'https://schema.org',
    '@type': 'BlogPosting',
    headline: post.title,
    articleSection: sectionForPost(post).label,
    description: post.excerpt || seoSite.description,
    url,
    mainEntityOfPage: { '@type': 'WebPage', '@id': url },
    inLanguage: 'en-LK',
    datePublished: post.publishedAt,
    dateModified: post.updatedAt || post.publishedAt,
    author: { '@type': post.author ? 'Person' : 'Organization', name: post.author || seoSite.publisher },
    publisher: { '@type': 'Organization', name: seoSite.publisher, url: base },
    keywords: post.tags?.join(', '),
    image,
  };
}
