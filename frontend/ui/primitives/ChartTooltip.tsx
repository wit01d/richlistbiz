import React from 'react';

export interface ChartTooltipProps {
  active?: boolean;
  payload?: Array<{ name: string; value: number; color: string }>;
  label?: string;
  formatValue?: (name: string, value: number) => string | number;
}

export const ChartTooltip: React.FC<ChartTooltipProps> = ({
  active,
  payload,
  label,
  formatValue,
}) => {
  if (!active || !payload) return null;

  return (
    <div className="bg-black/90 backdrop-blur-xl border border-white/10 rounded-lg p-3 shadow-xl">
      {label && <p className="text-gray-400 text-xs mb-2">{label}</p>}
      {payload.map((entry, index) => (
        <p key={index} className="text-sm" style={{ color: entry.color }}>
          {entry.name}: {formatValue ? formatValue(entry.name, entry.value) : entry.value}
        </p>
      ))}
    </div>
  );
};
