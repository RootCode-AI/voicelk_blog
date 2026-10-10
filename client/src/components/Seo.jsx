import { useEffect } from 'react';
import { site } from '../site.config.js';
import { socialImage as getSocialImage, websiteSchema, seoPages } from '../../../shared/seo.js';

function absoluteUrl(value = '/') {
  try {
    return new URL(value, site.url).href;
  } catch {
    return site.url;
  }
}

function setMeta(attribute, key, content) {
  const selector = `meta[${attribute}="${key}"]`;
  let element = document.head.querySelector(selector);
  if (!content) {
    element?.remove();
    return;
  }
  if (!element) {
    element = document.createElement('meta');
    element.setAttribute(attribute, key);
    document.head.appendChild(element);
  }
  element.setAttribute('content', content);
}

function setCanonical(href) {
  let link = document.head.querySelector('link[rel="canonical"]');
  if (!link) {
    link = document.createElement('link');
    link.setAttribute('rel', 'canonical');
    document.head.appendChild(link);
  }
  link.setAttribute('href', href);
}

export default function Seo({
  title,
  description = site.description,
  path = '/',
  image,
  imageAlt,
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
  author,
  tags = [],
  jsonLd,
  pending = false,
}) {
  useEffect(() => {
    if (pending) return;
    const fullTitle = title ? `${title} | ${site.title}` : site.seoTitle;
    const canonical = absoluteUrl(path);
    const social = getSocialImage(image, imageAlt || title);
    const socialImage = social.url;

    document.title = fullTitle;
    document.documentElement.lang = 'en-LK';
    setCanonical(canonical);

    setMeta('name', 'description', description);
    const preview = document.head.querySelector('meta[name="voicelk:preview"]')?.content === 'true';
    setMeta('name', 'robots', noIndex || preview ? 'noindex, follow' : 'index, follow, max-image-preview:large');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:site_name', site.title);
    setMeta('property', 'og:locale', 'en_LK');
    setMeta('property', 'og:image', socialImage);
    setMeta('property', 'og:image:alt', social.alt);
    setMeta('property', 'og:image:width', social.width);
    setMeta('property', 'og:image:height', social.height);
    setMeta('property', 'og:image:type', social.type);
    setMeta('name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', socialImage);
    setMeta('name', 'twitter:image:alt', social.alt);
    let markdown = document.head.querySelector('link[rel="alternate"][type="text/markdown"]');
    const pathname = path.split('?')[0];
    if (!noIndex && !preview && (seoPages[pathname] || type === 'article')) {
      if (!markdown) {
        markdown = document.createElement('link');
        markdown.rel = 'alternate';
        markdown.type = 'text/markdown';
        document.head.appendChild(markdown);
      }
      markdown.href = absoluteUrl(pathname === '/' ? '/index.md' : path.replace(pathname, `${pathname}.md`));
    } else markdown?.remove();

    setMeta('property', 'article:published_time', type === 'article' ? publishedTime : '');
    setMeta('property', 'article:modified_time', type === 'article' ? modifiedTime : '');
    setMeta('property', 'article:author', type === 'article' ? author : '');
    document.head.querySelectorAll('meta[property="article:tag"]').forEach((element) => element.remove());
    if (type === 'article') {
      tags.forEach((tag) => {
        const element = document.createElement('meta');
        element.setAttribute('property', 'article:tag');
        element.setAttribute('content', tag);
        document.head.appendChild(element);
      });
    }

    let script = document.head.querySelector('script[data-voicelk-seo]');
    const schema = noIndex || preview ? null : jsonLd || websiteSchema(path, fullTitle);
    if (schema) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.voicelkSeo = 'true';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(schema).replace(/</g, '\\u003c');
    } else {
      script?.remove();
    }
  }, [author, description, image, imageAlt, jsonLd, modifiedTime, noIndex, path, pending, publishedTime, tags, title, type]);

  return null;
}
