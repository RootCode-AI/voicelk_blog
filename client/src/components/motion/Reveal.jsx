import { motion } from 'motion/react';

export const EASE_OUT = [0.22, 1, 0.36, 1];

// Entry motion from the design spec: fade + 16px rise over 540ms, and a 120ms
// cascade between siblings.
export const fadeUp = {
  hidden: { opacity: 0, y: 16 },
  show: { opacity: 1, y: 0, transition: { duration: 0.54, ease: EASE_OUT } },
};

export const stagger = (delayChildren = 0) => ({
  hidden: {},
  show: { transition: { staggerChildren: 0.12, delayChildren } },
});

export function Reveal({ as = 'div', delay = 0, className, children, ...rest }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      variants={{
        hidden: fadeUp.hidden,
        show: { ...fadeUp.show, transition: { ...fadeUp.show.transition, delay } },
      }}
      {...rest}
    >
      {children}
    </Component>
  );
}

export function RevealGroup({ as = 'div', className, children, delay = 0, ...rest }) {
  const Component = motion[as];
  return (
    <Component
      className={className}
      initial="hidden"
      whileInView="show"
      viewport={{ once: true, margin: '0px 0px -80px 0px' }}
      variants={stagger(delay)}
      {...rest}
    >
      {children}
    </Component>
  );
}
