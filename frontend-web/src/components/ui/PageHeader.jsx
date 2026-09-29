import React from 'react';
import { motion } from 'framer-motion';

export const PageHeader = ({ title, icon: Icon, action, className = '' }) => {
  return (
    <motion.div 
      initial={{ opacity: 0, y: -10 }} animate={{ opacity: 1, y: 0 }}
      className={className}
      style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '2rem', flexWrap: 'wrap', gap: '1rem' }}
    >
      <div style={{ display: 'flex', alignItems: 'center', gap: '1rem' }}>
        {Icon && (
          <div style={{ padding: '0.75rem', background: 'var(--color-primary-light)', borderRadius: 'var(--radius-lg)', color: 'var(--color-primary)' }}>
            <Icon size={24} />
          </div>
        )}
        <h1 className="text-gradient" style={{ margin: 0, fontSize: 'var(--font-size-3xl)', fontWeight: 'var(--font-weight-black)' }}>{title}</h1>
      </div>
      {action && <div>{action}</div>}
    </motion.div>
  );
};
