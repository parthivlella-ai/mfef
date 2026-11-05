import React, { useState } from 'react';

const TrendLineChart = ({
  data = [], // [{ month: '2026-06', count: 12 }, ...]
  labelKey = 'month',
  valueKey = 'count',
  title,
  subtitle,
  color = 'purple',
}) => {
  const [hoveredIdx, setHoveredIdx] = useState(null);

  if (!data || data.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center p-8 text-center text-xs text-slate-400">
        <p>No activity trend records logged yet</p>
      </div>
    );
  }

  const values = data.map((d) => Number(d[valueKey]) || 0);
  const maxValue = Math.max(...values, 5);

  const width = 360;
  const height = 140;
  const padding = 20;

  const points = data.map((d, idx) => {
    const x = padding + (idx / Math.max(data.length - 1, 1)) * (width - 2 * padding);
    const y = height - padding - ((Number(d[valueKey]) || 0) / maxValue) * (height - 2 * padding);
    return { x, y, data: d };
  });

  const pathD = points.reduce(
    (acc, pt, idx) => (idx === 0 ? `M ${pt.x} ${pt.y}` : `${acc} L ${pt.x} ${pt.y}`),
    ''
  );

  const fillD = `${pathD} L ${points[points.length - 1].x} ${height - padding} L ${points[0].x} ${height - padding} Z`;

  const strokeColor = color === 'purple' ? '#9333ea' : '#0d9488';
  const fillColor = color === 'purple' ? 'rgba(147, 51, 234, 0.15)' : 'rgba(13, 148, 136, 0.15)';

  return (
    <div className="space-y-3">
      {(title || subtitle) && (
        <div className="flex items-center justify-between pb-2 border-b border-slate-100">
          <div>
            {title && <h4 className="text-xs font-bold text-slate-800 uppercase tracking-wide">{title}</h4>}
            {subtitle && <p className="text-[11px] text-slate-400 mt-0.5">{subtitle}</p>}
          </div>
          {hoveredIdx !== null && data[hoveredIdx] && (
            <span className="text-xs font-bold px-2 py-0.5 rounded-full bg-purple-50 text-purple-700 border border-purple-200">
              {data[hoveredIdx][labelKey]}: {data[hoveredIdx][valueKey]} users
            </span>
          )}
        </div>
      )}

      <div className="relative">
        <svg viewBox={`0 0 ${width} ${height}`} className="w-full h-auto overflow-visible">
          {/* Subtle grid lines */}
          <line x1={padding} y1={padding} x2={width - padding} y2={padding} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={padding} y1={height / 2} x2={width - padding} y2={height / 2} stroke="#f1f5f9" strokeDasharray="3 3" />
          <line x1={padding} y1={height - padding} x2={width - padding} y2={height - padding} stroke="#cbd5e1" />

          {/* Area Fill */}
          <path d={fillD} fill={fillColor} />

          {/* Trend Line */}
          <path d={pathD} fill="none" stroke={strokeColor} strokeWidth="3" strokeLinecap="round" strokeLinejoin="round" />

          {/* Points */}
          {points.map((pt, idx) => (
            <g key={idx}>
              <circle
                cx={pt.x}
                cy={pt.y}
                r={hoveredIdx === idx ? 6 : 4}
                fill={hoveredIdx === idx ? strokeColor : '#ffffff'}
                stroke={strokeColor}
                strokeWidth="2.5"
                className="cursor-pointer transition-all"
                onMouseEnter={() => setHoveredIdx(idx)}
                onMouseLeave={() => setHoveredIdx(null)}
              />
            </g>
          ))}
        </svg>

        {/* X-axis labels */}
        <div className="flex justify-between text-[10px] text-slate-400 font-mono mt-1 px-1">
          {data.map((d, idx) => (
            <span key={idx}>{d[labelKey]}</span>
          ))}
        </div>
      </div>
    </div>
  );
};

export default TrendLineChart;

