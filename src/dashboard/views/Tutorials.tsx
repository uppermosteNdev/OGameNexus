import React, { useState, useEffect } from 'react';
import {
    BookOpen,
    LayoutDashboard,
    Compass,
    Dna,
    Wrench,
    ArrowRight,
    PlayCircle,
    X,
    ChevronLeft,
    ChevronRight,
    CheckCircle2,
    Sparkles,
    Database,
    RefreshCw,
    FileText,
    Code,
    DownloadCloud,
    Terminal,
    Target,
    Activity,
    Layers,
    Moon,
    Sun,
    Monitor
} from 'lucide-react';
import { motion, AnimatePresence } from 'framer-motion';


interface TutorialsProps {
    onNavigate: (view: string) => void;
}

interface Step {
    title: string;
    text: string;
    images?: string[];
}

interface Guide {
    id: string;
    title: string;
    icon: React.ReactNode;
    desc: string;
    badge: string;
    badgeColor: string;
    badgeTextColor: string;
    view: string;
    accentColor: string;
    gridClass: string;
    steps: Step[];
}

const Tutorials: React.FC<TutorialsProps> = ({ onNavigate }) => {
    const [selectedGuide, setSelectedGuide] = useState<Guide | null>(null);
    const [currentStep, setCurrentStep] = useState(0);

    const [completedGuides, setCompletedGuides] = useState<string[]>(() => {
        try {
            const saved = localStorage.getItem('nexus_completed_tutorials');
            return saved ? JSON.parse(saved) : [];
        } catch {
            return [];
        }
    });

    const markAsCompleted = (guideId: string) => {
        if (!completedGuides.includes(guideId)) {
            const updated = [...completedGuides, guideId];
            setCompletedGuides(updated);
            localStorage.setItem('nexus_completed_tutorials', JSON.stringify(updated));
        }
    };

    const guides: Guide[] = [
        {
            id: "empire-sync",
            title: "Empire Synchronization",
            icon: <LayoutDashboard size={24} color="#00f2ff" />,
            desc: "Fully integrate your active OGame account with the OGame Nexus Command Deck. Automatically ingest planet and moon coordinates, resources settings, and passive species bonuses in seconds.",
            badge: "Core Integration",
            badgeColor: "rgba(0, 242, 255, 0.15)",
            badgeTextColor: "#00f2ff",
            view: "overview",
            accentColor: "#00f2ff",
            gridClass: "bento-standard",
            steps: [
                {
                    title: "Access the Empire",
                    text: "Go to your OGame account page. Navigate to the main left-hand sidebar menu in-game and ensure you are ready to open the Empire screen. The extension will syncronize the latest data of the account from there.",
                    images: ["icons/tutorials/T1/Empire.jpg"]
                },
                {
                    title: "Sync Planets & Moons",
                    text: "In the OGame Empire Overview, click on the Planets button first, then click on Moons. This forces the OGame Nexus extension to securely capture and catalog all celestial coordinates.",
                    images: ["icons/tutorials/T1/Empire2.jpg"]
                },
                {
                    title: "Import Mine Production",
                    text: "Visit your in-game Resource Settings tab on every planet and then the Lifeform Player Bonuses. This allows the extension to map information about your empire production and lifeform levels.",
                    images: ["icons/tutorials/T1/ResourceSettings1.jpg", "icons/tutorials/T1/ResourceSettings2.jpg"]
                }
            ]
        },
        {
            id: "data-telemetry",
            title: "Data Safeguard & Telemetry",
            icon: <Database size={24} color="#00ff66" />,
            desc: "Keep your strategic operations backed up. Export your customized planetary grids and historical telemetry into encrypted JSON files, or restore configuration backups on new command devices.",
            badge: "Data Security",
            badgeColor: "rgba(0, 255, 102, 0.15)",
            badgeTextColor: "#00ff66",
            view: "dataManagement",
            accentColor: "#00ff66",
            gridClass: "bento-standard",
            steps: [
                {
                    title: "Open Data Panel",
                    text: "Open the Data Management interface from the Command Sidebar to manage localized storage caches. You have the option to import the OGame Nexus backup from a separate device or the OGame Tracker backup. Click **OGame Nexus Data** or **OGame Tracker Sync** to import from the chosen source.",
                    images: ["icons/tutorials/T2/Menu1.jpg", "icons/tutorials/T2/Menu2.jpg"]
                },
                {
                    title: "OGame Tracker Data Import",
                    text: "If you've previously used **OGame Tracker Extension** and don't want to lose your progress and history there, you have the option of **Exporting** data from OGame Tracker and **Importing** it back into OGame Nexus.<br /><br />1. Firstly **Export** the data in OGame Tracker; you will get a **.JSON** file. Save it to a location on your device.<br />2. Go to OGame Nexus and **Import** that exact **.JSON** file. You will have to choose what accounts you want to import from it as well as which types of data. Once the Import is complete, you should have access to your entire history of the account.",
                    images: ["icons/tutorials/T2/OGTrackerExport1.jpg", "icons/tutorials/T2/OGTrackerImport1.jpg"]
                },
                {
                    title: "OGame Nexus Data Export & Import",
                    text: "If you are switching devices and want to keep your data safe, OGame Nexus also provides an **Export/Import Data** feature that works similarly.",
                    images: ["icons/tutorials/T2/OGNexusExport1.jpg"]
                }
            ]
        },
        {
            id: "interface-mastery",
            title: "Interface Mastery",
            icon: <Layers size={24} color="#bd00ff" />,
            desc: "Learn how OGame Nexus enriches the in-game interface with Expedition, Lifeform, Overview and To-Do data.",
            badge: "In-Game UI",
            badgeColor: "rgba(189, 0, 255, 0.15)",
            badgeTextColor: "#bd00ff",
            view: "overview",
            accentColor: "#bd00ff",
            gridClass: "bento-standard",
            steps: [
                {
                    title: "Today's Bounty Bar",
                    text: "Whenever you scroll through new expeditions, the bar will track and sum-up your findings. The count resets at the end of the day.",
                    images: ["icons/tutorials/T3/Expeditions1.png"]
                },
                {
                    title: "Expedition Analytics",
                    text: "All your **Expedition** and **Lifeform** messages are visually processed and easier to read, with **Rarity** and **Depletion** elements. The **Nexus Terminal** can be launched by clicking the small logo button next to the **OGame Nexus** menu button.",
                    images: ["icons/tutorials/T3/Expeditions2.png", "icons/tutorials/T3/NexusTerminal1.png"]
                },
                {
                    title: "OGame Nexus Terminal",
                    text: "In the **Terminal**, you can track your progress in various ways and on different timeframes.",
                    images: ["icons/tutorials/T3/Interface1.png"]
                },
                {
                    title: "To-Do Command Panel",
                    text: "The **To-Do** list can be built from inside the **Amortization** feature inside the Extension; you can add as many **To-Dos** as you like after planning your next steps for your account.",
                    images: ["icons/tutorials/T3/Interface2.png"]
                }
            ]
        },
        {
            id: "lifeform-sandbox",
            title: "Lifeform Sandbox",
            icon: <Dna size={24} color="#00ffb7" />,
            desc: "Experiment and theory-craft your dream Lifeform setups in a localized simulator, entirely separate from your live game environment.",
            badge: "Simulation Matrix",
            badgeColor: "rgba(0, 255, 183, 0.15)",
            badgeTextColor: "#00ffb7",
            view: "lifeforms",
            accentColor: "#00ffb7",
            gridClass: "bento-standard",
            steps: [
                {
                    title: "Lifeforms Menu",
                    text: "Inside the **Empire Overview** area of the **Lifeforms Menu** you are greeted by the overall bonuses and power-ups your account has.<br /><br />Also, by clicking on any planet, you will be able to play-around with the lifeform setup on that planet.<br /><br />Here, we can see a clear differentiation between the **LIVE** setup of the OGame account and the **Sandbox** technologies; meaning that any changes, on any planet, made to the Lifeform Setup will be marked as **\"Sandbox\"** / different than LIVE. Whenever you are done theorycrafting and want to go back to LIVE version, you can click the **Update to Live versions** button.",
                    images: ["icons/tutorials/T4/LifeformsTut1.jpg", "icons/tutorials/T4/LifeformsTut2.jpg"]
                },
                {
                    title: "Lifeform Matrix",
                    text: "Following a very similar style to the Lifeform Research in-game menu, the **Lifeform Matrix** editor allows you to delete/add/change and theory-craft the Lifeform setup of your dreams.",
                    images: ["icons/tutorials/T4/LifeformsTut3.jpg"]
                },
                {
                    title: "Lifeform Slot Alternatives",
                    text: "You can check and choose any slot options of the **Lifeform Matrix**.",
                    images: ["icons/tutorials/T4/LifeformsTut4.jpg"]
                },
                {
                    title: "Lifeform Action Menu",
                    text: "Behaves exactly like a fully-featured editor, allowing you to **save/load/revert** and **sync** Lifeform slots to your heart's desire.",
                    images: ["icons/tutorials/T4/LifeformsTut5.jpg"]
                },
                {
                    title: "The Empire Overview",
                    text: "The overall bonuses of your account and the % difference between **LIVE** version and any **Sandbox** edits you have done to your Lifeform setup. Those **Green/Red percentage prompts** show the impact made by your Sandbox edits over the LIVE bonuses version.",
                    images: ["icons/tutorials/T4/LifeformsTut6.jpg"]
                },
                {
                    title: "Additional Tools",
                    text: "These sections can be used to check the costs of upgrading **Lifeform Technologies** and provide useful templates to users who are looking for strong Lifeform setups.",
                    images: ["icons/tutorials/T4/LifeformsTut7.jpg", "icons/tutorials/T4/LifeformsTut8.jpg"]
                }
            ]
        },
        {
            id: "signature-forge",
            title: "Signature Forge",
            icon: <Sparkles size={24} color="#ffaa00" />,
            desc: "Craft gorgeous, dynamic cybernetic signature graphics showcasing your live empire statistics to display on community forums.",
            badge: "Social Media",
            badgeColor: "rgba(255, 170, 0, 0.15)",
            badgeTextColor: "#ffaa00",
            view: "signature",
            accentColor: "#ffaa00",
            gridClass: "bento-standard",
            steps: [
                {
                    title: "The Signature Forge",
                    text: "Craft your account's sleek overview whenever you feel like you're into the **bragging business**. Multiple customization features present in the editor and **more to come**!",
                    images: ["icons/tutorials/T5/Signature1.jpg", "icons/tutorials/T5/Signature2.jpg"]
                }
            ]
        }
    ];

    const openGuide = (guide: Guide) => {
        setSelectedGuide(guide);
        setCurrentStep(0);
    };

    const closeGuide = () => {
        setSelectedGuide(null);
    };

    const nextStep = () => {
        if (selectedGuide && currentStep < selectedGuide.steps.length - 1) {
            setCurrentStep(currentStep + 1);
        }
    };

    const prevStep = () => {
        if (currentStep > 0) {
            setCurrentStep(currentStep - 1);
        }
    };

    // Keyboard controls
    useEffect(() => {
        const handleKeyDown = (e: KeyboardEvent) => {
            if (!selectedGuide) return;
            if (e.key === 'ArrowRight') {
                nextStep();
            } else if (e.key === 'ArrowLeft') {
                prevStep();
            } else if (e.key === 'Escape') {
                closeGuide();
            }
        };

        window.addEventListener('keydown', handleKeyDown);
        return () => {
            window.removeEventListener('keydown', handleKeyDown);
        };
    }, [selectedGuide, currentStep]);

    // Custom CSS mockups for steps to act as high-fidelity simulated screenshots
    const renderStepMockup = (guideId: string, stepIdx: number) => {
        const primaryColor = selectedGuide?.accentColor || '#00f2ff';
        const currentStepData = selectedGuide?.steps[stepIdx];

        return (
            <div style={{
                width: '100%',
                height: '100%',
                background: 'radial-gradient(circle at 50% 50%, #0c182d 0%, #030814 100%)',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                position: 'relative',
                overflow: 'hidden',
                display: 'flex',
                flexDirection: 'column',
                boxShadow: 'inset 0 0 40px rgba(0,0,0,0.8)'
            }}>
                {/* Browser/System Bar */}
                <div style={{
                    height: '32px',
                    background: 'rgba(0, 0, 0, 0.4)',
                    borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'space-between',
                    padding: '0 16px',
                    fontSize: '0.75rem',
                    color: 'rgba(255, 255, 255, 0.4)',
                    fontFamily: 'var(--font-title)'
                }}>
                    <div style={{ display: 'flex', gap: '6px' }}>
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ff5f56' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#ffbd2e' }} />
                        <span style={{ width: '8px', height: '8px', borderRadius: '50%', background: '#27c93f' }} />
                    </div>
                    <div style={{
                        background: 'rgba(255,255,255,0.03)',
                        padding: '2px 30px',
                        borderRadius: '4px',
                        fontSize: '0.65rem',
                        letterSpacing: '1px',
                        border: '1px solid rgba(255,255,255,0.02)'
                    }}>
                        NEXUS_CORE_VIEWPORT
                    </div>
                    <div style={{ width: '30px' }} />
                </div>

                {/* Main Mock Content */}
                <div style={{
                    flex: 1,
                    height: 'calc(100% - 32px)',
                    maxHeight: 'calc(100% - 32px)',
                    padding: '20px',
                    position: 'relative',
                    display: 'flex',
                    justifyContent: 'center',
                    alignItems: 'center',
                    boxSizing: 'border-box'
                }}>

                    {/* Pulsing Scanning Effect */}
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        height: '2px',
                        background: `linear-gradient(90deg, transparent, ${primaryColor}, transparent)`,
                        opacity: 0.3,
                        animation: 'scan 4s linear infinite',
                        pointerEvents: 'none'
                    }} />

                    {/* Cyber Grid background */}
                    <div style={{
                        position: 'absolute',
                        top: 0, right: 0, bottom: 0, left: 0,
                        backgroundImage: 'linear-gradient(rgba(255,255,255,0.02) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.02) 1px, transparent 1px)',
                        backgroundSize: '15px 15px',
                        pointerEvents: 'none'
                    }} />

                    {/* RENDER DYNAMIC IMAGES IF PRESENT */}
                    {currentStepData && currentStepData.images && currentStepData.images.length > 0 ? (
                        <div style={{
                            display: 'flex',
                            justifyContent: 'center',
                            alignItems: 'center',
                            gap: '20px',
                            width: '100%',
                            height: '100%',
                            position: 'relative'
                        }}>
                            {currentStepData.images.map((imgSrc, idx) => (
                                <img
                                    key={idx}
                                    src={imgSrc}
                                    alt={`${currentStepData.title} Screenshot ${idx + 1}`}
                                    style={{
                                        height: 'auto',
                                        maxHeight: '100%',
                                        width: 'auto',
                                        maxWidth: currentStepData.images && currentStepData.images.length > 1 ? '70%' : '100%',
                                        borderRadius: '8px',
                                        border: '1px solid rgba(255, 255, 255, 0.15)',
                                        boxShadow: '0 8px 32px rgba(0, 0, 0, 0.6)',
                                        objectFit: 'contain',
                                        boxSizing: 'border-box'
                                    }}
                                />
                            ))}
                        </div>
                    ) : (
                        /* FALLBACK TO CUSTOM CSS MOCKUPS FOR SPECIFIC STEPS */
                        <div style={{ width: '100%', height: '100%' }}>
                            {/* Fallback mockups if no images are specified */}

                            {guideId === 'interface-mastery' && (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {stepIdx === 0 && (
                                        <div style={{ margin: 'auto', display: 'flex', flexDirection: 'column', alignItems: 'center', gap: '12px' }}>
                                            <div style={{ display: 'flex', gap: '8px' }}>
                                                <div style={{ padding: '8px 12px', background: 'rgba(255,255,255,0.03)', border: '1px solid rgba(255,255,255,0.05)', borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', opacity: 0.5 }}>
                                                    <Wrench size={14} /> <span style={{ fontSize: '0.65rem' }}>Amortization</span>
                                                </div>
                                                <div style={{ padding: '8px 16px', background: 'rgba(189, 0, 255, 0.1)', border: `1px solid ${primaryColor}`, borderRadius: '6px', display: 'flex', alignItems: 'center', gap: '6px', boxShadow: `0 0 10px rgba(189, 0, 255, 0.2)` }}>
                                                    <Compass size={14} color={primaryColor} /> <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>Expeditions</span>
                                                    <Target size={14} color={primaryColor} style={{ animation: 'bounce 1s infinite' }} />
                                                </div>
                                            </div>
                                            <span style={{ fontSize: '0.65rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>loading tools/expeditionCalculator.ts</span>
                                        </div>
                                    )}

                                    {stepIdx === 1 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', margin: 'auto 0' }}>
                                            <span style={{ fontSize: '0.7rem', color: 'rgba(255,255,255,0.4)', fontWeight: 800 }}>CALCULATOR CONFIG</span>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', marginBottom: '2px' }}>
                                                        <span>Discoverer Class Bonus</span>
                                                        <span style={{ color: primaryColor }}>Active (+50%)</span>
                                                    </div>
                                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                        <div style={{ width: '80%', height: '100%', background: primaryColor, borderRadius: '2px' }} />
                                                    </div>
                                                </div>
                                                <div>
                                                    <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.6rem', marginBottom: '2px' }}>
                                                        <span>Target Cargo capacity</span>
                                                        <span style={{ color: primaryColor }}>35,000,000</span>
                                                    </div>
                                                    <div style={{ height: '4px', background: 'rgba(255,255,255,0.1)', borderRadius: '2px' }}>
                                                        <div style={{ width: '65%', height: '100%', background: primaryColor, borderRadius: '2px' }} />
                                                    </div>
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {stepIdx === 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', borderBottom: '1px solid rgba(255,255,255,0.05)', paddingBottom: '4px' }}>
                                                <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>Recommended Fleet Layout</span>
                                                <span style={{ fontSize: '0.6rem', color: '#00ff66', fontFamily: 'monospace' }}>OPTIMAL</span>
                                            </div>
                                            <div style={{ display: 'flex', flexDirection: 'column', gap: '4px' }}>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                                                    <span>Large Cargo</span>
                                                    <span style={{ fontWeight: 800, color: primaryColor }}>420</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                                                    <span>Pathfinder</span>
                                                    <span style={{ fontWeight: 800, color: primaryColor }}>1</span>
                                                </div>
                                                <div style={{ display: 'flex', justifyContent: 'space-between', background: 'rgba(255,255,255,0.02)', padding: '6px', borderRadius: '4px', fontSize: '0.65rem' }}>
                                                    <span>Espionage Probe</span>
                                                    <span style={{ fontWeight: 800, color: primaryColor }}>1</span>
                                                </div>
                                            </div>
                                            <div style={{
                                                alignSelf: 'center',
                                                padding: '4px 10px',
                                                borderRadius: '4px',
                                                background: 'rgba(189,0,255,0.15)',
                                                border: `1px solid ${primaryColor}`,
                                                fontSize: '0.6rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                letterSpacing: '0.5px'
                                            }}>
                                                COPY FLEET TO CLIPBOARD
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}



                            {guideId === 'data-telemetry' && (
                                <div style={{ width: '100%', height: '100%', display: 'flex', flexDirection: 'column', gap: '10px' }}>
                                    {stepIdx === 0 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', margin: 'auto 0', alignItems: 'center' }}>
                                            <Database size={32} color={primaryColor} style={{ animation: 'pulse 2s infinite' }} />
                                            <span style={{ fontSize: '0.75rem', fontWeight: 800, color: '#fff' }}>DATA_VAULT_CONTROLLER</span>
                                            <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)', fontFamily: 'monospace' }}>SECURE LOCAL SQLITE/STORAGE</span>
                                        </div>
                                    )}

                                    {stepIdx === 1 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '10px', justifyContent: 'center', height: '100%' }}>
                                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: 'rgba(255,255,255,0.02)', padding: '10px', borderRadius: '8px', border: '1px solid rgba(255,255,255,0.05)' }}>
                                                <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                                    <span style={{ fontSize: '0.7rem', fontWeight: 800, color: '#fff' }}>export_telemetry.json</span>
                                                    <span style={{ fontSize: '0.55rem', color: 'var(--text-muted)' }}>Size: 24.5 KB</span>
                                                </div>
                                                <div style={{
                                                    padding: '6px 12px',
                                                    background: 'rgba(0, 255, 102, 0.15)',
                                                    border: `1px solid ${primaryColor}`,
                                                    borderRadius: '6px',
                                                    display: 'flex',
                                                    alignItems: 'center',
                                                    gap: '6px',
                                                    fontSize: '0.65rem',
                                                    fontWeight: 800,
                                                    color: primaryColor,
                                                    cursor: 'pointer'
                                                }}>
                                                    <DownloadCloud size={14} /> EXPORT
                                                </div>
                                            </div>
                                        </div>
                                    )}

                                    {stepIdx === 2 && (
                                        <div style={{ display: 'flex', flexDirection: 'column', width: '100%', gap: '8px', margin: 'auto 0' }}>
                                            <div style={{
                                                border: `1px dashed ${primaryColor}`,
                                                background: 'rgba(0, 255, 102, 0.02)',
                                                borderRadius: '8px',
                                                padding: '16px',
                                                display: 'flex',
                                                flexDirection: 'column',
                                                alignItems: 'center',
                                                gap: '6px',
                                                cursor: 'pointer'
                                            }}>
                                                <RefreshCw size={18} color={primaryColor} style={{ animation: 'spin 6s linear infinite' }} />
                                                <span style={{ fontSize: '0.65rem', fontWeight: 800, color: '#fff' }}>CLICK TO UPLOAD BACKUP FILE</span>
                                                <span style={{ fontSize: '0.5rem', color: 'var(--text-muted)' }}>*.json files only</span>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            )}
                        </div>
                    )}

                </div>
            </div>
        );
    };

    return (
        <div className="view" style={{ maxWidth: '1400px', margin: '0 auto' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '12px' }}>
                <BookOpen size={40} color="var(--primary)" style={{ filter: 'drop-shadow(0 0 8px var(--primary-glow))' }} />
                <h1 style={{
                    fontFamily: 'var(--font-title)',
                    fontSize: '3.2rem',
                    fontWeight: 800,
                    margin: 0,
                    background: 'linear-gradient(135deg, #fff 0%, var(--primary) 60%, #fff 100%)',
                    WebkitBackgroundClip: 'text',
                    WebkitTextFillColor: 'transparent',
                    letterSpacing: '-0.03em'
                }}>
                    Nexus Academy
                </h1>
            </div>
            <p style={{ fontSize: '1.05rem', color: 'var(--text-muted)', marginBottom: '40px', maxWidth: '800px', lineHeight: 1.6 }}>
                Master the cybernetic features of OGame Nexus. Explore our high-tech tactical guides to integrate, optimize, and secure your empire's operations across all galaxies.
            </p>

            {/* Custom Bento Grid Layout */}
            <div className="tutorials-bento-grid">
                {guides.map((guide) => (
                    <motion.div
                        key={guide.id}
                        className={`glass bento-card ${guide.gridClass}`}
                        whileHover={{ scale: 1.01, translateY: -4 }}
                        transition={{ type: 'spring', stiffness: 300, damping: 20 }}
                        onClick={() => openGuide(guide)}
                        style={{
                            padding: '24px',
                            display: 'flex',
                            flexDirection: 'column',
                            position: 'relative',
                            overflow: 'hidden',
                            cursor: 'pointer',
                            background: 'rgba(13, 22, 38, 0.4)',
                            border: '1px solid rgba(255,255,255,0.03)'
                        }}
                    >
                        {/* Decorative Background Grid/Glow */}
                        <div style={{
                            position: 'absolute',
                            top: '-20%',
                            right: '-20%',
                            width: '200px',
                            height: '200px',
                            background: `radial-gradient(circle, ${guide.accentColor} 0%, transparent 70%)`,
                            opacity: 0.08,
                            filter: 'blur(30px)',
                            pointerEvents: 'none'
                        }} />

                        {/* Top Metadata */}
                        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '24px' }}>
                            <div style={{
                                width: '48px',
                                height: '48px',
                                background: 'rgba(0, 0, 0, 0.4)',
                                borderRadius: '14px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'center',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                boxShadow: `0 0 10px rgba(0,0,0,0.3)`
                            }}>
                                {guide.icon}
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: '6px' }}>
                                <span style={{
                                    padding: '4px 12px',
                                    borderRadius: '20px',
                                    background: guide.badgeColor,
                                    color: guide.badgeTextColor,
                                    fontSize: '0.65rem',
                                    fontWeight: 800,
                                    textTransform: 'uppercase',
                                    letterSpacing: '1px',
                                    border: `1px solid rgba(255,255,255,0.02)`
                                }}>
                                    {guide.badge}
                                </span>
                                {completedGuides.includes(guide.id) ? (
                                    <span style={{
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(0, 255, 102, 0.1)',
                                        color: '#00ff66',
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        border: '1px solid rgba(0, 255, 102, 0.25)',
                                        boxShadow: '0 0 8px rgba(0, 255, 102, 0.15)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <CheckCircle2 size={10} /> Completed
                                    </span>
                                ) : (
                                    <span style={{
                                        padding: '3px 8px',
                                        borderRadius: '4px',
                                        background: 'rgba(255, 170, 0, 0.1)',
                                        color: '#ffaa00',
                                        fontSize: '0.6rem',
                                        fontWeight: 800,
                                        textTransform: 'uppercase',
                                        letterSpacing: '0.5px',
                                        border: '1px solid rgba(255, 170, 0, 0.25)',
                                        boxShadow: '0 0 8px rgba(255, 170, 0, 0.15)',
                                        display: 'inline-flex',
                                        alignItems: 'center',
                                        gap: '4px'
                                    }}>
                                        <Sparkles size={10} /> New Tutorial
                                    </span>
                                )}
                            </div>
                        </div>

                        {/* Mid Details */}
                        <h3 style={{
                            fontSize: '1.45rem',
                            fontWeight: 800,
                            color: '#fff',
                            margin: '0 0 12px 0',
                            fontFamily: 'var(--font-title)',
                            letterSpacing: '-0.01em'
                        }}>
                            {guide.title}
                        </h3>
                        <p style={{
                            fontSize: '0.88rem',
                            color: 'var(--text-muted)',
                            lineHeight: 1.55,
                            marginBottom: '16px',
                            flexGrow: 1
                        }}>
                            {guide.desc}
                        </p>

                        {/* Card CTA/Footer */}
                        <div style={{
                            display: 'flex',
                            alignItems: 'center',
                            gap: '8px',
                            fontSize: '0.82rem',
                            fontWeight: 700,
                            color: guide.badgeTextColor,
                            marginTop: 'auto'
                        }}>
                            <span>Launch Step-by-Step Training</span>
                            <ArrowRight size={14} style={{ transition: 'transform 0.2s' }} />
                        </div>
                    </motion.div>
                ))}
            </div>

            {/* Step-by-Step Blurred Overlay Modal */}
            <AnimatePresence>
                {selectedGuide && (
                    <div style={{
                        position: 'absolute',
                        top: 0,
                        left: 0,
                        right: 0,
                        bottom: 0,
                        zIndex: 1000,
                        display: 'flex',
                        alignItems: 'center',
                        justifyContent: 'center',
                        padding: '40px 24px',
                        background: 'rgba(2, 6, 12, 0.65)',
                        backdropFilter: 'blur(20px) saturate(180%)',
                        WebkitBackdropFilter: 'blur(20px) saturate(180%)',
                        overflow: 'auto'
                    }}>
                        {/* Semi-transparent click outside block */}
                        <div
                            onClick={closeGuide}
                            style={{
                                position: 'absolute',
                                top: 0, left: 0, right: 0, bottom: 0,
                                zIndex: -1
                            }}
                        />

                        {/* Modal Container */}
                        <motion.div
                            initial={{ opacity: 0, scale: 0.95, y: 30 }}
                            animate={{ opacity: 1, scale: 1, y: 0 }}
                            exit={{ opacity: 0, scale: 0.95, y: 30 }}
                            transition={{ type: 'spring', damping: 25, stiffness: 220 }}
                            style={{
                                width: '100%',
                                maxWidth: '850px',
                                background: 'rgba(6, 13, 26, 0.75)',
                                border: `1px solid rgba(255, 255, 255, 0.08)`,
                                borderRadius: '24px',
                                boxShadow: `0 24px 60px -15px rgba(0, 0, 0, 0.8)`,
                                display: 'flex',
                                flexDirection: 'column',
                                overflow: 'hidden',
                                position: 'relative',
                                margin: '20px auto'
                            }}
                        >
                            {/* Inner Accent Glow Bar */}
                            <div style={{ height: '4px', width: '100%', background: `linear-gradient(90deg, transparent 10%, ${selectedGuide.accentColor} 50%, transparent 90%)` }} />

                            {/* Header */}
                            <div style={{
                                padding: '24px 32px 16px 32px',
                                borderBottom: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '14px' }}>
                                    <div style={{
                                        width: '36px',
                                        height: '36px',
                                        background: 'rgba(0, 0, 0, 0.4)',
                                        borderRadius: '10px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        border: '1px solid rgba(255, 255, 255, 0.05)'
                                    }}>
                                        {selectedGuide.icon}
                                    </div>
                                    <div style={{ display: 'flex', flexDirection: 'column', gap: '2px' }}>
                                        <h2 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', margin: 0, fontFamily: 'var(--font-title)' }}>
                                            {selectedGuide.title}
                                        </h2>
                                        <span style={{ fontSize: '0.62rem', fontWeight: 800, textTransform: 'uppercase', color: selectedGuide.accentColor, letterSpacing: '0.5px' }}>
                                            Step {currentStep + 1} of {selectedGuide.steps.length} — {selectedGuide.steps[currentStep].title}
                                        </span>
                                    </div>
                                </div>
                                <motion.button
                                    onClick={closeGuide}
                                    whileHover={{ scale: 1.1, rotate: 90 }}
                                    whileTap={{ scale: 0.9 }}
                                    style={{
                                        background: 'rgba(255,255,255,0.03)',
                                        border: '1px solid rgba(255,255,255,0.05)',
                                        borderRadius: '50%',
                                        width: '32px',
                                        height: '32px',
                                        display: 'flex',
                                        alignItems: 'center',
                                        justifyContent: 'center',
                                        color: 'rgba(255,255,255,0.5)',
                                        cursor: 'pointer'
                                    }}
                                >
                                    <X size={16} />
                                </motion.button>
                            </div>

                            {/* Progress Indicator */}
                            <div style={{
                                padding: '16px 32px 0 32px',
                                display: 'flex',
                                alignItems: 'center',
                                justifyContent: 'space-between',
                                fontSize: '0.72rem',
                                color: 'var(--text-muted)'
                            }}>
                                <span style={{ fontWeight: 700, letterSpacing: '0.5px' }}>
                                    INSTRUCTIONAL MATRIX
                                </span>
                                <span style={{ fontFamily: 'monospace', color: selectedGuide.accentColor, fontWeight: 800 }}>
                                    STEP {currentStep + 1} OF {selectedGuide.steps.length}
                                </span>
                            </div>

                            {/* Progress bar track */}
                            <div style={{
                                margin: '8px 32px 0 32px',
                                height: '3px',
                                background: 'rgba(255,255,255,0.03)',
                                borderRadius: '10px',
                                position: 'relative',
                                overflow: 'hidden'
                            }}>
                                <motion.div
                                    animate={{ width: `${((currentStep + 1) / selectedGuide.steps.length) * 100}%` }}
                                    transition={{ type: 'spring', stiffness: 200, damping: 20 }}
                                    style={{
                                        position: 'absolute',
                                        top: 0, left: 0, bottom: 0,
                                        background: selectedGuide.accentColor,
                                        boxShadow: `0 0 8px ${selectedGuide.accentColor}`
                                    }}
                                />
                            </div>

                            {/* Body Section */}
                            <div style={{
                                padding: '24px 32px 32px 32px',
                                display: 'flex',
                                flexDirection: 'column',
                                gap: '24px',
                                minHeight: '380px'
                            }}>
                                {/* Top: Image/Mockup viewport */}
                                <div style={{ height: '320px', width: '100%', position: 'relative' }}>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`${selectedGuide.id}-step-${currentStep}`}
                                            initial={{ opacity: 0, scale: 0.98, x: 10 }}
                                            animate={{ opacity: 1, scale: 1, x: 0 }}
                                            exit={{ opacity: 0, scale: 0.98, x: -10 }}
                                            transition={{ duration: 0.25 }}
                                            style={{ width: '100%', height: '100%' }}
                                        >
                                            {renderStepMockup(selectedGuide.id, currentStep)}
                                        </motion.div>
                                    </AnimatePresence>
                                </div>

                                {/* Bottom: Instructions and Text */}
                                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                    <AnimatePresence mode="wait">
                                        <motion.div
                                            key={`${selectedGuide.id}-text-${currentStep}`}
                                            initial={{ opacity: 0, y: 10 }}
                                            animate={{ opacity: 1, y: 0 }}
                                            exit={{ opacity: 0, y: -10 }}
                                            transition={{ duration: 0.2 }}
                                        >
                                            <h4 style={{
                                                fontSize: '1.15rem',
                                                fontWeight: 800,
                                                color: '#fff',
                                                margin: '0 0 6px 0',
                                                fontFamily: 'var(--font-title)'
                                            }}>
                                                {selectedGuide.steps[currentStep].title}
                                            </h4>
                                            <p
                                                style={{
                                                    fontSize: '0.9rem',
                                                    color: 'var(--text-muted)',
                                                    lineHeight: 1.55,
                                                    margin: 0
                                                }}
                                                dangerouslySetInnerHTML={{
                                                    __html: selectedGuide.steps[currentStep].text.replace(/\*\*(.*?)\*\*/g, `<strong style="color: #fff; text-shadow: 0 0 6px rgba(255,255,255,0.15)">$1</strong>`)
                                                }}
                                            />
                                        </motion.div>
                                    </AnimatePresence>
                                </div>
                            </div>

                            {/* Footer Navigation */}
                            <div style={{
                                padding: '20px 32px',
                                borderTop: '1px solid rgba(255, 255, 255, 0.05)',
                                background: 'rgba(0, 0, 0, 0.2)',
                                display: 'flex',
                                justifyContent: 'space-between',
                                alignItems: 'center'
                            }}>
                                {/* keyboard helpers */}
                                <span style={{ fontSize: '0.65rem', color: 'rgba(255, 255, 255, 0.25)', fontFamily: 'monospace', display: 'flex', alignItems: 'center', gap: '6px' }}>
                                    <span style={{ padding: '2px 4px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px', background: 'rgba(0,0,0,0.3)' }}>←</span>
                                    <span style={{ padding: '2px 4px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px', background: 'rgba(0,0,0,0.3)' }}>→</span> Navigate
                                    <span style={{ padding: '2px 4px', border: '1px solid rgba(255,255,255,0.15)', borderRadius: '3px', background: 'rgba(0,0,0,0.3)', marginLeft: '6px' }}>ESC</span> Close
                                </span>

                                <div style={{ display: 'flex', gap: '12px' }}>
                                    {currentStep > 0 && (
                                        <motion.button
                                            onClick={prevStep}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '10px 16px',
                                                borderRadius: '8px',
                                                background: 'rgba(255,255,255,0.03)',
                                                border: '1px solid rgba(255,255,255,0.08)',
                                                color: '#fff',
                                                fontSize: '0.8rem',
                                                fontWeight: 600,
                                                cursor: 'pointer'
                                            }}
                                        >
                                            <ChevronLeft size={16} /> Back
                                        </motion.button>
                                    )}

                                    {currentStep < selectedGuide.steps.length - 1 ? (
                                        <motion.button
                                            onClick={nextStep}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                background: selectedGuide.accentColor,
                                                border: 'none',
                                                color: '#000',
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                boxShadow: `0 0 15px rgba(${selectedGuide.accentColor === '#00f2ff' ? '0, 242, 255' : selectedGuide.accentColor === '#bd00ff' ? '189, 0, 255' : selectedGuide.accentColor === '#ffaa00' ? '255, 170, 0' : selectedGuide.accentColor === '#00ffb7' ? '0, 255, 183' : '0, 255, 102'}, 0.25)`
                                            }}
                                        >
                                            Next Step <ChevronRight size={16} />
                                        </motion.button>
                                    ) : (
                                        <motion.button
                                            onClick={() => {
                                                markAsCompleted(selectedGuide.id);
                                                closeGuide();
                                            }}
                                            whileHover={{ scale: 1.02 }}
                                            whileTap={{ scale: 0.98 }}
                                            style={{
                                                display: 'flex',
                                                alignItems: 'center',
                                                gap: '6px',
                                                padding: '10px 20px',
                                                borderRadius: '8px',
                                                background: '#00ff66',
                                                border: 'none',
                                                color: '#000',
                                                fontSize: '0.8rem',
                                                fontWeight: 800,
                                                cursor: 'pointer',
                                                boxShadow: `0 0 15px rgba(0, 255, 102, 0.3)`
                                            }}
                                        >
                                            <CheckCircle2 size={16} /> End Tutorial
                                        </motion.button>
                                    )}
                                </div>
                            </div>
                        </motion.div>
                    </div>
                )}
            </AnimatePresence>

            {/* Custom component keyframes */}
            <style dangerouslySetInnerHTML={{
                __html: `
                .tutorials-bento-grid {
                    display: grid;
                    grid-template-columns: repeat(3, 1fr);
                    grid-auto-rows: 330px;
                    gap: 24px;
                    margin-top: 32px;
                    max-width: 1400px;
                }
                .bento-standard {
                    grid-column: span 1;
                    grid-row: span 1;
                }
                
                @keyframes scan {
                    0% { top: 0%; }
                    50% { top: 100%; }
                    100% { top: 0%; }
                }
                @keyframes pulse {
                    0%, 100% { opacity: 0.4; transform: scale(1); }
                    50% { opacity: 1; transform: scale(1.1); }
                }
                @keyframes bounce {
                    0%, 100% { transform: translateY(0); }
                    50% { transform: translateY(-4px); }
                }
                @keyframes spin {
                    0% { transform: rotate(0deg); }
                    100% { transform: rotate(360deg); }
                }

                @media (max-width: 1100px) {
                    .tutorials-bento-grid {
                        grid-template-columns: repeat(2, 1fr);
                        grid-auto-rows: 310px;
                    }
                    .bento-standard {
                        grid-column: span 1;
                    }
                }

                @media (max-width: 768px) {
                    .tutorials-bento-grid {
                        grid-template-columns: 1fr;
                        grid-auto-rows: auto;
                    }
                    .bento-standard {
                        grid-column: span 1;
                        grid-row: span 1;
                    }
                }
            `}} />
        </div>
    );
};

export default Tutorials;
