import React from 'react';
import { motion } from 'framer-motion';

export const Card = ({ children, className = '', hover = false, ...props }) => {
  return (
    <motion.div 
      className={`glass-panel ${className}`} 
      style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)' }}
      whileHover={hover ? { y: -5, boxShadow: 'var(--shadow-lg)' } : {}}
      {...props}
    >
      {children}
    </motion.div>
  );
};
