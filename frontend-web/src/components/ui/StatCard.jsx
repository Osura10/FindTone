import React from 'react';
import { motion } from 'framer-motion';

export const StatCard = ({ title, value, icon: Icon, color = 'var(--color-primary)' }) => {
  return (
    <motion.div 
      whileHover={{ y: -4 }}
      className="glass-panel" 
      style={{ padding: '1.5rem', borderRadius: 'var(--radius-xl)', display: 'flex', alignItems: 'center', gap: '1.5rem' }}
    >
      <div style={{ padding: '1rem', background: `rgba(255,255,255,0.05)`, borderRadius: 'var(--radius-xl)', color }}>
        {Icon && <Icon size={32} />}
      </div>
      <div>
        <div style={{ color: 'var(--color-text-secondary)', fontSize: 'var(--font-size-sm)', textTransform: 'uppercase', letterSpacing: '1px', marginBottom: '0.25rem' }}>
          {title}
        </div>
        <div style={{ fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-black)' }}>
          {value}
        </div>
      </div>
    </motion.div>
  );
};
