import React from 'react';
import { motion } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../../db';
import { MapPin, Thermometer, Box, Clock } from 'lucide-react';

const formatNumber = (num: number) => {
    if (num >= 1000000000) return (num / 1000000000).toFixed(1) + 'B';
    if (num >= 1000000) return (num / 1000000).toFixed(1) + 'M';
    if (num >= 1000) return (num / 1000).toFixed(1) + 'k';
    return Math.floor(num).toString();
};

const PlanetCard: React.FC<{ planet: any, moon?: any }> = ({ planet, moon }) => {
    return (
        <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            whileHover={{ y: -5, borderColor: 'rgba(0, 242, 255, 0.3)' }}
            className="glass"
            style={{
                width: '300px',
                padding: '24px',
                display: 'flex',
                flexDirection: 'column',
                alignItems: 'center',
                position: 'relative',
                overflow: 'visible',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                background: 'linear-gradient(135deg, rgba(255,255,255,0.05) 0%, rgba(255,255,255,0.01) 100%)',
                willChange: 'transform, border-color'
            }}
        >
            {/* Header info */}
            <div style={{ textAlign: 'center', marginBottom: '20px' }}>
                <h3 style={{ margin: 0, color: '#fff', fontSize: '1.4rem', fontWeight: 700 }}>{planet.name}</h3>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '4px', color: 'var(--primary)', fontSize: '0.8rem', opacity: 0.8 }}>
                    <MapPin size={12} />
                    <span>{planet.coords}</span>
                </div>
            </div>

            {/* Visual Container */}
            <div style={{ position: 'relative', width: '180px', height: '180px', display: 'flex', alignItems: 'center', justifyContent: 'center', marginBottom: '24px' }}>
                {/* Static Orbit Path */}
                {moon && (
                    <div style={{
                        position: 'absolute',
                        width: '140%',
                        height: '140%',
                        borderRadius: '50%',
                        border: '1px dashed rgba(0, 242, 255, 0.1)',
                        pointerEvents: 'none'
                    }} />
                )}

                {/* Planet Image */}
                <div style={{
                    width: '140px',
                    height: '140px',
                    borderRadius: '50%',
                    boxShadow: '0 0 30px rgba(0, 0, 0, 0.5)',
                    overflow: 'hidden',
                    position: 'relative',
                    zIndex: 2,
                    border: '1px solid rgba(255, 255, 255, 0.1)'
                }}>
                    <img
                        src={planet.imgUrl || 'https://via.placeholder.com/140'}
                        alt={planet.name}
                        style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                        loading="lazy"
                    />
                </div>

                {/* Static Moon Position (Top Right) */}
                {moon && (
                    <div
                        style={{
                            position: 'absolute',
                            width: '240px',
                            height: '240px',
                            zIndex: 3,
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'flex-start',
                            transform: 'rotate(-45deg)' /* Static position */
                        }}
                    >
                        <div style={{
                            width: '44px',
                            height: '44px',
                            borderRadius: '50%',
                            border: '2px solid rgba(255, 0, 255, 0.2)',
                            background: '#000',
                            boxShadow: '0 0 15px rgba(255, 0, 255, 0.1)',
                            overflow: 'hidden',
                            position: 'relative',
                            marginLeft: '-10px',
                            transform: 'rotate(45deg)' /* Inverse rotation to keep image upright */
                        }}>
                            <img
                                src={moon.imgUrl || 'https://via.placeholder.com/44'}
                                alt={moon.name}
                                style={{ width: '100%', height: '100%', objectFit: 'cover' }}
                                loading="lazy"
                            />
                            <div style={{
                                position: 'absolute',
                                bottom: '-22px',
                                left: '50%',
                                transform: 'translateX(-50%)',
                                fontSize: '0.65rem',
                                fontWeight: 600,
                                color: 'rgba(255, 255, 255, 0.7)',
                                whiteSpace: 'nowrap',
                                textTransform: 'uppercase',
                                letterSpacing: '0.5px'
                            }}>
                                {moon.name}
                            </div>
                        </div>
                    </div>
                )}
            </div>

            {/* Stats Overlay Style */}
            <div style={{
                width: '100%',
                display: 'grid',
                gridTemplateColumns: '1fr 1fr',
                gap: '12px',
                marginTop: 'auto'
            }}>
                <div
                    title={planet.diameter ? `Diameter: ${planet.diameter.toLocaleString()} km` : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}
                >
                    <Box size={14} color="var(--primary)" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {planet.fieldsUsed !== undefined ? `${planet.fieldsUsed}/${planet.fieldsTotal || '?'}` : 'No Data'}
                    </span>
                </div>
                <div
                    title={planet.tempMin !== undefined ? `Range: ${planet.tempMin}°C to ${planet.tempMax}°C` : undefined}
                    style={{ display: 'flex', alignItems: 'center', gap: '8px', background: 'rgba(255,255,255,0.03)', padding: '8px 12px', borderRadius: '10px', border: '1px solid rgba(255,255,255,0.03)' }}
                >
                    <Thermometer size={14} color="#f59e0b" />
                    <span style={{ fontSize: '0.75rem', fontWeight: 600 }}>
                        {planet.tempMax !== undefined ? `${planet.tempMax}°C` : 'No Data'}
                    </span>
                </div>
            </div>

            {/* Building Levels */}
            <div style={{
                width: '100%',
                marginTop: '16px',
                background: 'rgba(255, 255, 255, 0.02)',
                borderRadius: '12px',
                padding: '12px',
                border: '1px solid rgba(255, 255, 255, 0.03)',
                display: 'flex',
                flexDirection: 'column',
                gap: '12px'
            }}>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px' }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Metal</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-metal)' }}>{planet.metalMine || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Crys</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-crystal)' }}>{planet.crystalMine || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.6rem', color: 'var(--text-muted)', textTransform: 'uppercase', marginBottom: '2px', fontWeight: 600 }}>Deut</div>
                        <div style={{ fontSize: '1rem', fontWeight: 800, color: 'var(--color-deuterium)' }}>{planet.deuteriumMine || 0}</div>
                    </div>
                </div>

                <div style={{
                    display: 'grid',
                    gridTemplateColumns: 'repeat(3, 1fr)',
                    gap: '8px',
                    paddingTop: '10px',
                    borderTop: '1px solid rgba(255, 255, 255, 0.05)'
                }}>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Solar</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{planet.solarPlant || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Fusion</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{planet.fusionReactor || 0}</div>
                    </div>
                    <div style={{ textAlign: 'center' }}>
                        <div style={{ fontSize: '0.55rem', color: 'var(--text-muted)', marginBottom: '2px' }}>Sats</div>
                        <div style={{ fontSize: '0.8rem', fontWeight: 600 }}>{planet.solarSatellites || 0}</div>
                    </div>
                </div>
            </div>

            <div style={{
                width: '100%',
                marginTop: '12px',
                display: 'flex',
                justifyContent: 'center',
                gap: '15px'
            }}>
                <span style={{ color: 'var(--color-metal)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '1px' }}>
                    {planet.production ? formatNumber(planet.production.metal) : '0'}
                </span>
                <span style={{ color: 'var(--color-crystal)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '1px' }}>
                    {planet.production ? formatNumber(planet.production.crystal) : '0'}
                </span>
                <span style={{ color: 'var(--color-deuterium)', fontWeight: 700, fontSize: '0.95rem', letterSpacing: '1px' }}>
                    {planet.production ? formatNumber(planet.production.deuterium) : '0'}
                </span>
            </div>

            {planet.production?.lastUpdated && (
                <div style={{
                    marginTop: '12px',
                    fontSize: '0.65rem',
                    color: 'var(--text-muted)',
                    display: 'flex',
                    alignItems: 'center',
                    gap: '4px',
                    opacity: 0.7
                }}>
                    <Clock size={10} />
                    <span>Updated: {new Date(planet.production.lastUpdated).toLocaleTimeString()}</span>
                </div>
            )}
        </motion.div>
    );
};

const Testing: React.FC = () => {
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());
    const planetsData = useLiveQuery(
        () => activeAccount ? db.planets.where('playerId').equals(activeAccount.playerId).toArray() : [],
        [activeAccount]
    );

    if (!planetsData) return null;

    const planets = planetsData.filter(p => p.type === 'planet');
    const moons = planetsData.filter(p => p.type === 'moon');

    return (
        <div className="view">
            <motion.h1
                initial={{ x: -20, opacity: 0 }}
                animate={{ x: 0, opacity: 1 }}
                className="view-title"
            >
                Tactical Lab
            </motion.h1>

            <div style={{
                display: 'flex',
                flexWrap: 'wrap',
                gap: '30px',
                padding: '20px 0',
                justifyContent: 'flex-start'
            }}>
                {planets.map(planet => (
                    <PlanetCard
                        key={planet.id}
                        planet={planet}
                        moon={moons.find(m => m.parentPlanetId === planet.id)}
                    />
                ))}
            </div>
        </div>
    );
};

export default Testing;
