import React from 'react';

const colorThemes = {
  emerald: {
    bg: 'bg-emerald-50/70',
    border: 'border-emerald-200/80',
    iconBg: 'bg-emerald-600',
    text: 'text-emerald-700',
    gradient: 'from-emerald-500/10 to-transparent',
  },
  amber: {
    bg: 'bg-amber-50/70',
    border: 'border-amber-200/80',
    iconBg: 'bg-amber-500',
    text: 'text-amber-700',
    gradient: 'from-amber-500/10 to-transparent',
  },
  red: {
    bg: 'bg-rose-50/70',
    border: 'border-rose-200/80',
    iconBg: 'bg-rose-600',
    text: 'text-rose-700',
    gradient: 'from-rose-500/10 to-transparent',
  },
  blue: {
    bg: 'bg-sky-50/70',
    border: 'border-sky-200/80',
    iconBg: 'bg-sky-600',
    text: 'text-sky-700',
    gradient: 'from-sky-500/10 to-transparent',
  },
  indigo: {
    bg: 'bg-indigo-50/70',
    border: 'border-indigo-200/80',
    iconBg: 'bg-indigo-600',
    text: 'text-indigo-700',
    gradient: 'from-indigo-500/10 to-transparent',
  },
  purple: {
    bg: 'bg-purple-50/70',
    border: 'border-purple-200/80',
    iconBg: 'bg-purple-600',
    text: 'text-purple-700',
    gradient: 'from-purple-500/10 to-transparent',
  },
};

const StatCard = ({
  title,
  value,
  subtitle,
  icon: Icon,
  color = 'emerald',
  trend,
  onClick,
}) => {
  const theme = colorThemes[color] || colorThemes.emerald;

  return (
    <div
      onClick={onClick}
      className={`relative overflow-hidden bg-white rounded-2xl border ${theme.border} p-5 shadow-xs hover:shadow-md transition-all duration-200 ${
        onClick ? 'cursor-pointer hover:-translate-y-0.5' : ''
      }`}
    >
      {/* Background soft ambient gradient */}
      <div
        className={`absolute -right-6 -bottom-6 w-32 h-32 rounded-full bg-gradient-to-br ${theme.gradient} blur-xl pointer-events-none`}
      />

      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <p className="text-xs font-semibold tracking-wider text-slate-500 uppercase">
            {title}
          </p>
          <h3 className="text-2xl font-bold tracking-tight text-slate-900">
            {value}
          </h3>
          {subtitle && (
            <p className="text-xs text-slate-500 font-medium">{subtitle}</p>
          )}
        </div>

        {Icon && (
          <div
            className={`w-12 h-12 rounded-xl ${theme.iconBg} flex items-center justify-center text-white shadow-sm shrink-0`}
          >
            <Icon className="w-6 h-6" />
          </div>
        )}
      </div>

      {trend && (
        <div className="mt-3 pt-3 border-t border-slate-100 flex items-center gap-1.5 text-xs">
          <span
            className={`font-semibold ${
              trend.positive ? 'text-emerald-600' : 'text-rose-600'
            }`}
          >
            {trend.value}
          </span>
          <span className="text-slate-500">{trend.label}</span>
        </div>
      )}
    </div>
  );
};

export default StatCard;

