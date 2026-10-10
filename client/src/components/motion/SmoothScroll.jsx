import { createContext, useCallback, useContext, useLayoutEffect, useRef, useSyncExternalStore } from 'react';
import { motion, useScroll, useSpring, useTransform } from 'motion/react';
import { useLocation } from 'react-router';

// Smooth scrolling with Framer Motion. The page keeps its native scrollbar (the
// body is sized to the content), but what you see is a fixed layer that follows
// the scroll position through a spring, so wheel steps glide instead of jump.
// Touch devices already scroll with momentum, and people who ask for reduced
// motion get the native behaviour, so both skip the spring.
//
// Because the content layer is transformed, `position: fixed` and `sticky` do not
// work inside it — overlays render through <Portal> instead.

const SPRING = { stiffness: 120, damping: 20, mass: 0.35, restDelta: 0.5 };
const NAV_OFFSET = 96;

const ScrollContext = createContext({ scrollToId: () => {} });
export const useSmoothScroll = () => useContext(ScrollContext);

const query = '(min-width: 64rem) and (hover: hover) and (pointer: fine) and (prefers-reduced-motion: no-preference)';
function subscribe(callback) {
  const mql = window.matchMedia(query);
  mql.addEventListener('change', callback);
  return () => mql.removeEventListener('change', callback);
}
const useSmoothEnabled = () =>
  useSyncExternalStore(subscribe, () => window.matchMedia(query).matches, () => false);

export default function SmoothScroll({ children }) {
  const enabled = useSmoothEnabled();
  const contentRef = useRef(null);
  const { pathname } = useLocation();

  const { scrollY } = useScroll();
  const target = useTransform(scrollY, (v) => -v);
  const y = useSpring(target, SPRING);

  useLayoutEffect(() => {
    if (!enabled || !contentRef.current) return undefined;
    const observer = new ResizeObserver(([entry]) => {
      document.body.style.height = `${entry.borderBoxSize?.[0]?.blockSize ?? entry.contentRect.height}px`;
    });
    observer.observe(contentRef.current);
    y.jump(-window.scrollY);
    return () => {
      observer.disconnect();
      document.body.style.height = '';
    };
  }, [enabled, y]);

  // A new page starts at the top without sweeping past the old one.
  useLayoutEffect(() => {
    window.scrollTo(0, 0);
    y.jump(0);
  }, [pathname, y]);

  const scrollToId = useCallback(
    (id) => {
      const el = document.getElementById(id);
      if (!el) return;
      const offset = enabled ? el.getBoundingClientRect().top - y.get() : el.getBoundingClientRect().top + window.scrollY;
      window.scrollTo({ top: offset - NAV_OFFSET, behavior: enabled ? 'instant' : 'smooth' });
      history.replaceState(null, '', `#${id}`);
    },
    [enabled, y],
  );

  return (
    <ScrollContext.Provider value={{ scrollToId }}>
      {enabled ? (
        <motion.div
          ref={contentRef}
          style={{ y, position: 'fixed', top: 0, left: 0, right: 0, willChange: 'transform' }}
          className="flow-root"
        >
          {children}
        </motion.div>
      ) : (
        <div className="flow-root">{children}</div>
      )}
    </ScrollContext.Provider>
  );
}
