import { createElement as h } from 'react';
import { publicPages } from '../../../shared/pages.js';

// Shared visible content: the same text is rendered in initial HTML and React.
export default function InfoContent({ path }) {
  const page = publicPages[path];
  const faq = path === '/faq';
  return h('article', { className: 'mx-auto max-w-3xl px-4 pb-24 pt-36 sm:px-6 md:pt-44' },
    h('p', { className: 'eyebrow mb-4' }, faq ? 'A little context' : 'VoiceLK Journal'),
    h('h1', { className: 'font-serif text-5xl leading-tight sm:text-6xl' }, page.title),
    page.updated && h('p', { className: 'mt-4 text-sm text-muted' }, `Last updated: ${page.updated}`),
    h('p', { className: 'mt-6 text-lg leading-relaxed text-slate' }, page.intro),
    h('div', { className: 'mt-10 space-y-6' }, ...page.sections.map((section) => faq ?
      h('details', { key: section.title, className: 'rounded-xl border border-line bg-white p-5' },
        h('summary', { className: 'cursor-pointer text-lg font-medium' }, section.title),
        h('p', { className: 'mt-4 leading-relaxed text-slate' }, section.body)) :
      h('section', { key: section.title }, h('h2', { className: 'font-serif text-2xl' }, section.title),
        h('p', { className: 'mt-3 leading-relaxed text-slate' }, section.body)))),
    h('nav', { 'aria-label': 'Next steps', className: 'mt-12 flex flex-wrap gap-4 border-t border-line pt-8' },
      ...page.links.map((link, i) => h('a', { key: link.href, href: link.href, className: i ? 'btn-ghost' : 'btn-dark' }, link.label))));
}
