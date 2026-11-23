import React from 'react';

export interface GalaxySpiralIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  glow?: boolean;
  glowColor?: string;
  showStars?: boolean;
}

export const GalaxySpiralIcon: React.FC<GalaxySpiralIconProps> = ({
  size = 24,
  glow = false,
  glowColor = 'rgba(0, 242, 255, 0.45)',
  showStars = false,
  style,
  className = '',
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 256 256"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="16"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`nexus-icon galaxy-spiral-icon ${className}`}
    style={{
      filter: glow ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
      verticalAlign: 'middle',
      flexShrink: 0,
      ...style,
    }}
    {...props}
  >
    {/* Galactic Core Bulge */}
    <circle cx="128" cy="128" r="18" fill="currentColor" stroke="none" />
    
    {/* Arm 1: Outward Sweeping Logarithmic Spiral */}
    <path d="M128,88 C80,88 56,120 56,152 C56,192 92,216 136,216 C184,216 220,180 220,132 C220,100 200,68 168,48" />
    
    {/* Arm 2: 180° Rotational Counterpart */}
    <path d="M128,168 C176,168 200,136 200,104 C200,64 164,40 120,40 C72,40 36,76 36,124 C36,156 56,188 88,208" />

    {/* Optional Phosphor-style companion star-four cluster */}
    {showStars && (
      <>
        <path
          d="M196,44 C196,54 206,54 206,54 C206,54 196,54 196,64 C196,54 186,54 186,54 C186,54 196,54 196,44 Z"
          fill="currentColor"
          stroke="none"
        />
        <circle cx="56" cy="72" r="6" fill="currentColor" stroke="none" />
      </>
    )}
  </svg>
);

export default GalaxySpiralIcon;
