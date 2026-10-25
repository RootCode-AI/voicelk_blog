import { motion, useScroll, useTransform } from 'motion/react';
import { fadeUp, stagger } from './motion/Reveal.jsx';
import NewsletterForm from './NewsletterForm.jsx';
import WaveBackdrop from './WaveBackdrop.jsx';
import { site } from '../site.config.js';

const HERO_VIDEO = import.meta.env.VITE_HERO_VIDEO_URL;

export default function Hero() {
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

      {/* A viewport-height hero centers the introduction below the fixed navbar.
          Minimum height (not fixed height) lets short screens scroll naturally. */}
      <motion.div
        className="hero-content mx-auto flex max-w-5xl flex-col items-center px-4 text-center sm:px-6"
        initial="hidden"
        animate="show"
        variants={stagger(0.1)}
      >
        <motion.div variants={fadeUp}>
          <div className="inline-flex max-w-full items-center gap-2 rounded-full border border-line bg-white/80 py-1.5 pl-1.5 pr-3 text-xs shadow-card backdrop-blur sm:gap-3 sm:pr-4 sm:text-sm">
            <span className="flex shrink-0 -space-x-1.5" aria-hidden="true">
              {['සිං', 'EN'].map((glyph) => (
                <span
                  key={glyph}
                  className="grid size-7 place-items-center rounded-full border-2 border-white bg-ink text-[12px] font-medium text-paper"
                >
                  {glyph}
                </span>
              ))}
            </span>
            <span className="text-slate">
              Sinhala–English text to speech
            </span>
          </div>
        </motion.div>

        <h1 className="hero-heading w-full">
          <motion.span
            variants={fadeUp}
            className="hero-title block font-medium leading-[1.05] tracking-[-0.045em] text-ink"
          >
            {site.heroHeadline}
          </motion.span>
          <motion.span
            variants={fadeUp}
            className="hero-subtitle mt-2 block font-serif italic leading-[1.02] tracking-[-0.02em] text-slate"
          >
            {site.heroSubheading}
          </motion.span>
        </h1>

        <motion.p variants={fadeUp} className="hero-description max-w-xl text-sm leading-relaxed text-muted sm:text-[15px]">
          {site.tagline}
        </motion.p>

        <motion.div variants={fadeUp} className="hero-subscribe w-full max-w-md scroll-mt-24" id="subscribe">
          <NewsletterForm />
        </motion.div>
      </motion.div>
    </section>
  );
}
