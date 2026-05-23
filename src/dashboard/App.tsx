import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import Sidebar from './components/Sidebar';
import StarField from './components/StarField';
import Overview from './views/Overview';
import Expeditions from './views/Expeditions';
import Lifeforms from './views/Lifeforms';
import Combat from './views/Combat';
import DebrisFields from './views/DebrisFields';
import Settings from './views/Settings';
import Testing from './views/Testing';
import DataManagement from './views/DataManagement';
import Empire from './views/Empire';
import Tools from './views/Tools';
import SignatureMaker from './views/SignatureMaker';
import Hotbar from './components/Hotbar';
import WelcomeModal from './components/WelcomeModal';
import Tutorials from './views/Tutorials';
import './index.css';
import '../content/styles.css';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState('overview');
    const [showWelcome, setShowWelcome] = useState(false);

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

    useEffect(() => {
        const checkWelcomeStatus = () => {
            try {
                if (typeof chrome !== 'undefined' && chrome.storage && chrome.storage.local) {
                    chrome.storage.local.get('welcomeDismissed', (result) => {
                        const err = chrome.runtime.lastError;
                        if (err || !result) {
                            const val = localStorage.getItem('og-nexus-welcome-dismissed');
                            if (!val) setShowWelcome(true);
                        } else if (!result.welcomeDismissed) {
                            setShowWelcome(true);
                        }
                    });
                } else {
                    const val = localStorage.getItem('og-nexus-welcome-dismissed');
                    if (!val) {
                        setShowWelcome(true);
                    }
                }
            } catch (e) {
                console.error("Failed to check welcome status", e);
                const val = localStorage.getItem('og-nexus-welcome-dismissed');
                if (!val) {
                    setShowWelcome(true);
                }
            }
        };
        checkWelcomeStatus();
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
                    {currentView === 'dataManagement' && <DataManagement />}
                    {currentView === 'empire' && <Empire />}
                    {currentView === 'tools' && <Tools />}
                    {currentView === 'signature' && <SignatureMaker onBack={() => setCurrentView('overview')} />}
                    {currentView === 'tutorials' && <Tutorials onNavigate={setCurrentView} />}
                </motion.div>
            </AnimatePresence>
        );
    };

    return (
        <>
            <StarField />
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
            </AnimatePresence>
        </>
    );
};

export default App;

