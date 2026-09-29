import React from 'react';
import { motion } from 'framer-motion';

export const Button = ({ children, variant = 'primary', className = '', ...props }) => {
  const baseStyle = "btn";
  const variantStyle = variant === 'primary' ? "btn-primary" : variant === 'outline' ? "btn-outline" : "";
  return (
    <motion.button 
      whileHover={{ scale: 1.02 }} 
      whileTap={{ scale: 0.98 }} 
      className={`${baseStyle} ${variantStyle} ${className}`} 
      {...props}
    >
      {children}
    </motion.button>
  );
};
