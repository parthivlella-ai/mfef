import React from 'react';

const Badge = ({ children, variant = 'neutral', size = 'md', className = '' }) => {
  const sizeClasses = {
    sm: 'px-2 py-0.5 text-xs',
    md: 'px-2.5 py-1 text-xs font-medium',
    lg: 'px-3 py-1.5 text-sm font-medium',
  };

  const variantClasses = {
    // Expiry & Stock statuses
    safe: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    success: 'bg-emerald-50 text-emerald-700 border border-emerald-200/80',
    warning: 'bg-amber-50 text-amber-700 border border-amber-200/80',
    critical: 'bg-orange-50 text-orange-700 border border-orange-200/80',
    expired: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    danger: 'bg-rose-50 text-rose-700 border border-rose-200/80',
    disposed: 'bg-slate-100 text-slate-700 border border-slate-300',
    low_stock: 'bg-purple-50 text-purple-700 border border-purple-200/80 font-medium',
    lowStock: 'bg-purple-50 text-purple-700 border border-purple-200/80 font-medium',
    
    // Roles
    admin: 'bg-purple-50 text-purple-700 border border-purple-200 font-semibold',
    user: 'bg-teal-50 text-teal-700 border border-teal-200 font-semibold',
    pharmacist: 'bg-teal-50 text-teal-700 border border-teal-200 font-semibold',
    staff: 'bg-blue-50 text-blue-700 border border-blue-200 font-semibold',

    // Neutrals
    neutral: 'bg-slate-100 text-slate-700 border border-slate-200',
    outline: 'border border-slate-300 text-slate-700 bg-transparent',
  };

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full ${
        sizeClasses[size] || sizeClasses.md
      } ${variantClasses[variant] || variantClasses.neutral} ${className}`}
    >
      <span className="w-1.5 h-1.5 rounded-full bg-current opacity-70 shrink-0" />
      {children}
    </span>
  );
};

export default Badge;

