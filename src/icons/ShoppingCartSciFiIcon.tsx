import React from 'react';

export interface ShoppingCartSciFiIconProps extends React.SVGProps<SVGSVGElement> {
  size?: number | string;
  glow?: boolean;
  glowColor?: string;
  useGradient?: boolean;
  showCapsules?: boolean;
}

export const ShoppingCartSciFiIcon: React.FC<ShoppingCartSciFiIconProps> = ({
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
      className={`nexus-icon shopping-cart-scifi-icon ${className}`}
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

      {/* Handle & Chassis Base Frame */}
      <path
        d="M40,64 L68,64 L96,156 C98,162 104,166 110,166 L198,166 C204,166 210,162 212,156 L228,96 C229,90 225,84 218,84 L78,84"
        stroke={strokeColor}
        strokeWidth="16"
        strokeLinecap="round"
        strokeLinejoin="round"
      />

      {/* Aerodynamic Basket Rib */}
      <path
        d="M100,116 L206,116"
        stroke={strokeColor}
        strokeWidth="14"
        strokeLinecap="round"
      />

      {/* Concentric Wheel 1 */}
      <circle
        cx="114"
        cy="204"
        r="18"
        stroke={strokeColor}
        strokeWidth="14"
        fill="none"
      />
      <circle cx="114" cy="204" r="5" fill={fillColor} />

      {/* Concentric Wheel 2 */}
      <circle
        cx="186"
        cy="204"
        r="18"
        stroke={strokeColor}
        strokeWidth="14"
        fill="none"
      />
      <circle cx="186" cy="204" r="5" fill={fillColor} />

      {/* Floating Orbital Cargo Capsules */}
      {showCapsules && (
        <>
          <path
            d="M136,44 C144,44 152,44 160,44"
            stroke={strokeColor}
            strokeWidth="14"
            strokeLinecap="round"
          />
          <path
            d="M178,54 C184,54 190,56 196,60"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
          <path
            d="M116,56 C112,56 108,58 104,62"
            stroke={strokeColor}
            strokeWidth="12"
            strokeLinecap="round"
          />
        </>
      )}
    </svg>
  );
};

export default ShoppingCartSciFiIcon;
