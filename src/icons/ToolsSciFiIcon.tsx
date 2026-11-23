import React from 'react';

export interface ToolsSciFiIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  glow?: boolean;
  glowColor?: string;
  useGradient?: boolean;
  showCapsules?: boolean;
}

export const ToolsSciFiIcon: React.FC<ToolsSciFiIconProps> = ({
  size = 24,
  glow = false,
  glowColor = 'rgba(0, 242, 255, 0.45)',
  useGradient = true,
  showCapsules = true,
  style,
  className = '',
  ...props
}) => {
  const gradientId = React.useId();
  const strokeColor = useGradient ? `url(#${gradientId})` : 'currentColor';
  const fillColor = useGradient ? `url(#${gradientId})` : 'currentColor';

  return (
    <svg
      xmlns="http://www.w3.org/2000/svg"
      viewBox="0 0 256 256"
      width={size}
      height={size}
      fill="none"
      className={`nexus-icon tools-scifi-icon ${className}`}
      style={{
        filter: glow ? `drop-shadow(0 0 6px ${glowColor})` : undefined,
        verticalAlign: 'middle',
        flexShrink: 0,
        ...style,
      }}
      {...props}
    >
      {useGradient && (
        <defs>
          <linearGradient id={gradientId} x1="0%" y1="0%" x2="0%" y2="100%">
            <stop offset="0%" stopColor="#00f2ff" />
            <stop offset="50%" stopColor="#00d2b4" />
            <stop offset="100%" stopColor="#10b981" />
          </linearGradient>
        </defs>
      )}

      {/* Screwdriver (bottom-left to top-right) */}
      <path
        d="M54,202 L86,170"
        stroke={strokeColor}
        strokeWidth="20"
        strokeLinecap="round"
      />
      <path
        d="M96,160 L176,80"
        stroke={strokeColor}
        strokeWidth="14"
        strokeLinecap="round"
      />
      <path
        d="M184,72 L198,58"
        stroke={strokeColor}
        strokeWidth="16"
        strokeLinecap="round"
      />

      {/* Wrench (top-left to bottom-right) */}
      <path
        d="M60,94 C56,76 66,56 84,52 C94,50 106,56 112,66 L92,86 L108,102 L128,82 C138,88 144,100 142,110 C138,128 118,138 100,134"
        stroke={strokeColor}
        strokeWidth="15"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
      <path
        d="M112,122 L172,182"
        stroke={strokeColor}
        strokeWidth="16"
        strokeLinecap="round"
      />
      {/* Concentric Eyelet (Matching shopping cart wheels) */}
      <circle
        cx="188"
        cy="198"
        r="18"
        stroke={strokeColor}
        strokeWidth="14"
        fill="none"
      />
      <circle cx="188" cy="198" r="5" fill={fillColor} />

      {/* Floating Orbital Tech Capsule Dashes */}
      {showCapsules && (
        <>
          <path
            d="M188,38 C194,40 200,44 206,50"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M38,138 C38,146 40,154 44,160"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
};

export default ToolsSciFiIcon;
