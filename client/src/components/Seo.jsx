import { useEffect } from 'react';
import { site } from '../site.config.js';

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
  type = 'website',
  noIndex = false,
  publishedTime,
  modifiedTime,
  author,
  tags = [],
  jsonLd,
}) {
  useEffect(() => {
    const fullTitle = title ? `${title} | ${site.name}` : site.title;
    const canonical = absoluteUrl(path);
    const socialImage = image ? absoluteUrl(image) : '';

    document.title = fullTitle;
    document.documentElement.lang = 'en-LK';
    setCanonical(canonical);

    setMeta('name', 'description', description);
    setMeta('name', 'robots', noIndex ? 'noindex, nofollow' : 'index, follow, max-image-preview:large');
    setMeta('property', 'og:title', fullTitle);
    setMeta('property', 'og:description', description);
    setMeta('property', 'og:type', type);
    setMeta('property', 'og:url', canonical);
    setMeta('property', 'og:site_name', site.title);
    setMeta('property', 'og:locale', 'en_LK');
    setMeta('property', 'og:image', socialImage);
    setMeta('name', 'twitter:card', socialImage ? 'summary_large_image' : 'summary');
    setMeta('name', 'twitter:title', fullTitle);
    setMeta('name', 'twitter:description', description);
    setMeta('name', 'twitter:image', socialImage);

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
    if (jsonLd) {
      if (!script) {
        script = document.createElement('script');
        script.type = 'application/ld+json';
        script.dataset.voicelkSeo = 'true';
        document.head.appendChild(script);
      }
      script.textContent = JSON.stringify(jsonLd).replace(/</g, '\\u003c');
    } else {
      script?.remove();
    }
  }, [author, description, image, jsonLd, modifiedTime, noIndex, path, publishedTime, tags, title, type]);

  return null;
}
