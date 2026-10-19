import { useEffect, useRef, useState } from 'react';
import { Link, NavLink, useLocation } from 'react-router';
import { AnimatePresence, motion, useMotionValueEvent, useScroll } from 'motion/react';
import { Menu, X } from 'lucide-react';
import { site } from '../site.config.js';
import { BrandMark } from './Brand.jsx';

const links = [
  { to: '/journey', label: 'Journey' },
  { to: '/#project', label: 'Product' },
  { to: '/about', label: 'About' },
  { to: '/research', label: 'Read the research' },
];

const chat = { href: 'https://chat.voicelk.dev', label: 'Chat' };
const external = { target: '_blank', rel: 'noopener noreferrer' };

// The bars say a few syllables when the logo first appears, and again on hover.
export function Logo() {
  return (
    <Link to="/" className="group flex items-center" aria-label={`${site.title} home`}>
      <BrandMark wordmark voice="intro" className="h-8 w-auto" />
    </Link>
  );
}

export default function Navbar() {
  const [scrolled, setScrolled] = useState(false);
  const [open, setOpen] = useState(false);
  const menuButton = useRef(null);
  const { pathname } = useLocation();
  const { scrollY } = useScroll();
  useMotionValueEvent(scrollY, 'change', (v) => setScrolled(v > 24));

  const [lastPath, setLastPath] = useState(pathname);
  if (pathname !== lastPath) {
    setLastPath(pathname);
    setOpen(false);
  }

  useEffect(() => {
    if (!open) return undefined;
    const closeOnEscape = (event) => {
      if (event.key === 'Escape') {
        setOpen(false);
        menuButton.current?.focus();
      }
    };
    const desktop = window.matchMedia('(min-width: 48rem)');
    const closeOnDesktop = () => { if (desktop.matches) setOpen(false); };
    window.addEventListener('keydown', closeOnEscape);
    desktop.addEventListener('change', closeOnDesktop);
    return () => {
      window.removeEventListener('keydown', closeOnEscape);
      desktop.removeEventListener('change', closeOnDesktop);
    };
  }, [open]);

  return (
    <header
      className={`fixed inset-x-0 top-0 z-[100] transition-[background,box-shadow,backdrop-filter] duration-300 ${
        scrolled || open ? 'bg-paper/80 shadow-[0_1px_0_rgba(0,0,0,0.06)] backdrop-blur-md' : ''
      }`}
    >
      <nav aria-label="Main navigation" className="mx-auto flex h-16 max-w-7xl items-center justify-between px-4 sm:px-6">
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
            <a href={chat.href} {...external} className="btn-dark px-4! py-2! text-sm">
              {chat.label}
            </a>
          </li>
        </ul>
        <button ref={menuButton} type="button" className="btn-icon size-11! md:hidden" onClick={() => setOpen((o) => !o)} aria-label={open ? 'Close menu' : 'Open menu'} aria-expanded={open} aria-controls="mobile-navigation">
          {open ? <X className="size-5" /> : <Menu className="size-5" />}
        </button>
      </nav>

      <AnimatePresence>
        {open && (
          <motion.ul
            id="mobile-navigation"
            aria-label="Mobile navigation"
            initial={{ opacity: 0, y: -8 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -8 }}
            transition={{ duration: 0.2 }}
            className="max-h-[calc(100svh-4rem)] overflow-y-auto overscroll-contain border-t border-line bg-paper px-4 pb-6 pt-2 sm:px-6 md:hidden"
          >
            {[...links, chat].map((l) => (
              <li key={l.label}>
                {l.href ? (
                  <a href={l.href} {...external} onClick={() => setOpen(false)} className="block py-3 font-serif text-2xl">
                    {l.label}
                  </a>
                ) : (
                  <Link to={l.to} onClick={() => setOpen(false)} className="block py-3 font-serif text-2xl">
                    {l.label}
                  </Link>
                )}
              </li>
            ))}
          </motion.ul>
        )}
      </AnimatePresence>
    </header>
  );
}
