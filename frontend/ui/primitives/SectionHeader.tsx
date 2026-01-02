// =============================================================================
// SECTION HEADER COMPONENT
// Reusable header for dashboard sections with icon, title, and subtitle
// =============================================================================

import type { LucideIcon } from 'lucide-react';
import React from 'react';

export interface SectionHeaderProps {
  icon: LucideIcon;
  title: string;
  subtitle?: string;
  /** Color theme for icon background and text */
  colorTheme?: 'pink' | 'emerald' | 'purple' | 'blue';
  /** Icon size (default: 20) */
  iconSize?: number;
  /** Use larger variant (for main sections) */
  large?: boolean;
}

const colorThemes = {
  pink: {
    bg: 'bg-neon-pink/20',
    text: 'text-neon-pink',
  },
  emerald: {
    bg: 'bg-emerald-500/20',
    text: 'text-emerald-400',
  },
  purple: {
    bg: 'bg-neon-purple/20',
    text: 'text-neon-purple',
  },
  blue: {
    bg: 'bg-neon-blue/20',
    text: 'text-neon-blue',
  },
};

export const SectionHeader: React.FC<SectionHeaderProps> = ({
  icon: Icon,
  title,
  subtitle,
  colorTheme = 'purple',
  iconSize = 20,
  large = false,
}) => {
  const theme = colorThemes[colorTheme];
  const padding = large ? 'p-3' : 'p-2';
  const rounded = large ? 'rounded-xl' : 'rounded-lg';
  const titleSize = large ? 'text-xl' : 'text-lg';
  const subtitleSize = large ? 'text-sm' : 'text-xs';
  const actualIconSize = large ? 24 : iconSize;

  return (
    <div className="flex items-center gap-3 mb-4">
      <div className={`${padding} ${theme.bg} ${rounded}`}>
        <Icon className={theme.text} size={actualIconSize} />
      </div>
      <div>
        <h3 className={`text-white font-display ${titleSize}`}>{title}</h3>
        {subtitle && (
          <p className={`text-gray-400 ${subtitleSize}`}>{subtitle}</p>
        )}
      </div>
    </div>
  );
};
