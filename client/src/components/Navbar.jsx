import { useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { site } from '../site.config.js';

const links = [
  { to: '/blog', label: 'Journal' },
  { to: '/#project', label: 'Project' },
  { to: '/about', label: 'About' },
];

export function Logo() {
  return (
    <Link to="/" className="flex items-center gap-2.5" aria-label={`${site.title} home`}>
      <span className="grid size-8 place-items-center rounded-lg bg-ink">
        <svg viewBox="0 0 20 20" className="size-4" aria-hidden="true">
          {[[2, 8, 4], [6, 5, 10], [10, 2, 16], [14, 6, 8]].map(([x, y, h]) => (
            <rect key={x} x={x} y={y} width="2.2" height={h} rx="1.1" fill="#fcfcfc" />
          ))}
        </svg>
      </span>
      <span className="text-[15px] font-semibold tracking-tight">
        {site.name}
        <span className="font-serif text-lg font-normal italic text-muted"> Journal</span>
      </span>
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const { pathname } = useLocation();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24));

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled || open ? 'bg-paper/80 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md' : ''
      }`}
    >
      <nav className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
        <Logo />
        <ul className="hidden items-center gap-1 md:flex">
          {links.map((l) => (
            <li key={l.to}>
              <NavLink
                to={l.to}
                className={({ isActive }) =>
                  `rounded-full px-4 py-2 text-sm transition-colors ${
                    isActive && !l.to.includes('#') ? 'font-medium text-ink' : 'text-muted hover:text-ink'
                  }`
                }
              >
                {l.label}
              </NavLink>
            </li>
          ))}
          <li className="ml-2">
            <Link to="/#subscribe" className="btn-dark px-4! py-2! text-sm">
              Subscribe
            </Link>
          </li>
        </ul>
        <button className="btn-icon md:hidden" onClick={() => setOpen((o) => !o)} aria-label="Menu" aria-expanded={open}>
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="border-t border-line px-4 pb-6 pt-2 md:hidden"
          >
            {[...links, { to: '/#subscribe', label: 'Subscribe' }].map((l) => (
              <li key={l.to}>
                <Link to={l.to} className="block py-3 font-serif text-2xl">
                  {l.label}
                </Link>
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
