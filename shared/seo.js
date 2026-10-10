import { publicPages } from './pages.js';

export const seoSite = {
  name: 'VoiceLK Journal',
  url: 'https://voicelk.dev',
  title: 'VoiceLK Journal | Sinhala-English TTS Research',
  description: 'Research on Sinhala-English code-switched text-to-speech, including text normalisation, grapheme-to-phoneme conversion, VITS training and evaluation.',
  publisher: 'VoiceLK Research Team',
  image: '/og-image.png',
  imageAlt: 'VoiceLK Journal — Sinhala-English text-to-speech research',
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
    ...(path === '/' ? [] : [{ '@type': path === '/about' ? 'AboutPage' : path.startsWith('/blog') ? 'CollectionPage' : 'WebPage',
      name: title, url: absoluteUrl(path, base), isPartOf: { '@id': website['@id'] } }])] };
}

export const seoPages = {
  ...Object.fromEntries(Object.entries(publicPages).map(([path, page]) => [path, { title: `${page.title} | ${seoSite.name}`, description: page.description }])),
  '/': { title: seoSite.title, description: seoSite.description },
  '/blog': {
    title: `Research Journal | ${seoSite.name}`,
    description: 'Experiments, design decisions and results from building a Sinhala-English code-switched text-to-speech system.',
  },
  '/about': {
    title: `About the VoiceLK Project | ${seoSite.name}`,
    description: 'Meet VoiceLK, a Rajarata University final-year research project building natural Sinhala-English code-switched text-to-speech.',
  },
};

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
