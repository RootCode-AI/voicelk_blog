import { motion } from 'motion/react';

// Fallback hero backdrop when no video is configured: a slow, breathing speech
// waveform. Only transform and opacity animate.
const BARS = 64;
const heights = Array.from({ length: BARS }, (_, i) => {
  const envelope = Math.sin((i / (BARS - 1)) * Math.PI);
  const texture = 0.55 + 0.45 * Math.abs(Math.sin(i * 1.7) * Math.cos(i * 0.45));
  return 0.12 + envelope * texture * 0.88;
});

export default function WaveBackdrop() {
  return (
    <div className="absolute inset-0 flex items-center justify-center overflow-hidden" aria-hidden="true">
      <div className="flex h-[70%] w-[120%] max-w-[1600px] items-center justify-between gap-[0.4%] opacity-[0.16]">
        {heights.map((h, i) => (
          <motion.span
            key={i}
            className="block w-full origin-center rounded-full bg-slate"
            style={{ height: `${h * 100}%` }}
            initial={{ scaleY: 0.2, opacity: 0 }}
            animate={{ scaleY: [0.55, 1, 0.7, 0.9, 0.55], opacity: 1 }}
            transition={{
              scaleY: { duration: 6 + (i % 7) * 0.6, repeat: Infinity, ease: 'easeInOut', delay: (i % 11) * 0.18 },
              opacity: { duration: 1.2, delay: i * 0.012 },
            }}
          />
        ))}
      </div>
    </div>
  );
}
