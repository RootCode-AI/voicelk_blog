import { Link } from 'react-router';
import { motion, useScroll, useTransform } from 'motion/react';
import { ArrowUpRight } from 'lucide-react';
import { fadeUp, stagger } from './motion/Reveal.jsx';
import NewsletterForm from './NewsletterForm.jsx';
import WaveBackdrop from './WaveBackdrop.jsx';
import { useApi } from '../hooks/useApi.js';
import { site } from '../site.config.js';

const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO_URL;

export default function Hero() {
  const { data: stats } = useApi('/stats');
  const { scrollY } = useScroll();
  const backdropY = useTransform(scrollY, [0, 800], [0, 160]);
  const backdropOpacity = useTransform(scrollY, [0, 600], [1, 0.3]);

  return (
    <section className="relative isolate overflow-hidden">
      <motion.div className="absolute inset-0 -z-10" style={{ y: backdropY, opacity: backdropOpacity }}>
        {HERO_VIDEO ? (
          <video
            className="size-full -scale-y-100 object-cover"
            src={HERO_VIDEO}
            autoPlay
            muted
            loop
            playsInline
            aria-hidden="true"
          />
        ) : (
          <WaveBackdrop />
        )}
        {/* White wash so the headline always sits on a calm surface. */}
        <div className="absolute inset-0 bg-linear-to-b from-transparent from-[26.416%] to-paper to-[66.943%]" />
      </motion.div>

      <motion.div
        className="mx-auto flex max-w-5xl flex-col items-center px-4 pb-24 pt-36 text-center sm:px-6 md:pt-52 lg:pt-[290px]"
        initial="hidden"
        animate="show"
        variants={stagger(0.1)}
      >
        <motion.div variants={fadeUp}>
          <div className="inline-flex items-center gap-3 rounded-full border border-line bg-white/80 py-1.5 pl-1.5 pr-4 text-sm shadow-card backdrop-blur">
            <span className="flex -space-x-1.5">
              {['සි', 'En', 'ද'].map((glyph) => (
                <span
                  key={glyph}
                  className="grid size-7 place-items-center rounded-full border-2 border-white bg-ink text-[12px] font-medium text-paper"
                >
                  {glyph}
                </span>
              ))}
            </span>
            <span className="text-slate">
              {stats?.posts ? (
                <>
                  <strong className="font-semibold text-ink">{stats.posts}</strong> research{' '}
                  {stats.posts === 1 ? 'note' : 'notes'} published
                </>
              ) : (
                'Final-year research journal'
              )}
            </span>
          </div>
        </motion.div>

        <h1 className="mt-8">
          <motion.span
            variants={fadeUp}
            className="block text-[clamp(2.6rem,7vw,5rem)] font-medium leading-[1.02] tracking-[-0.045em] text-ink"
          >
            Teaching a voice to speak
          </motion.span>
          <motion.span
            variants={fadeUp}
            className="mt-1 block font-serif text-[clamp(3rem,9vw,6.25rem)] italic leading-[0.95] tracking-[-0.02em] text-slate"
          >
            Sinhala &amp; English.
          </motion.span>
        </h1>

        <motion.p variants={fadeUp} className="mt-8 max-w-xl text-[17px] leading-relaxed text-muted">
          {site.tagline}
        </motion.p>

        <motion.div variants={fadeUp} className="mt-10 w-full max-w-md" id="subscribe">
          <NewsletterForm />
        </motion.div>

        <motion.div variants={fadeUp} className="mt-6">
          <Link to="/blog" className="group inline-flex items-center gap-1.5 text-sm font-medium text-slate hover:text-ink">
            Read the journal
            <ArrowUpRight className="size-4 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5" />
          </Link>
        </motion.div>
      </motion.div>
    </section>
  );
}
