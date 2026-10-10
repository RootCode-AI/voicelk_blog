import { useEffect, useRef, useState } from 'react';
import { useLocation } from 'react-router';
import { Analytics } from '@vercel/analytics/react';
import { analyticsPreferenceKey, sanitizeAnalyticsEvent } from '../lib/analytics.js';

export default function AnalyticsConsent() {
  const { pathname } = useLocation();
  const [choice, setChoice] = useState(() => {
    try { const saved = localStorage.getItem(analyticsPreferenceKey); return ['allowed', 'denied'].includes(saved) ? saved : null; }
    catch { return null; }
  });
  const [open, setOpen] = useState(!choice);
  const currentChoice = useRef(choice);
  currentChoice.current = choice;
  const privacySignal = navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true;
  const publicPath = Boolean(sanitizeAnalyticsEvent({ type: 'pageview', url: `https://voicelk.dev${pathname}` }));
  const enabled = choice === 'allowed' && !privacySignal && import.meta.env.PROD && location.origin === 'https://voicelk.dev';
  useEffect(() => {
    const show = () => setOpen(true);
    const sync = (event) => {
      if (event.key === analyticsPreferenceKey || event.key === null) {
        setChoice(event.newValue === 'allowed' ? 'allowed' : 'denied');
      }
    };
    window.addEventListener('voicelk:analytics-preferences', show);
    window.addEventListener('storage', sync);
    return () => {
      window.removeEventListener('voicelk:analytics-preferences', show);
      window.removeEventListener('storage', sync);
    };
  }, []);
  function choose(value) {
    try { localStorage.setItem(analyticsPreferenceKey, value); } catch { /* Current-tab choice still works. */ }
    setChoice(value);
    setOpen(false);
  }
  // beforeSend remains the enforcement point even after the injected script is loaded.
  const beforeSend = (event) => {
    if (currentChoice.current !== 'allowed') return null;
    if (navigator.doNotTrack === '1' || navigator.globalPrivacyControl === true) return null;
    if (document.querySelector('meta[name="robots"]')?.content.includes('noindex')) return null;
    try { if (localStorage.getItem(analyticsPreferenceKey) !== 'allowed') return null; } catch { return null; }
    return sanitizeAnalyticsEvent(event);
  };
  return <>
    {enabled && publicPath && <Analytics beforeSend={beforeSend} />}
    {open && publicPath && <aside aria-label="Analytics preferences" className="fixed inset-x-3 bottom-3 z-[200] mx-auto max-w-xl rounded-2xl border border-line bg-white p-5 shadow-soft sm:inset-x-auto sm:left-5">
      <p className="font-semibold">Optional analytics</p>
      <p className="mt-2 text-sm leading-relaxed text-muted">Help us understand which research pages are useful. Analytics stays off unless you allow it. You can change your choice in the footer. <a className="underline" href="/privacy">Privacy Policy</a></p>
      {privacySignal && <p className="mt-2 text-sm">Your browser privacy signal is on, so analytics will remain disabled.</p>}
      <div className="mt-4 flex flex-wrap gap-3">
        <button className="btn-dark" onClick={() => choose('allowed')} disabled={privacySignal}>Allow analytics</button>
        <button className="btn-ghost" onClick={() => choose('denied')}>No thanks</button>
      </div>
    </aside>}
  </>;
}
