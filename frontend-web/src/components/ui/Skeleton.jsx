import React from 'react';
import { motion } from 'framer-motion';

export const Skeleton = ({ width = '100%', height = '20px', borderRadius = 'var(--radius-md)', className = '' }) => {
  return (
    <motion.div
      className={className}
      animate={{ opacity: [0.3, 0.7, 0.3] }}
      transition={{ duration: 1.5, repeat: Infinity, ease: "easeInOut" }}
      style={{
        width, height, borderRadius,
        background: 'rgba(255,255,255,0.1)'
      }}
    />
  );
};
