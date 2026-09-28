import { useEffect, useRef, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { Plus } from 'lucide-react';
import { BLOCKS } from '../../blocks/registry.js';

function Menu({ onPick, onClose }) {
  const ref = useRef(null);

  useEffect(() => {
    const onDown = (e) => ref.current && !ref.current.contains(e.target) && onClose();
    const onKey = (e) => e.key === 'Escape' && onClose();
    document.addEventListener('pointerdown', onDown);
    document.addEventListener('keydown', onKey);
    ref.current?.querySelector('button')?.focus();
    return () => {
      document.removeEventListener('pointerdown', onDown);
      document.removeEventListener('keydown', onKey);
    };
  }, [onClose]);

  return (
    <motion.div
      ref={ref}
      initial={{ opacity: 0, y: -6, scale: 0.98 }}
      animate={{ opacity: 1, y: 0, scale: 1 }}
      exit={{ opacity: 0, y: -4 }}
      transition={{ duration: 0.16 }}
      className="absolute left-1/2 top-full z-[200] mt-2 w-[min(36rem,calc(100vw-2rem))] -translate-x-1/2 rounded-xl border border-line bg-white p-2 shadow-soft"
      role="menu"
    >
      <div className="grid gap-1 sm:grid-cols-2">
        {BLOCKS.map(({ type, label, icon: Icon, hint }) => (
          <button
            key={type}
            type="button"
            role="menuitem"
            onClick={() => {
              onPick(type);
              onClose();
            }}
            className="flex items-start gap-3 rounded-lg p-2.5 text-left transition-colors hover:bg-wash focus-visible:bg-wash"
          >
            <span className="grid size-8 shrink-0 place-items-center rounded-md border border-line bg-paper">
              <Icon className="size-4 text-slate" />
            </span>
            <span>
              <span className="block text-sm font-medium text-ink">{label}</span>
              <span className="block text-xs text-muted">{hint}</span>
            </span>
          </button>
        ))}
      </div>
    </motion.div>
  );
}

// "inline" is the slim + that sits between blocks; "full" is the big button at
// the end of the post.
export default function AddBlockMenu({ onPick, variant = 'inline' }) {
  const [open, setOpen] = useState(false);
  const close = () => setOpen(false);

  if (variant === 'full') {
    return (
      <div className="relative">
        <button
          type="button"
          onClick={() => setOpen((o) => !o)}
          className="flex w-full items-center justify-center gap-2 rounded-xl border border-dashed border-line-strong py-5 text-sm font-medium text-slate transition-colors hover:border-ink hover:bg-white hover:text-ink"
          aria-expanded={open}
        >
          <Plus className="size-4" />
          Add block — text, image, graph, code, equation, audio…
        </button>
        <AnimatePresence>{open && <Menu onPick={onPick} onClose={close} />}</AnimatePresence>
      </div>
    );
  }

  return (
    <div className={`group/insert relative flex h-6 items-center justify-center ${open ? 'z-[150]' : ''}`}>
      <div
        className={`absolute inset-x-0 top-1/2 h-px bg-line-strong transition-opacity ${open ? 'opacity-100' : 'opacity-0 group-hover/insert:opacity-100'}`}
      />
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        className={`relative grid size-6 place-items-center rounded-full border border-line-strong bg-white text-muted shadow-card transition-all hover:border-ink hover:text-ink focus-visible:opacity-100 ${
          open ? 'opacity-100' : 'opacity-0 group-hover/insert:opacity-100'
        }`}
        aria-label="Insert a block here"
        aria-expanded={open}
      >
        <Plus className="size-3.5" />
      </button>
      <AnimatePresence>{open && <Menu onPick={onPick} onClose={close} />}</AnimatePresence>
    </div>
  );
}
