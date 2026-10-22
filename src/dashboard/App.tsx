import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence, MotionConfig } from 'framer-motion';
import Sidebar from './components/Sidebar';
import StarField from './components/StarField';
import Overview from './views/Overview';
import Expeditions from './views/Expeditions';
import Lifeforms from './views/Lifeforms';
import Combat from './views/Combat';
import DebrisFields from './views/DebrisFields';
import Settings from './views/Settings';
import Testing from './views/Testing';
import TestingProduction from './views/TestingProduction';
import DataManagement from './views/DataManagement';
import Empire from './views/Empire';
import Tools from './views/Tools';
import CostsPlanner from './views/CostsPlanner';
import SignatureMaker from './views/SignatureMaker';
import Hotbar from './components/Hotbar';
import WelcomeModal from './components/WelcomeModal';
import ChangelogModal from './components/ChangelogModal';
import Tutorials from './views/Tutorials';
import RaidRadar from './views/RaidRadar';
import Overwatch from './views/Overwatch';
import { useLiveQuery } from 'dexie-react-hooks';
import { db } from '../db';
import { cleanUniverseId, isSameUniverse } from '../utils/universe';
import { LanguageProvider, detectLanguageFromServerLink } from '../i18n';
import './index.css';
import '../content/styles.css';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState('overview');
    const [showWelcome, setShowWelcome] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [lowAnimationEnabled, setLowAnimationEnabled] = useState(false);

    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());

    useEffect(() => {
        if (activeAccount) {
            const playerName = activeAccount.playerName || 'Unknown Player';
            const universeName = activeAccount.universeName && activeAccount.universeName !== 'unknown'
                ? activeAccount.universeName
                : (activeAccount.universe || 'unknown');
            document.title = `${universeName} › ${playerName} • OGNexus`;
        } else {
            document.title = "OGame Nexus Dashboard";
        }
    }, [activeAccount]);

    useEffect(() => {
        if (!activeAccount) return;
        const serverString = activeAccount.universe || activeAccount.serverUrl || '';
        const detected = detectLanguageFromServerLink(serverString);
        if (detected && typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.set({ ognexus_server_detected_language: detected });
        }
    }, [activeAccount?.universe, activeAccount?.serverUrl]);

    useEffect(() => {
        const loadLowAnimationSetting = async () => {
            try {
                const localData = await chrome.storage.local.get('globalSettings');
                if (localData?.globalSettings?.lowAnimationMode !== undefined) {
                    setLowAnimationEnabled(localData.globalSettings.lowAnimationMode);
                } else {
                    const globalSettings = localStorage.getItem('og-nexus-global-settings');
                    if (globalSettings) {
                        const parsed = JSON.parse(globalSettings);
                        if (parsed.lowAnimationMode !== undefined) {
                            setLowAnimationEnabled(parsed.lowAnimationMode);
                        }
                    }
                }
            } catch (e) {
                console.error(e);
            }
        };

        loadLowAnimationSetting();

        // Listen for storage changes to update lowAnimationEnabled immediately!
        const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
            if (areaName === 'local' && changes.globalSettings) {
                const newSettings = changes.globalSettings.newValue;
                if (newSettings && newSettings.lowAnimationMode !== undefined) {
                    setLowAnimationEnabled(newSettings.lowAnimationMode);
                }
            }
        };

        if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
            chrome.storage.onChanged.addListener(handleStorageChange);
        }

        return () => {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.onChanged) {
                chrome.storage.onChanged.removeListener(handleStorageChange);
            }
        };
    }, []);

    useEffect(() => {
        if (lowAnimationEnabled) {
            document.body.classList.add('low-animation');
        } else {
            document.body.classList.remove('low-animation');
        }
    }, [lowAnimationEnabled]);

    useEffect(() => {
        // Support URL parameters or hash on initial load: ?view=overwatch or #overwatch
        const params = new URLSearchParams(window.location.search);
        const viewParam = params.get('view') || window.location.hash.replace(/^#/, '');
        if (viewParam) {
            setCurrentView(viewParam);
        }

        const handleNav = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail && detail.view) {
                setCurrentView(detail.view);
            }
        };
        window.addEventListener('ognexus_navigated', handleNav);
        return () => {
            window.removeEventListener('ognexus_navigated', handleNav);
        };
    }, []);

    // Automatic Account Selection: Switches based on universe ID and player ID (?universe=<uni>&player=<id>)
    useEffect(() => {
        const syncTargetAccount = async () => {
            try {
                const params = new URLSearchParams(window.location.search);
                const queryUniverse = params.get('universe') || params.get('uni');
                const queryPlayer = params.get('player') || params.get('playerId');
                const queryAccount = params.get('account');
                const savedPlayerId = localStorage.getItem('ognexus_active_player_id');
                const savedUniverse = localStorage.getItem('ognexus_active_universe');

                const accounts = await db.accounts.toArray();
                if (!accounts || accounts.length === 0) return;

                let target = null;

                // 1. Highest priority: Exact match on both universe ID and player ID
                if (queryUniverse && queryPlayer) {
                    target = accounts.find(a =>
                        String(a.playerId) === String(queryPlayer) &&
                        isSameUniverse(a.universe, queryUniverse)
                    );
                }

                // 2. Query player ID only
                if (!target && queryPlayer) {
                    target = accounts.find(a => String(a.playerId) === String(queryPlayer));
                }

                // 3. Query universe ID only
                if (!target && queryUniverse) {
                    target = accounts.find(a => isSameUniverse(a.universe, queryUniverse));
                }

                // 4. Legacy fallback for ?account=<name> (case-insensitive name match)
                if (!target && queryAccount) {
                    if (queryUniverse) {
                        target = accounts.find(a =>
                            a.playerName?.toLowerCase() === queryAccount.toLowerCase() &&
                            isSameUniverse(a.universe, queryUniverse)
                        );
                    }
                    if (!target) {
                        target = accounts.find(a => a.playerName?.toLowerCase() === queryAccount.toLowerCase());
                    }
                }

                // 5. Restore from localStorage (respecting saved player ID and universe)
                if (!target && savedPlayerId) {
                    if (savedUniverse) {
                        target = accounts.find(a =>
                            String(a.playerId) === String(savedPlayerId) &&
                            isSameUniverse(a.universe, savedUniverse)
                        );
                    }
                    if (!target) {
                        target = accounts.find(a => String(a.playerId) === String(savedPlayerId));
                    }
                }

                if (target) {
                    localStorage.setItem('ognexus_active_player_id', String(target.playerId));
                    if (target.universe) {
                        localStorage.setItem('ognexus_active_universe', String(target.universe));
                    }

                    const highest = accounts.reduce((prev, curr) =>
                        (curr.lastSeen || 0) > (prev.lastSeen || 0) ? curr : prev, accounts[0]
                    );

                    if (!highest || String(highest.playerId) !== String(target.playerId) || !isSameUniverse(highest.universe, target.universe)) {
                        await db.accounts.update(target.playerId, { lastSeen: Date.now() });
                    }
                }
            } catch (err) {
                console.warn('OGame Nexus: Failed to auto-sync target account', err);
            }
        };

        syncTargetAccount();

        const handleSwitchAccount = async (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.playerId) {
                try {
                    localStorage.setItem('ognexus_active_player_id', String(detail.playerId));
                    if (detail.universe) {
                        localStorage.setItem('ognexus_active_universe', String(detail.universe));
                    }
                    await db.accounts.update(detail.playerId, { lastSeen: Date.now() });

                    // Also sync URL params if present so bookmarking/refreshing is consistent
                    try {
                        const url = new URL(window.location.href);
                        if (detail.universe) url.searchParams.set('universe', cleanUniverseId(detail.universe));
                        url.searchParams.set('player', String(detail.playerId));
                        url.searchParams.delete('account');
                        url.searchParams.delete('playerId');
                        window.history.replaceState({}, '', url.toString());
                    } catch { }
                } catch (err) {
                    console.error('OGame Nexus: Failed to switch account', err);
                }
            }
        };

        const handleRuntimeMessage = (msg: any) => {
            if (msg && msg.type === 'SWITCH_ACCOUNT' && msg.playerId) {
                window.dispatchEvent(new CustomEvent('ognexus_switch_account', {
                    detail: {
                        playerId: msg.playerId,
                        universe: msg.universe
                    }
                }));
            }
        };

        if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
            chrome.runtime.onMessage.addListener(handleRuntimeMessage);
        }

        window.addEventListener('ognexus_switch_account', handleSwitchAccount);
        window.addEventListener('popstate', syncTargetAccount);

        return () => {
            window.removeEventListener('ognexus_switch_account', handleSwitchAccount);
            window.removeEventListener('popstate', syncTargetAccount);
            if (typeof chrome !== 'undefined' && chrome.runtime?.onMessage) {
                chrome.runtime.onMessage.removeListener(handleRuntimeMessage);
            }
        };
    }, []);

    const getCurrentVersion = (): string => {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                return chrome.runtime.getManifest().version;
            }
        } catch (e) {
            console.error("Failed to get manifest version", e);
        }
        return "1.2.8";
    };

    const autoDismissChangelogForNewInstall = (version: string) => {
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ changelogDismissedVersion: version });
            }
            localStorage.setItem('og-nexus-changelog-dismissed-version', version);
        } catch (e) {
            localStorage.setItem('og-nexus-changelog-dismissed-version', version);
        }
    };

    useEffect(() => {
        const checkWelcomeAndChangelogStatus = async () => {
            const version = getCurrentVersion();
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get(['welcomeDismissed', 'changelogDismissedVersion'], (result) => {
                        const err = chrome.runtime.lastError;
                        if (err || !result) {
                            const localWelcome = localStorage.getItem('og-nexus-welcome-dismissed');
                            if (localWelcome === 'true') {
                                const localChangelog = localStorage.getItem('og-nexus-changelog-dismissed-version');
                                if (localChangelog !== version) {
                                    setShowChangelog(true);
                                }
                            } else {
                                setShowWelcome(true);
                                autoDismissChangelogForNewInstall(version);
                            }
                        } else if (result.welcomeDismissed) {
                            if (result.changelogDismissedVersion !== version) {
                                setShowChangelog(true);
                            }
                        } else {
                            setShowWelcome(true);
                            autoDismissChangelogForNewInstall(version);
                        }
                    });
                } else {
                    const localWelcome = localStorage.getItem('og-nexus-welcome-dismissed');
                    if (localWelcome === 'true') {
                        const localChangelog = localStorage.getItem('og-nexus-changelog-dismissed-version');
                        if (localChangelog !== version) {
                            setShowChangelog(true);
                        }
                    } else {
                        setShowWelcome(true);
                        autoDismissChangelogForNewInstall(version);
                    }
                }
            } catch (e) {
                console.error("Failed to check welcome/changelog status", e);
                const localWelcome = localStorage.getItem('og-nexus-welcome-dismissed');
                if (localWelcome === 'true') {
                    const localChangelog = localStorage.getItem('og-nexus-changelog-dismissed-version');
                    if (localChangelog !== version) {
                        setShowChangelog(true);
                    }
                } else {
                    setShowWelcome(true);
                    autoDismissChangelogForNewInstall(version);
                }
            }
        };
        checkWelcomeAndChangelogStatus();
    }, []);

    const handleNeverShow = () => {
        setShowWelcome(false);
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ welcomeDismissed: true }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                    }
                });
            }
            localStorage.setItem('og-nexus-welcome-dismissed', 'true');
        } catch (e) {
            console.error("Failed to save welcome dismissal", e);
            localStorage.setItem('og-nexus-welcome-dismissed', 'true');
        }
    };

    const handleAcknowledgeChangelog = () => {
        setShowChangelog(false);
    };

    const handleDismissChangelog = () => {
        setShowChangelog(false);
        const version = getCurrentVersion();
        try {
            if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                chrome.storage.local.set({ changelogDismissedVersion: version }, () => {
                    if (chrome.runtime.lastError) {
                        console.error(chrome.runtime.lastError);
                    }
                });
            }
            localStorage.setItem('og-nexus-changelog-dismissed-version', version);
        } catch (e) {
            console.error("Failed to save changelog dismissal version", e);
            localStorage.setItem('og-nexus-changelog-dismissed-version', version);
        }
    };

    const renderView = () => {
        return (
            <AnimatePresence mode="wait">
                <motion.div
                    key={currentView}
                    initial={{ opacity: 0, scale: 0.98, y: 10 }}
                    animate={{ opacity: 1, scale: 1, y: 0 }}
                    exit={{ opacity: 0, scale: 1.02, y: -10 }}
                    transition={{ duration: 0.3, ease: 'easeInOut' }}
                >
                    {currentView === 'overview' && <Overview onSelect={setCurrentView} />}
                    {currentView === 'expeditions' && <Expeditions />}
                    {currentView === 'lifeforms' && <Lifeforms />}
                    {currentView === 'combat' && <Combat />}
                    {currentView === 'debris' && <DebrisFields />}
                    {currentView === 'settings' && <Settings />}
                    {currentView === 'testing' && <Testing />}
                    {currentView === 'testingProduction' && <TestingProduction />}
                    {currentView === 'dataManagement' && <DataManagement />}
                    {currentView === 'empire' && <Empire />}
                    {currentView === 'costsPlanner' && <CostsPlanner />}
                    {currentView === 'overwatch' && <Overwatch onSelect={setCurrentView} />}
                    {currentView === 'tools' && <Tools />}
                    {currentView === 'signature' && <SignatureMaker onBack={() => setCurrentView('overview')} />}
                    {currentView === 'tutorials' && <Tutorials onNavigate={setCurrentView} />}
                    {currentView === 'raidRadar' && <RaidRadar />}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <LanguageProvider>
            <MotionConfig reducedMotion={lowAnimationEnabled ? "always" : "user"}>
                <StarField hidden={lowAnimationEnabled} />
                <Sidebar activeView={currentView} onSelect={setCurrentView} />
                <main className="main-content">
                    {renderView()}
                </main>
                <Hotbar onSelect={setCurrentView} />

                <AnimatePresence>
                    {showWelcome && (
                         <WelcomeModal 
                             onLetsGo={() => setShowWelcome(false)}
                             onNeverShow={handleNeverShow}
                             onOpenTutorials={() => {
                                 setShowWelcome(false);
                                 setCurrentView('tutorials');
                             }}
                         />
                    )}
                    {showChangelog && !showWelcome && (
                        <ChangelogModal
                            onAcknowledge={handleAcknowledgeChangelog}
                            onDismissVersion={handleDismissChangelog}
                            onNavigateToSettings={() => {
                                handleAcknowledgeChangelog();
                                setCurrentView('settings');
                            }}
                            onOpenTutorials={() => {
                                handleAcknowledgeChangelog();
                                setCurrentView('tutorials');
                            }}
                        />
                    )}
                </AnimatePresence>
            </MotionConfig>
        </LanguageProvider>
    );
};

export default App;

