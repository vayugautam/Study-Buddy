// Shared Framer Motion animation system tokens
export const duration = {
  instant: 0.1,
  fast: 0.15,
  normal: 0.2,
  moderate: 0.3,
  slow: 0.5,
  deliberate: 1.2,
}

export const ease = {
  standard: [0.4, 0, 0.2, 1],
  enter: [0, 0, 0.2, 1],
  exit: [0.4, 0, 1, 1],
  bounce: [0.34, 1.56, 0.64, 1],
  sharp: [0.4, 0, 0.6, 1],
}

export const spring = {
  gentle: { type: 'spring', stiffness: 60, damping: 14, mass: 1 },
  default: { type: 'spring', stiffness: 120, damping: 17, mass: 1 },
  snappy: { type: 'spring', stiffness: 300, damping: 24, mass: 1 },
  bouncy: { type: 'spring', stiffness: 40, damping: 8, mass: 1 },
}

export const variants = {
  fadeIn: {
    initial: { opacity: 0 },
    animate: { opacity: 1 },
    exit: { opacity: 0 },
    transition: { duration: duration.normal, ease: ease.enter },
  },
  fadeSlideUp: {
    initial: { opacity: 0, y: 12 },
    animate: { opacity: 1, y: 0 },
    exit: { opacity: 0, y: -8 },
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  scaleIn: {
    initial: { opacity: 0, scale: 0.95 },
    animate: { opacity: 1, scale: 1 },
    exit: { opacity: 0, scale: 0.97 },
    transition: { duration: duration.normal, ease: ease.bounce },
  },
  staggerContainer: {
    animate: {
      transition: { staggerChildren: 0.05, delayChildren: 0.08 },
    },
  },
  staggerItem: {
    initial: { opacity: 0, y: 16 },
    animate: { opacity: 1, y: 0 },
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  slideFromLeft: {
    initial: { opacity: 0, x: -20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: -20 },
    transition: { duration: duration.moderate, ease: ease.enter },
  },
  slideFromRight: {
    initial: { opacity: 0, x: 20 },
    animate: { opacity: 1, x: 0 },
    exit: { opacity: 0, x: 20 },
    transition: { duration: duration.moderate, ease: ease.enter },
  },
}

export const pageTransition = {
  initial: { opacity: 0, y: 12 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -8 },
  transition: { duration: duration.slow, ease: ease.enter },
}
