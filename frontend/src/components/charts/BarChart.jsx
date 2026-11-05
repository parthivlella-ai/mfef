import React, { useState } from 'react';

const BarChart = ({
  data = [],
  dataKey = 'count',
  labelKey = 'category',
  title,
  subtitle,
  color = 'teal', // 'teal', 'purple', 'blue', 'emerald'
  height = 200,
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
        <p>No chart data available</p>
      </div>
    );
  }

  const maxValue = Math.max(...data.map((item) => Number(item[dataKey]) || 0), 1);

  const colorGradients = {
    teal: {
      bar: 'bg-teal-500 hover:bg-teal-600',
      active: 'bg-teal-600',
      badge: 'text-teal-700 bg-teal-50 border-teal-200',
    },
    purple: {
      bar: 'bg-purple-500 hover:bg-purple-600',
      active: 'bg-purple-600',
      badge: 'text-purple-700 bg-purple-50 border-purple-200',
    },
    blue: {
      bar: 'bg-blue-500 hover:bg-blue-600',
      active: 'bg-blue-600',
      badge: 'text-blue-700 bg-blue-50 border-blue-200',
    },
    emerald: {
      bar: 'bg-emerald-500 hover:bg-emerald-600',
      active: 'bg-emerald-600',
      badge: 'text-emerald-700 bg-emerald-50 border-emerald-200',
    },
  };

  const scheme = colorGradients[color] || colorGradients.teal;

  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            {title && <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</h4>}
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {hoveredIdx !== null && data[hoveredIdx] && (
            <span className={`text-xs font-bold px-2 py-0.5 rounded-full border ${scheme.badge}`}>
              {data[hoveredIdx][labelKey]}: {data[hoveredIdx][dataKey]}
            </span>
          )}
        </div>
      )}

      <div className="space-y-2.5 pt-1">
        {data.slice(0, 7).map((item, idx) => {
          const val = Number(item[dataKey]) || 0;
          const pct = Math.max(4, Math.round((val / maxValue) * 100));
          const isHovered = hoveredIdx === idx;

          return (
            <div
              key={idx}
              onMouseEnter={() => setHoveredIdx(idx)}
              onMouseLeave={() => setHoveredIdx(null)}
              className="space-y-1 group cursor-pointer"
            >
              <div className="flex items-center justify-between text-xs">
                <span className="font-semibold text-slate-700 truncate max-w-[180px] group-hover:text-slate-900 transition">
                  {item[labelKey]}
                </span>
                <span className="text-[11px] font-mono text-slate-500">
                  {val} {item.percentage !== undefined ? `(${item.percentage}%)` : ''}
                </span>
              </div>

              <div className="w-full h-3 bg-slate-100 rounded-full overflow-hidden p-0.5">
                <div
                  className={`h-full rounded-full transition-all duration-500 ${
                    isHovered ? scheme.active : scheme.bar
                  }`}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};

export default BarChart;

