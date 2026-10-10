import { Link } from 'react-router';
import { site } from '../site.config.js';
import { Logo } from './Navbar.jsx';

export default function Footer() {
  return (
    <footer className="border-t border-line">
      <div className="mx-auto grid max-w-7xl gap-10 px-4 py-14 sm:px-6 md:grid-cols-[1.4fr_1fr_1fr]">
        <div className="max-w-sm">
          <Logo />
          <p className="mt-4 text-sm leading-relaxed text-muted">
            A final-year research project at {site.university}, written up as we go.
          </p>
        </div>
        <div>
          <p className="eyebrow mb-3">Read</p>
          <ul className="space-y-2 text-sm">
            <li><Link to="/blog" className="text-slate hover:text-ink">All notes</Link></li>
            <li><Link to="/#project" className="text-slate hover:text-ink">The pipeline</Link></li>
            <li><Link to="/about" className="text-slate hover:text-ink">About &amp; contact</Link></li>
            <li><Link to="/faq" className="text-slate hover:text-ink">Frequently asked questions</Link></li>
            <li><Link to="/privacy" className="text-slate hover:text-ink">Privacy Policy</Link></li>
            <li><Link to="/terms" className="text-slate hover:text-ink">Terms of Use</Link></li>
            <li><button className="text-slate hover:text-ink" onClick={() => window.dispatchEvent(new Event('voicelk:analytics-preferences'))}>Analytics preferences</button></li>
          </ul>
        </div>
        <div>
          <p className="eyebrow mb-3">Code</p>
          <ul className="space-y-2 text-sm">
            {site.repos.map((r) => (
              <li key={r.name}>
                {r.url ? (
                  <a href={r.url} target="_blank" rel="noreferrer" className="text-slate hover:text-ink">
                    {r.label}
                  </a>
                ) : (
                  <span className="text-muted">{r.label}</span>
                )}
              </li>
            ))}
          </ul>
        </div>
      </div>
      <div className="mx-auto flex max-w-7xl flex-wrap justify-between gap-2 px-4 pb-8 text-xs text-muted sm:px-6">
        <span>© {new Date().getFullYear()} {site.name} research team</span>
        <span>සිංහල · English</span>
      </div>
    </footer>
  );
}
