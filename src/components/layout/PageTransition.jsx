import React from 'react';
import { motion } from 'framer-motion';

const variants = {
  initial: { opacity: 0, y: 10 },
  animate: { opacity: 1, y: 0 },
  exit: { opacity: 0, y: -5 }
};

/**
 * Framer Motion page transition wrapper.
 * Fade in + subtle translateY over 400ms with staggered children.
 */
export default function PageTransition({ children }) {
  return (
    <motion.div
      variants={variants}
      initial="initial"
      animate="animate"
      exit="exit"
      transition={{ duration: 0.35, ease: [0.4, 0, 0.2, 1] }}
      style={{ minHeight: '100%' }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Staggered container for animating child elements in sequence.
 */
export function StaggerContainer({ children, stagger = 0.08 }) {
  return (
    <motion.div
      initial="hidden"
      animate="visible"
      variants={{
        hidden: {},
        visible: { transition: { staggerChildren: stagger } }
      }}
    >
      {children}
    </motion.div>
  );
}

/**
 * Individual stagger item — used inside StaggerContainer.
 */
export function StaggerItem({ children }) {
  return (
    <motion.div
      variants={{
        hidden: { opacity: 0, y: 12 },
        visible: { opacity: 1, y: 0, transition: { duration: 0.3, ease: [0.4, 0, 0.2, 1] } }
      }}
    >
      {children}
    </motion.div>
  );
}
