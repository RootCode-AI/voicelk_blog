import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';
import { Link } from 'react-router';

// The pill-shaped subscribe field from the hero: 40px radius, soft shadow,
// dark CTA nested inside.
export default function NewsletterForm({ className = '', onDark = false }) {
  const inputId = useId();
  const [email, setEmail] = useState('');
  const [state, setState] = useState({ status: 'idle', message: '' });

  async function submit(event) {
    event.preventDefault();
    setState({ status: 'loading', message: '' });
    try {
      const res = await api.post('/subscribers', { email });
      setState({ status: 'done', message: res.message });
      setEmail('');
    } catch (err) {
      setState({ status: 'error', message: err.message });
    }
  }

  return (
    <div className={className}>
      <form
        onSubmit={submit}
        className="flex w-full items-center gap-2 rounded-[40px] border border-line bg-white p-1.5 pl-5 shadow-soft"
      >
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@university.lk"
          className="min-w-0 flex-1 bg-transparent py-2 text-[15px] outline-none placeholder:text-[#9a9ca6] focus-visible:outline-none"
          disabled={state.status === 'loading'}
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          aria-label={state.status === 'done' ? 'Subscribed to research updates' : 'Subscribe to research updates'}
          className="btn-dark shrink-0"
          disabled={state.status === 'loading'}
        >
          {state.status === 'loading' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : state.status === 'done' ? (
            <Check className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          <span className="hidden sm:inline">{state.status === 'done' ? 'Subscribed' : 'Subscribe'}</span>
        </motion.button>
      </form>
      <p className={`mt-3 px-2 text-xs leading-relaxed ${onDark ? 'text-white/80' : 'text-muted'}`}>Subscribe for research updates. Unsubscribe any time. <Link to="/privacy" className="underline">Privacy Policy</Link></p>
      <AnimatePresence mode="wait">
        {state.message && (
          <motion.p
            key={state.message}
            initial={{ opacity: 0, y: -4 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0 }}
            className={`mt-3 px-5 text-sm ${
              state.status === 'error' ? (onDark ? 'text-[#ff9d9d]' : 'text-danger') : onDark ? 'text-[#d6d7dc]' : 'text-slate'
            }`}
            role={state.status === 'error' ? 'alert' : 'status'}
          >
            {state.message}
          </motion.p>
        )}
      </AnimatePresence>
    </div>
  );
}
