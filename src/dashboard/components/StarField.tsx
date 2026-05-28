import React, { useMemo } from 'react';

interface StarFieldProps {
    hidden?: boolean;
}

const StarField: React.FC<StarFieldProps> = ({ hidden = false }) => {
    if (hidden) return null;
    // Reduced star count and simplified animations for performance
    const stars = useMemo(() => {
        return Array.from({ length: 150 }).map((_, i) => {
            const type = Math.random();
            return {
                id: i,
                left: `${Math.random() * 100}%`,
                top: `${Math.random() * 100}%`,
                size: type > 0.95 ? Math.random() * 2 + 1 : Math.random() * 1.2 + 0.4,
                color: type > 0.9 ? (type > 0.95 ? '#00f2ff' : '#bd00ff') : '#ffffff',
                animate: type > 0.92 // Only animate ~8% of stars
            };
        });
    }, []);

    return (
        <div style={{
            position: 'fixed',
            inset: 0,
            zIndex: -1,
            overflow: 'hidden',
            pointerEvents: 'none',
            backgroundColor: '#010409',
            background: 'radial-gradient(circle at 10% 10%, rgba(0, 242, 255, 0.05) 0%, transparent 40%), radial-gradient(circle at 90% 90%, rgba(189, 0, 255, 0.05) 0%, transparent 40%)'
        }}>
            {/* Stars */}
            {stars.map((star) => (
                <div
                    key={star.id}
                    className={star.animate ? 'twinkle' : ''}
                    style={{
                        position: 'absolute',
                        left: star.left,
                        top: star.top,
                        width: star.size,
                        height: star.size,
                        backgroundColor: star.color,
                        borderRadius: '50%',
                        opacity: star.animate ? 0.4 : Math.random() * 0.5 + 0.2,
                        boxShadow: star.size > 1.5 ? `0 0 6px ${star.color}` : 'none',
                        willChange: star.animate ? 'opacity' : 'auto'
                    }}
                />
            ))}

            {/* Nebula Gloom - Static or simple CSS animation */}
            <div style={{
                position: 'absolute',
                top: '50%',
                left: '50%',
                transform: 'translate(-50%, -50%)',
                width: '100%',
                height: '100%',
                background: 'radial-gradient(ellipse at center, rgba(189, 0, 255, 0.03) 0%, transparent 70%)',
                pointerEvents: 'none'
            }} />
        </div>
    );
};

export default StarField;
