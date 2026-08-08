import React from 'react';

const GlassCard = ({ children, className = '' }) => {
  return (
    <div className={`glass-panel p-8 w-full max-w-md mx-auto ${className}`}>
      {children}
    </div>
  );
};

export default GlassCard;