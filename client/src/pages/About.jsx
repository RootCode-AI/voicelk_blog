import { useState } from 'react';
import { motion } from 'motion/react';
import { Loader2, Send } from 'lucide-react';
import { Reveal, fadeUp, stagger } from '../components/motion/Reveal.jsx';
import Seo from '../components/Seo.jsx';
import { api } from '../lib/api.js';
import { site } from '../site.config.js';
import { Link } from 'react-router';

function ContactForm() {
  const [form, setForm] = useState({ name: '', email: '', message: '', website: '' });
  const [state, setState] = useState({ status: 'idle', errors: {} });
  const set = (key) => (e) => setForm((f) => ({ ...f, [key]: e.target.value }));

  async function submit(event) {
    event.preventDefault();
    setState({ status: 'sending', errors: {} });
    try {
      await api.post('/contact', form);
      setState({ status: 'sent', errors: {} });
      setForm({ name: '', email: '', message: '', website: '' });
    } catch (err) {
      setState({ status: 'error', message: err.message, errors: err.details ?? {} });
    }
  }

  if (state.status === 'sent') {
    return (
      <div className="card p-8 text-center">
        <p className="font-serif text-3xl">Thank you.</p>
        <p className="mt-2 text-muted">Your message reached us — we will reply by email.</p>
      </div>
    );
  }

  const error = (key) =>
    state.errors[key] && (
      <p className="mt-1.5 text-sm text-danger" id={`${key}-error`}>
        {state.errors[key]}
      </p>
    );

  return (
    <form onSubmit={submit} className="card space-y-5 p-6 sm:p-8" noValidate>
      <div className="grid gap-5 sm:grid-cols-2">
        <div>
          <label className="field-label" htmlFor="contact-name">Name</label>
          <input id="contact-name" className="field" value={form.name} onChange={set('name')} aria-describedby="name-error" />
          {error('name')}
        </div>
        <div>
          <label className="field-label" htmlFor="contact-email">Email</label>
          <input id="contact-email" type="email" className="field" value={form.email} onChange={set('email')} aria-describedby="email-error" />
          {error('email')}
        </div>
      </div>
      <div>
        <label className="field-label" htmlFor="contact-message">Message</label>
        <textarea id="contact-message" rows={6} className="field" value={form.message} onChange={set('message')} aria-describedby="message-error" />
        {error('message')}
      </div>
      {/* Honeypot: hidden from people, filled in by bots. */}
      <input type="text" name="website" value={form.website} onChange={set('website')} tabIndex={-1} autoComplete="off" className="hidden" aria-hidden="true" />
      {state.status === 'error' && !Object.keys(state.errors).length && <p className="text-sm text-danger">{state.message}</p>}
      <button type="submit" className="btn-dark" disabled={state.status === 'sending'}>
        {state.status === 'sending' ? <Loader2 className="size-4 animate-spin" /> : <Send className="size-4" />}
        Send message
      </button>
      <p className="text-xs leading-relaxed text-muted">We use your name, email and message to respond to this enquiry. <Link to="/privacy" className="underline">Read our Privacy Policy</Link>.</p>
    </form>
  );
}

export default function About() {
  return (
    <div className="mx-auto max-w-6xl px-4 pb-[clamp(4rem,8vw,8rem)] pt-36 sm:px-6 md:pt-44">
      <Seo
        title="About VoiceLK"
        description="Meet VoiceLK, a Sinhala-English text-to-speech product developed from research at Rajarata University of Sri Lanka."
        path="/about"
      />      <motion.header initial="hidden" animate="show" variants={stagger()} className="max-w-3xl">
        <motion.p variants={fadeUp} className="eyebrow mb-4">About</motion.p>
        <motion.h1 variants={fadeUp} className="font-serif text-[clamp(3rem,8vw,5.5rem)] leading-[0.95] tracking-[-0.02em]">
          A voice for the way <em className="text-slate">Sri Lanka talks.</em>
        </motion.h1>
        <motion.p variants={fadeUp} className="mt-8 max-w-2xl text-[17px] leading-relaxed text-slate">
          Everyday Sinhala slips into English and back again mid-sentence. Most speech synthesisers read one language at a
          time and stumble on the other. VoiceLK is a text-to-speech product built for this mixed-language way of speaking.
          It grew out of research at {site.university}. Here you can follow the product journey, explore the research
          behind it, and see how findings shape the product.
        </motion.p>
      </motion.header>

      {site.team.length > 0 && (
        <section className="mt-24">
          <Reveal>
            <h2 className="font-serif text-4xl">The team</h2>
          </Reveal>
          <ul className="mt-8 grid gap-4 sm:grid-cols-2">
            {site.team.map((m) => (
              <Reveal as="li" key={m.name} className="card flex items-center justify-between gap-4 p-5">
                <div>
                  <p className="font-medium">{m.name}</p>
                  <p className="text-sm text-muted">{m.role}</p>
                </div>
                {m.url && (
                  <a href={m.url} target="_blank" rel="noreferrer" className="text-sm text-slate underline-offset-2 hover:underline">
                    Profile
                  </a>
                )}
              </Reveal>
            ))}
          </ul>
        </section>
      )}

      <section id="contact" className="mt-24 scroll-mt-24 grid gap-10 md:grid-cols-[1fr_1.3fr]">
        <Reveal>
          <h2 className="font-serif text-[clamp(2.25rem,5vw,3.25rem)] leading-[1.02]">
            Say <em>hello</em>
          </h2>
          <p className="mt-4 max-w-sm leading-relaxed text-slate">
            Questions about VoiceLK, feedback on speech output, or ideas for the product? Get in touch.
          </p>
          <a href={`mailto:${site.contactEmail}`} className="mt-4 inline-block text-sm underline">{site.contactEmail}</a>
        </Reveal>
        <Reveal delay={0.12}>
          <ContactForm />
        </Reveal>
      </section>
    </div>
  );
}
