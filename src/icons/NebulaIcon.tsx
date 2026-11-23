import React from 'react';

export interface NebulaIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  glow?: boolean;
  glowColor?: string;
}

export const NebulaIcon: React.FC<NebulaIconProps> = ({
  size = 24,
  glow = false,
  glowColor = 'rgba(0, 242, 255, 0.45)',
  style,
  className = '',
  ...props
}) => (
  <svg
    xmlns="http://www.w3.org/2000/svg"
    viewBox="0 0 24 24"
    width={size}
    height={size}
    fill="none"
    stroke="currentColor"
    strokeWidth="2"
    strokeLinecap="round"
    strokeLinejoin="round"
    className={`nexus-icon nebula-icon ${className}`}
    style={{
      filter: glow ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
      verticalAlign: 'middle',
      flexShrink: 0,
      ...style,
    }}
    {...props}
  >
    {/* Central Protostar Core */}
    <circle cx="12" cy="12" r="1.75" fill="currentColor" stroke="none" />
    {/* Upper Cosmic Emission Filament */}
    <path d="M7.5 10.5C6 9 5.5 6.5 7.5 4.5C9.5 2.5 12.5 3 14 5C15.5 7 18 8 20.5 7" />
    {/* Lower Cosmic Emission Filament */}
    <path d="M16.5 13.5C18 15 18.5 17.5 16.5 19.5C14.5 21.5 11.5 21 10 19C8.5 17 6 16 3.5 17" />
    {/* Transverse Interstellar Dust Lanes */}
    <path d="M3 8.5C4.5 8 7 8.5 9 10" />
    <path d="M21 15.5C19.5 16 17 15.5 15 14" />
    {/* Newborn Sparkle Stars */}
    <path d="M18.5 2.5v3M17 4h3" strokeWidth="1.5" />
    <path d="M5.5 18.5v3M4 20h3" strokeWidth="1.5" />
  </svg>
);

export default NebulaIcon;
