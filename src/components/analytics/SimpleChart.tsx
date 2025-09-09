'use client';

import { useMemo } from 'react';

interface DataPoint {
  date: string;
  value: number;
}

interface SimpleChartProps {
  data: DataPoint[];
  title: string;
  color?: string;
  height?: number;
  type?: 'line' | 'bar';
}

export default function SimpleChart({ 
  data, 
  title, 
  color = '#3b82f6',
  height = 200,
  type = 'line'
}: SimpleChartProps) {
  const { maxValue, minValue, points, bars } = useMemo(() => {
    if (data.length === 0) return { maxValue: 0, minValue: 0, points: '', bars: [] };

    const values = data.map(d => d.value);
    const max = Math.max(...values);
    const min = Math.min(...values);
    const range = max - min || 1;

    if (type === 'line') {
      const points = data
        .map((point, index) => {
          const x = (index / (data.length - 1)) * 100;
          const y = 100 - ((point.value - min) / range) * 100;
          return `${x},${y}`;
        })
        .join(' ');

      return { maxValue: max, minValue: min, points, bars: [] };
    } else {
      const bars = data.map((point, index) => {
        const x = (index / data.length) * 100;
        const width = (1 / data.length) * 80; // 80% to leave some gap
        const height = ((point.value - min) / range) * 100;
        const y = 100 - height;

        return {
          x: `${x + (100 / data.length) * 0.1}%`, // 10% offset for centering
          y: `${y}%`,
          width: `${width}%`,
          height: `${height}%`,
          value: point.value,
        };
      });

      return { maxValue: max, minValue: min, points: '', bars };
    }
  }, [data, type]);

  if (data.length === 0) {
    return (
      <div className="bg-white rounded-lg border p-6">
        <h3 className="text-lg font-semibold mb-4">{title}</h3>
        <div className="flex items-center justify-center h-48 text-gray-500">
          No data available
        </div>
      </div>
    );
  }

  return (
    <div className="bg-white rounded-lg border p-6">
      <div className="flex justify-between items-center mb-4">
        <h3 className="text-lg font-semibold">{title}</h3>
        <div className="text-sm text-gray-500">
          Max: {maxValue.toLocaleString()}
        </div>
      </div>

      <div className="relative" style={{ height: `${height}px` }}>
        <svg
          width="100%"
          height="100%"
          viewBox="0 0 100 100"
          preserveAspectRatio="none"
          className="absolute inset-0"
        >
          {type === 'line' ? (
            <>
              {/* Grid lines */}
              <defs>
                <pattern
                  id="grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#grid)" />

              {/* Line */}
              <polyline
                fill="none"
                stroke={color}
                strokeWidth="2"
                points={points}
                vectorEffect="non-scaling-stroke"
              />

              {/* Dots */}
              {data.map((point, index) => {
                const x = (index / (data.length - 1)) * 100;
                const y = 100 - ((point.value - minValue) / (maxValue - minValue || 1)) * 100;
                return (
                  <circle
                    key={index}
                    cx={x}
                    cy={y}
                    r="1.5"
                    fill={color}
                    vectorEffect="non-scaling-stroke"
                  />
                );
              })}
            </>
          ) : (
            <>
              {/* Grid lines */}
              <defs>
                <pattern
                  id="bar-grid"
                  width="10"
                  height="10"
                  patternUnits="userSpaceOnUse"
                >
                  <path
                    d="M 10 0 L 0 0 0 10"
                    fill="none"
                    stroke="#f3f4f6"
                    strokeWidth="0.5"
                  />
                </pattern>
              </defs>
              <rect width="100" height="100" fill="url(#bar-grid)" />

              {/* Bars */}
              {bars.map((bar, index) => (
                <rect
                  key={index}
                  x={bar.x}
                  y={bar.y}
                  width={bar.width}
                  height={bar.height}
                  fill={color}
                  opacity="0.8"
                />
              ))}
            </>
          )}
        </svg>

        {/* Tooltip on hover would go here in a more advanced implementation */}
      </div>

      {/* X-axis labels */}
      <div className="flex justify-between mt-2 text-xs text-gray-500">
        <span>{data[0]?.date}</span>
        <span>{data[Math.floor(data.length / 2)]?.date}</span>
        <span>{data[data.length - 1]?.date}</span>
      </div>
    </div>
  );
}
