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
import './index.css';
import '../content/styles.css';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState('overview');
    const [showWelcome, setShowWelcome] = useState(false);
    const [showChangelog, setShowChangelog] = useState(false);
    const [lowAnimationEnabled, setLowAnimationEnabled] = useState(false);

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

    const getCurrentVersion = (): string => {
        try {
            if (typeof chrome !== 'undefined' && chrome.runtime && chrome.runtime.getManifest) {
                return chrome.runtime.getManifest().version;
            }
        } catch (e) {
            console.error("Failed to get manifest version", e);
        }
        return "1.1.2";
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
                    {currentView === 'tools' && <Tools />}
                    {currentView === 'signature' && <SignatureMaker onBack={() => setCurrentView('overview')} />}
                    {currentView === 'tutorials' && <Tutorials onNavigate={setCurrentView} />}
                    {currentView === 'raidRadar' && <RaidRadar />}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
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
                    />
                )}
            </AnimatePresence>
        </MotionConfig>
    );
};

export default App;

