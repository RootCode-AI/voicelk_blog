import { useId, useState } from 'react';
import { AnimatePresence, motion } from 'motion/react';
import { ArrowRight, Check, Loader2 } from 'lucide-react';
import { api } from '../lib/api.js';

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
    <div className={`newsletter-container min-w-0 ${className}`}>
      <form
        onSubmit={submit}
        className="newsletter-form flex w-full min-w-0 gap-2 border border-line bg-white shadow-soft focus-within:ring-2 focus-within:ring-ink/30"
      >
        <label htmlFor={inputId} className="sr-only">
          Email address
        </label>
        <input
          id={inputId}
          type="email"
          autoComplete="email"
          name="email"
          required
          value={email}
          onChange={(e) => setEmail(e.target.value)}
          placeholder="you@example.com"
          className="min-h-11 min-w-0 flex-1 bg-transparent py-2 text-base text-ink outline-none placeholder:text-[#9a9ca6] focus-visible:outline-none"
          disabled={state.status === 'loading'}
        />
        <motion.button
          whileHover={{ scale: 1.03 }}
          whileTap={{ scale: 0.98 }}
          type="submit"
          aria-label={state.status === 'done' ? 'Subscribed to VoiceLK updates' : 'Subscribe to VoiceLK updates'}
          className="btn-dark min-h-11 shrink-0 px-4!"
          disabled={state.status === 'loading'}
        >
          {state.status === 'loading' ? (
            <Loader2 className="size-4 animate-spin" />
          ) : state.status === 'done' ? (
            <Check className="size-4" />
          ) : (
            <ArrowRight className="size-4" />
          )}
          <span>{state.status === 'done' ? 'Subscribed' : 'Subscribe'}</span>
        </motion.button>
      </form>
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
