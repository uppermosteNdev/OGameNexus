import React, { useState } from 'react';
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
import './index.css';
import '../content/styles.css';

const App: React.FC = () => {
    const [currentView, setCurrentView] = useState('overview');

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
        </>
    );
};

export default App;
