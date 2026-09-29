import React from 'react';
import { motion } from 'framer-motion';

export const EmptyState = ({ icon: Icon, title, description, action }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: 20 }}
      animate={{ opacity: 1, y: 0 }}
      className="glass-panel" 
      style={{ padding: '4rem 2rem', textAlign: 'center', borderRadius: 'var(--radius-2xl)', display: 'flex', flexDirection: 'column', alignItems: 'center' }}
    >
      {Icon && <Icon size={64} style={{ opacity: 0.3, marginBottom: '1.5rem', color: 'var(--color-text-secondary)' }} />}
      <h2 style={{ marginBottom: '1rem' }}>{title}</h2>
      {description && <p style={{ color: 'var(--color-text-secondary)', marginBottom: '2rem', maxWidth: '400px' }}>{description}</p>}
      {action}
    </motion.div>
  );
};
