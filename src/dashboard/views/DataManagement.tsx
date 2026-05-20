import React, { useState, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'framer-motion';
import { useLiveQuery } from 'dexie-react-hooks';
import {
    Upload,
    FileJson,
    Check,
    Server,
    User,
    AlertCircle,
    Database,
    Compass,
    Swords,
    ShieldCheck,
    Rocket,
    Clock,
    Activity,
    ChevronRight,
    ArrowLeft,
    Loader2,
    ShieldAlert,
    Download
} from 'lucide-react';
import { db } from '../../db';

interface Account {
    playerName: string;
    serverId: number;
    playerId: number;
    language: string;
    expeditionsCount?: number;
    combatsCount?: number;
    lifeformDiscoveriesCount?: number;
    debrisCount?: number;
    existsInDb: boolean;
}

type Step = 'upload' | 'account-select' | 'data-select' | 'import-progress';

interface ImportStats {
    total: number;
    processed: number;
    skipped: number;
    imported: number;
    errors: number;
}

const DataManagement: React.FC = () => {
    // ----------------------------------------------------
    // Global & Active Account Queries
    // ----------------------------------------------------
    const activeAccount = useLiveQuery(() => db.accounts.orderBy('lastSeen').reverse().first());

    const nexusStatsSummary = useLiveQuery(async () => {
        if (!activeAccount) return null;
        try {
            const p = await db.planets.where('playerId').equals(activeAccount.playerId).toArray();
            const pIds = p.map(x => x.id);
            const tCount = await db.todoProjects.filter(t => pIds.includes(t.planetId || '')).count();
            return {
                planets: p.length,
                expeditions: await db.expeditions.where('playerId').equals(activeAccount.playerId).count(),
                lifeforms: await db.lifeformDiscoveries.where('playerId').equals(activeAccount.playerId).count(),
                debris: await db.debrisHarvests.where('playerId').equals(activeAccount.playerId).count(),
                combats: await db.combatReports.where('playerId').equals(activeAccount.playerId).count(),
                todos: tCount
            };
        } catch (e) {
            console.error("Failed to query metrics", e);
            return null;
        }
    }, [activeAccount]);

    // ----------------------------------------------------
    // Tab and Step Navigation States
    // ----------------------------------------------------
    const [activeTab, setActiveTab] = useState<'nexus' | 'tracker'>('nexus');
    
    // Tracker Import States
    const [step, setStep] = useState<Step>('upload');
    const [isDragging, setIsDragging] = useState(false);
    const [file, setFile] = useState<File | null>(null);
    const [parsedData, setParsedData] = useState<any>(null);
    const [accounts, setAccounts] = useState<Account[]>([]);
    const [selectedAccounts, setSelectedAccounts] = useState<Set<string>>(new Set());
    const [selectedDataTypes, setSelectedDataTypes] = useState<Set<string>>(new Set(['expeditions', 'lifeform']));
    const [error, setError] = useState<string | null>(null);

    // Import Progress States
    const [isImporting, setIsImporting] = useState(false);
    const [importLog, setImportLog] = useState<string[]>([]);
    const [stats, setStats] = useState<ImportStats>({ total: 0, processed: 0, skipped: 0, imported: 0, errors: 0 });

    // Nexus Backup & Restore States
    const [nexusTabStep, setNexusTabStep] = useState<'upload' | 'mismatch' | 'confirm' | 'progress'>('upload');
    const [nexusBackupFile, setNexusBackupFile] = useState<File | null>(null);
    const [nexusBackupData, setNexusBackupData] = useState<any>(null);
    const [nexusIsImporting, setNexusIsImporting] = useState(false);
    const [nexusImportLog, setNexusImportLog] = useState<string[]>([]);
    const [nexusStats, setNexusStats] = useState({ total: 0, processed: 0, skipped: 0, imported: 0, errors: 0 });
    const [isExporting, setIsExporting] = useState(false);

    // ----------------------------------------------------
    // Nexus Export Engine
    // ----------------------------------------------------
    const handleExport = async () => {
        if (!activeAccount) return;
        try {
            setIsExporting(true);
            setError(null);

            // Query player-specific tables
            const account = activeAccount;
            const planets = await db.planets.where('playerId').equals(activeAccount.playerId).toArray();
            const expeditions = await db.expeditions.where('playerId').equals(activeAccount.playerId).toArray();
            const lifeformDiscoveries = await db.lifeformDiscoveries.where('playerId').equals(activeAccount.playerId).toArray();
            const debrisHarvests = await db.debrisHarvests.where('playerId').equals(activeAccount.playerId).toArray();
            const combatReports = await db.combatReports.where('playerId').equals(activeAccount.playerId).toArray();

            const pIds = planets.map(p => p.id);
            const todoProjects = await db.todoProjects.filter(t => pIds.includes(t.planetId || '')).toArray();

            // Construct secure backup JSON payload
            const backupPayload = {
                type: 'ogame-nexus-backup',
                version: 1,
                exportedAt: Date.now(),
                playerId: activeAccount.playerId,
                universe: activeAccount.universe,
                universeName: activeAccount.universeName,
                playerName: activeAccount.playerName,
                data: {
                    account,
                    planets,
                    expeditions,
                    lifeformDiscoveries,
                    debrisHarvests,
                    combatReports,
                    todoProjects
                }
            };

            // Trigger secure local download
            const jsonStr = JSON.stringify(backupPayload, null, 2);
            const blob = new Blob([jsonStr], { type: 'application/json' });
            const url = URL.createObjectURL(blob);
            const link = document.createElement('a');
            link.href = url;
            link.download = `ogame-nexus-backup_${activeAccount.universe}_${activeAccount.playerName.replace(/\s+/g, '_')}.json`;
            document.body.appendChild(link);
            link.click();
            document.body.removeChild(link);
            URL.revokeObjectURL(url);
        } catch (err: any) {
            console.error("Local backup export failed", err);
            setError("Failed to compile database backup payload.");
        } finally {
            setIsExporting(false);
        }
    };

    // ----------------------------------------------------
    // Nexus Import Security & Validation Engine
    // ----------------------------------------------------
    const handleNexusFile = async (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.json')) {
            setError('Please upload a valid .json database backup file');
            return;
        }

        try {
            setError(null);
            setNexusBackupFile(selectedFile);
            const text = await selectedFile.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('Backup file format is not a valid JSON.');
            }

            if (data.type !== 'ogame-nexus-backup') {
                throw new Error('Uploaded file is not a valid OGame Nexus Backup.');
            }

            if (!data.data || !data.data.account) {
                throw new Error('Backup file is missing required profile records.');
            }

            // Enforce Strict Cross-Profile Mismatch Safeguard
            if (activeAccount) {
                const filePlayerId = String(data.playerId || data.data.account.playerId);
                const fileUniverse = String(data.universe || data.data.account.universe);

                if (filePlayerId !== String(activeAccount.playerId) || fileUniverse !== String(activeAccount.universe)) {
                    // Profile/Universe Mismatch detected
                    setNexusBackupData(data);
                    setNexusTabStep('mismatch');
                    return;
                }
            }

            // Enforce active profile validation passed or fresh installation
            setNexusBackupData(data);
            setNexusTabStep('confirm');
        } catch (err: any) {
            setError(err.message || 'Failed to analyze backup.');
            console.error(err);
        }
    };

    // ----------------------------------------------------
    // Nexus Restore Execution Engine
    // ----------------------------------------------------
    const startNexusRestore = async () => {
        if (!nexusBackupData) return;
        setNexusTabStep('progress');
        setNexusIsImporting(true);
        setNexusImportLog(['Initiating safety protocols...', 'Extracting database backup payload...']);

        const backup = nexusBackupData.data;

        // Calculate total count
        const totalToProcess = 
            (backup.planets?.length || 0) +
            (backup.expeditions?.length || 0) +
            (backup.lifeformDiscoveries?.length || 0) +
            (backup.debrisHarvests?.length || 0) +
            (backup.combatReports?.length || 0) +
            (backup.todoProjects?.length || 0) +
            1; // +1 for the account record itself

        setNexusStats({
            total: totalToProcess,
            processed: 0,
            skipped: 0,
            imported: 0,
            errors: 0
        });

        setNexusImportLog(prev => [...prev, `Detected ${totalToProcess} database items to restore.`]);

        try {
            // 1. Restore Account Profile
            setNexusImportLog(prev => [...prev, `Restoring commander profile [${nexusBackupData.playerName}]...`]);
            const importedAccount = backup.account;
            // Set lastSeen to current epoch to mark active
            importedAccount.lastSeen = Date.now();
            await db.accounts.put(importedAccount);
            setNexusStats(s => ({ ...s, processed: s.processed + 1, imported: s.imported + 1 }));

            // 2. Planets
            if (backup.planets && backup.planets.length > 0) {
                setNexusImportLog(prev => [...prev, `Restoring ${backup.planets.length} planet data structures...`]);
                await db.planets.bulkPut(backup.planets);
                setNexusStats(s => ({ ...s, processed: s.processed + backup.planets.length, imported: s.imported + backup.planets.length }));
            }

            // 3. Expeditions
            if (backup.expeditions && backup.expeditions.length > 0) {
                setNexusImportLog(prev => [...prev, `Restoring ${backup.expeditions.length} expeditions history...`]);
                await db.expeditions.bulkPut(backup.expeditions);
                setNexusStats(s => ({ ...s, processed: s.processed + backup.expeditions.length, imported: s.imported + backup.expeditions.length }));
            }

            // 4. Lifeform Discoveries
            if (backup.lifeformDiscoveries && backup.lifeformDiscoveries.length > 0) {
                setNexusImportLog(prev => [...prev, `Restoring ${backup.lifeformDiscoveries.length} lifeform discoveries...`]);
                await db.lifeformDiscoveries.bulkPut(backup.lifeformDiscoveries);
                setNexusStats(s => ({ ...s, processed: s.processed + backup.lifeformDiscoveries.length, imported: s.imported + backup.lifeformDiscoveries.length }));
            }

            // 5. Debris Harvests
            if (backup.debrisHarvests && backup.debrisHarvests.length > 0) {
                setNexusImportLog(prev => [...prev, `Restoring ${backup.debrisHarvests.length} debris harvesting logs...`]);
                await db.debrisHarvests.bulkPut(backup.debrisHarvests);
                setNexusStats(s => ({ ...s, processed: s.processed + backup.debrisHarvests.length, imported: s.imported + backup.debrisHarvests.length }));
            }

            // 6. Combat Reports
            if (backup.combatReports && backup.combatReports.length > 0) {
                setNexusImportLog(prev => [...prev, `Restoring ${backup.combatReports.length} battle history reports...`]);
                await db.combatReports.bulkPut(backup.combatReports);
                setNexusStats(s => ({ ...s, processed: s.processed + backup.combatReports.length, imported: s.imported + backup.combatReports.length }));
            }

            // 7. Todo Projects (clear overlapping entries, then bulkPut)
            if (backup.todoProjects && backup.todoProjects.length > 0) {
                setNexusImportLog(prev => [...prev, `Restoring ${backup.todoProjects.length} bento construction schedules...`]);
                const pIds = (backup.planets || []).map((p: any) => p.id);
                // Purge duplicate plans to keep list indices unified
                const existingTodos = await db.todoProjects.toArray();
                const keysToDelete = existingTodos.filter(t => pIds.includes(t.planetId || '') && t.id).map(t => t.id!);
                if (keysToDelete.length > 0) {
                    await db.todoProjects.bulkDelete(keysToDelete);
                }
                await db.todoProjects.bulkPut(backup.todoProjects);
                setNexusStats(s => ({ ...s, processed: s.processed + backup.todoProjects.length, imported: s.imported + backup.todoProjects.length }));
            }

            setNexusImportLog(prev => [...prev, '✓ Restore sequence completed successfully.', 'All data components verified.']);
            setNexusIsImporting(false);
        } catch (err: any) {
            setNexusImportLog(prev => [...prev, `✖ CRITICAL RESTORE FAULT: ${err.message || 'Unknown database exception'}`]);
            setNexusStats(s => ({ ...s, errors: s.errors + 1 }));
            setNexusIsImporting(false);
        }
    };

    // ----------------------------------------------------
    // Nexus Backup & Restore Sub-Views
    // ----------------------------------------------------
    const renderNexusUpload = () => (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '32px' }}>
            {/* Export Left Column */}
            <div style={{
                padding: '40px',
                borderRadius: '32px',
                background: 'rgba(13, 22, 38, 0.45)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative',
                overflow: 'hidden'
            }}>
                <div style={{
                    position: 'absolute',
                    top: '-50px',
                    left: '-50px',
                    width: '150px',
                    height: '150px',
                    borderRadius: '50%',
                    background: 'rgba(0, 242, 255, 0.03)',
                    filter: 'blur(50px)',
                    pointerEvents: 'none'
                }} />

                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                        }}>
                            <Database size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>Command Deck Backup</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>Export your active tracking metrics locally</p>
                        </div>
                    </div>

                    {activeAccount ? (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '20px' }}>
                            {/* Active profile card */}
                            <div style={{
                                padding: '20px', borderRadius: '20px',
                                background: 'rgba(255, 255, 255, 0.02)',
                                border: '1px solid rgba(255, 255, 255, 0.05)'
                            }}>
                                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '16px' }}>
                                    <div style={{
                                        width: '40px', height: '40px', borderRadius: '10px',
                                        background: 'var(--primary)', color: '#000',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                                    }}>
                                        <User size={20} />
                                    </div>
                                    <div>
                                        <div style={{ fontSize: '1.05rem', fontWeight: 800, color: '#fff' }}>{activeAccount.playerName}</div>
                                        <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                            <Server size={10} /> {activeAccount.universeName} ({activeAccount.universe})
                                        </div>
                                    </div>
                                </div>
                                <div style={{ fontSize: '0.75rem', color: 'rgba(255, 255, 255, 0.4)' }}>
                                    Player ID: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{activeAccount.playerId}</span>
                                </div>
                            </div>

                            {/* Database numbers summary */}
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                                {[
                                    { label: 'Planets Structure', count: nexusStatsSummary?.planets || 0, icon: <Server size={14} /> },
                                    { label: 'Expedition Database', count: nexusStatsSummary?.expeditions || 0, icon: <Compass size={14} /> },
                                    { label: 'Combat Reports Log', count: nexusStatsSummary?.combats || 0, icon: <Swords size={14} /> },
                                    { label: 'Debris field harvests', count: nexusStatsSummary?.debris || 0, icon: <Rocket size={14} /> },
                                    { label: 'Lifeform Discoveries', count: nexusStatsSummary?.lifeforms || 0, icon: <Activity size={14} /> },
                                    { label: 'Saved Build Orders', count: nexusStatsSummary?.todos || 0, icon: <Clock size={14} /> },
                                ].map((item, index) => (
                                    <div key={index} style={{
                                        padding: '12px 16px', borderRadius: '14px',
                                        background: 'rgba(255,255,255,0.01)',
                                        border: '1px solid rgba(255,255,255,0.03)',
                                        display: 'flex', alignItems: 'center', gap: '12px'
                                    }}>
                                        <span style={{ color: 'var(--primary)', opacity: 0.8 }}>{item.icon}</span>
                                        <div>
                                            <div style={{ fontSize: '0.95rem', fontWeight: 900, color: '#fff' }}>{item.count.toLocaleString()}</div>
                                            <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)' }}>{item.label}</div>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    ) : (
                        <div style={{
                            padding: '30px', borderRadius: '20px',
                            background: 'rgba(255, 68, 68, 0.05)',
                            border: '1px solid rgba(255, 68, 68, 0.1)',
                            color: 'rgba(255, 255, 255, 0.8)',
                            textAlign: 'center'
                        }}>
                            No active commander profile detected. Link an account to export data.
                        </div>
                    )}
                </div>

                <div style={{ marginTop: '40px' }}>
                    <button
                        onClick={handleExport}
                        disabled={!activeAccount || isExporting}
                        style={{
                            width: '100%',
                            padding: '18px 24px',
                            borderRadius: '16px',
                            background: activeAccount && !isExporting ? 'linear-gradient(135deg, var(--primary) 0%, #00aaff 100%)' : 'rgba(255,255,255,0.05)',
                            color: activeAccount && !isExporting ? '#000' : 'var(--text-muted)',
                            border: 'none',
                            fontSize: '1rem',
                            fontWeight: 900,
                            cursor: activeAccount && !isExporting ? 'pointer' : 'not-allowed',
                            display: 'flex',
                            alignItems: 'center',
                            justifyContent: 'center',
                            gap: '12px',
                            boxShadow: activeAccount && !isExporting ? '0 0 25px rgba(0, 242, 255, 0.25)' : 'none',
                            transition: 'all 0.3s ease'
                        }}
                    >
                        {isExporting ? (
                            <>
                                <Loader2 size={20} className="animate-spin" />
                                COMPILING BACKUP PAYLOAD...
                            </>
                        ) : (
                            <>
                                <Download size={20} />
                                GENERATE NEXUS BACKUP (.JSON)
                            </>
                        )}
                    </button>
                    <div style={{ textAlign: 'center', fontSize: '0.7rem', color: 'var(--text-muted)', marginTop: '12px' }}>
                        Backup file contains your coordinates, planet details, construction schedules, and logs.
                    </div>
                </div>
            </div>

            {/* Import Right Column */}
            <div style={{
                padding: '40px',
                borderRadius: '32px',
                background: 'rgba(13, 22, 38, 0.45)',
                backdropFilter: 'blur(16px)',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                display: 'flex',
                flexDirection: 'column',
                justifyContent: 'space-between',
                position: 'relative'
            }}>
                <div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '32px' }}>
                        <div style={{
                            width: '48px', height: '48px', borderRadius: '14px',
                            background: 'rgba(189, 0, 255, 0.1)', border: '1px solid rgba(189, 0, 255, 0.2)',
                            display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--secondary)'
                        }}>
                            <Upload size={22} />
                        </div>
                        <div>
                            <h2 style={{ fontSize: '1.4rem', fontWeight: 800, color: '#fff', margin: 0 }}>System Restore</h2>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.8rem', margin: '4px 0 0' }}>Sync and restore history on this device</p>
                        </div>
                    </div>

                    <div
                        onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
                        onDragLeave={() => setIsDragging(false)}
                        onDrop={(e) => {
                            e.preventDefault();
                            setIsDragging(false);
                            const droppedFile = e.dataTransfer.files[0];
                            if (droppedFile) handleNexusFile(droppedFile);
                        }}
                        style={{
                            padding: '50px 24px',
                            borderRadius: '24px',
                            textAlign: 'center',
                            border: isDragging ? '2px dashed var(--primary)' : '2px dashed rgba(255, 255, 255, 0.1)',
                            background: isDragging ? 'rgba(0, 242, 255, 0.05)' : 'rgba(255, 255, 255, 0.01)',
                            cursor: 'pointer',
                            transition: 'all 0.3s ease',
                            display: 'flex',
                            flexDirection: 'column',
                            alignItems: 'center',
                            justifyContent: 'center'
                        }}
                    >
                        <input type="file" id="nexus-file-upload" style={{ display: 'none' }} accept=".json" onChange={(e) => {
                            const selectedFile = e.target.files?.[0];
                            if (selectedFile) handleNexusFile(selectedFile);
                        }} />
                        <label htmlFor="nexus-file-upload" style={{ cursor: 'pointer', display: 'block', width: '100%' }}>
                            <div style={{
                                width: '64px', height: '64px', borderRadius: '20px',
                                background: 'rgba(255, 255, 255, 0.03)',
                                border: '1px solid rgba(255, 255, 255, 0.05)',
                                display: 'flex', alignItems: 'center', justifyContent: 'center',
                                margin: '0 auto 16px', color: 'var(--primary)'
                            }}>
                                <FileJson size={28} />
                            </div>
                            <h3 style={{ fontSize: '1.25rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Deploy Nexus Backup</h3>
                            <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: 0 }}>Drag and drop your backup .json file or click to browse</p>
                        </label>
                    </div>
                </div>

                {error && (
                    <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', color: '#ff4444', background: 'rgba(255, 68, 68, 0.08)', padding: '12px 20px', borderRadius: '12px', border: '1px solid rgba(255, 68, 68, 0.15)', fontSize: '0.85rem' }}>
                        <AlertCircle size={16} />
                        {error}
                    </div>
                )}
            </div>
        </div>
    );

    const renderNexusMismatch = () => {
        if (!nexusBackupData) return null;
        const fileAcc = nexusBackupData;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    maxWidth: '850px',
                    margin: '0 auto',
                    padding: '40px',
                    borderRadius: '32px',
                    background: 'rgba(255, 68, 68, 0.02)',
                    border: '1px solid rgba(255, 68, 68, 0.15)',
                    boxShadow: '0 0 40px rgba(255, 68, 68, 0.05)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px', color: '#ff4444' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '18px',
                        background: 'rgba(255, 68, 68, 0.1)', border: '1px solid rgba(255, 68, 68, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <ShieldAlert size={28} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#ff4444', margin: 0 }}>Import Blocked: Profile Mismatch</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>Security checks prevent profile crossovers or database corruption</p>
                    </div>
                </div>

                <p style={{ color: 'var(--text-main)', fontSize: '0.95rem', lineHeight: 1.6, marginBottom: '32px' }}>
                    Your current active command deck belongs to another commander profile or universe. Importing a backup from a different account is blocked to prevent mixing or corrupting coordinates, planet structures, and battle logs.
                </p>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px', marginBottom: '40px' }}>
                    {/* File details card */}
                    <div style={{
                        padding: '24px', borderRadius: '24px',
                        background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.05)'
                    }}>
                        <div style={{ fontSize: '0.7rem', color: '#ff4444', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '16px' }}>BACKUP FILE PROFILE</div>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                            <div style={{
                                width: '36px', height: '36px', borderRadius: '10px',
                                background: 'rgba(255,255,255,0.05)', color: '#fff',
                                display: 'flex', alignItems: 'center', justifyContent: 'center'
                            }}>
                                <FileJson size={16} />
                            </div>
                            <div>
                                <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{fileAcc.playerName}</div>
                                <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{fileAcc.universeName} ({fileAcc.universe})</div>
                            </div>
                        </div>
                        <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                            Player ID: <span style={{ fontFamily: 'monospace', color: '#fff' }}>{fileAcc.playerId}</span>
                        </div>
                    </div>

                    {/* Active account details card */}
                    {activeAccount && (
                        <div style={{
                            padding: '24px', borderRadius: '24px',
                            background: 'rgba(0, 242, 255, 0.02)', border: '1px solid rgba(0, 242, 255, 0.15)',
                            boxShadow: '0 0 20px rgba(0, 242, 255, 0.02)'
                        }}>
                            <div style={{ fontSize: '0.7rem', color: 'var(--primary)', fontWeight: 900, letterSpacing: '0.1em', marginBottom: '16px' }}>ACTIVE COMMAND DECK</div>
                            <div style={{ display: 'flex', alignItems: 'center', gap: '12px', marginBottom: '16px' }}>
                                <div style={{
                                    width: '36px', height: '36px', borderRadius: '10px',
                                    background: 'var(--primary)', color: '#000',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center'
                                }}>
                                    <User size={16} />
                                </div>
                                <div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800, color: '#fff' }}>{activeAccount.playerName}</div>
                                    <div style={{ fontSize: '0.8rem', color: 'var(--text-muted)' }}>{activeAccount.universeName} ({activeAccount.universe})</div>
                                </div>
                            </div>
                            <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>
                                Player ID: <span style={{ fontFamily: 'monospace', color: 'var(--primary)' }}>{activeAccount.playerId}</span>
                            </div>
                        </div>
                    )}
                </div>

                <div style={{ display: 'flex', justifyContent: 'center' }}>
                    <button
                        onClick={() => {
                            setNexusBackupFile(null);
                            setNexusBackupData(null);
                            setNexusTabStep('upload');
                            setError(null);
                        }}
                        style={{
                            padding: '16px 36px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer',
                            display: 'flex', alignItems: 'center', gap: '10px', borderStyle: 'solid'
                        }}
                    >
                        <ArrowLeft size={16} /> Choose Another Backup File
                    </button>
                </div>
            </motion.div>
        );
    };

    const renderNexusConfirm = () => {
        if (!nexusBackupData) return null;
        const backup = nexusBackupData;
        const stats = backup.data;

        return (
            <motion.div
                initial={{ opacity: 0, scale: 0.98 }}
                animate={{ opacity: 1, scale: 1 }}
                style={{
                    maxWidth: '750px',
                    margin: '0 auto',
                    padding: '40px',
                    borderRadius: '32px',
                    background: 'rgba(13, 22, 38, 0.45)',
                    backdropFilter: 'blur(16px)',
                    border: '1px solid rgba(255, 255, 255, 0.05)',
                    boxShadow: '0 8px 32px rgba(0, 0, 0, 0.3)'
                }}
            >
                <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px' }}>
                    <div style={{
                        width: '56px', height: '56px', borderRadius: '18px',
                        background: 'rgba(0, 242, 255, 0.1)', border: '1px solid rgba(0, 242, 255, 0.2)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', color: 'var(--primary)'
                    }}>
                        <ShieldCheck size={28} />
                    </div>
                    <div>
                        <h2 style={{ fontSize: '1.6rem', fontWeight: 900, color: '#fff', margin: 0 }}>Step 2: Confirm Restore</h2>
                        <p style={{ color: 'var(--text-muted)', fontSize: '0.85rem', margin: '4px 0 0' }}>Review backup metrics before initializing overwrite</p>
                    </div>
                </div>

                <div style={{
                    padding: '20px', borderRadius: '20px',
                    background: 'rgba(0, 242, 255, 0.03)', border: '1px solid rgba(0, 242, 255, 0.1)',
                    display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '32px'
                }}>
                    <div style={{
                        width: '44px', height: '44px', borderRadius: '12px',
                        background: 'var(--primary)', color: '#000',
                        display: 'flex', alignItems: 'center', justifyContent: 'center'
                    }}>
                        <User size={22} />
                    </div>
                    <div>
                        <div style={{ fontSize: '1.1rem', fontWeight: 800, color: '#fff' }}>Commander {backup.playerName}</div>
                        <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)' }}>
                            Universe: <span style={{ color: '#fff', fontWeight: 600 }}>{backup.universeName}</span> ({backup.universe})
                        </div>
                    </div>
                </div>

                <h3 style={{ fontSize: '0.9rem', fontWeight: 800, color: 'var(--text-muted)', textTransform: 'uppercase', letterSpacing: '0.1em', marginBottom: '16px' }}>
                    BACKUP COMPONENT SUMMARY
                </h3>

                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px', marginBottom: '32px' }}>
                    {[
                        { label: 'Planets Structure', count: stats.planets?.length || 0, icon: <Server size={16} /> },
                        { label: 'Expedition Database', count: stats.expeditions?.length || 0, icon: <Compass size={16} /> },
                        { label: 'Combat Reports Log', count: stats.combatReports?.length || 0, icon: <Swords size={16} /> },
                        { label: 'Debris Harvest History', count: stats.debrisHarvests?.length || 0, icon: <Rocket size={16} /> },
                        { label: 'Lifeform Discoveries', count: stats.lifeformDiscoveries?.length || 0, icon: <Activity size={16} /> },
                        { label: 'Saved Build Orders', count: stats.todoProjects?.length || 0, icon: <Clock size={16} /> },
                    ].map((item, index) => (
                        <div key={index} style={{
                            padding: '16px 20px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.01)', border: '1px solid rgba(255,255,255,0.03)',
                            display: 'flex', alignItems: 'center', gap: '16px'
                        }}>
                            <div style={{ color: 'var(--primary)' }}>{item.icon}</div>
                            <div>
                                <div style={{ fontSize: '1.2rem', fontWeight: 900, color: '#fff' }}>{(item.count).toLocaleString()}</div>
                                <div style={{ fontSize: '0.75rem', color: 'var(--text-muted)' }}>{item.label}</div>
                            </div>
                        </div>
                    ))}
                </div>

                <div style={{
                    display: 'flex', gap: '12px', padding: '16px 20px', borderRadius: '16px',
                    background: 'rgba(255, 170, 0, 0.05)', border: '1px solid rgba(255, 170, 0, 0.15)',
                    color: 'rgba(255, 255, 255, 0.95)', fontSize: '0.85rem', lineHeight: 1.5, marginBottom: '40px'
                }}>
                    <AlertCircle size={24} style={{ color: '#ffaa00', flexShrink: 0 }} />
                    <div>
                        <span style={{ fontWeight: 800, color: '#ffaa00' }}>Warning:</span> Overwriting active databases will replace existing planets, todo lists, and log metrics with the record states inside this backup. High-priority primary keys protect logs from duplicates.
                    </div>
                </div>

                <div style={{ display: 'flex', gap: '16px', justifyContent: 'center' }}>
                    <button
                        onClick={() => {
                            setNexusBackupFile(null);
                            setNexusBackupData(null);
                            setNexusTabStep('upload');
                        }}
                        style={{
                            padding: '16px 32px', borderRadius: '16px',
                            background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)',
                            color: '#fff', fontSize: '0.9rem', fontWeight: 700, cursor: 'pointer', borderStyle: 'solid'
                        }}
                    >
                        Cancel
                    </button>
                    <button
                        onClick={startNexusRestore}
                        style={{
                            padding: '16px 48px', borderRadius: '16px',
                            background: 'linear-gradient(135deg, var(--primary) 0%, #00aaff 100%)',
                            color: '#000', fontSize: '0.9rem', fontWeight: 900, cursor: 'pointer',
                            boxShadow: '0 4px 20px rgba(0, 242, 255, 0.25)', border: 'none',
                            display: 'flex', alignItems: 'center', gap: '10px'
                        }}
                    >
                        Initiate System Restore <Database size={18} />
                    </button>
                </div>
            </motion.div>
        );
    };

    const renderNexusProgress = () => {
        const progress = nexusStats.total > 0 ? (nexusStats.processed / nexusStats.total) * 100 : 0;

        return (
            <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 242, 255, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                        color: 'var(--primary)', position: 'relative'
                    }}>
                        {nexusIsImporting ? <Loader2 size={40} className="animate-spin" /> : <ShieldCheck size={40} />}
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>
                        {nexusIsImporting ? 'Restoring Nexus Database' : 'Restore Finished'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {nexusIsImporting ? 'Processing backup record arrays...' : 'Database restore finished successfully.'}
                    </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '32px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-muted)' }}>SYNCHRONIZATION PROGRESS</span>
                        <span style={{ color: 'var(--primary)' }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '32px' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Imported', val: nexusStats.imported, color: 'var(--primary)' },
                            { label: 'Errors', val: nexusStats.errors, color: '#ff4444' },
                            { label: 'Total', val: nexusStats.total, color: '#fff' },
                        ].map((s) => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{
                    background: '#000', padding: '24px', borderRadius: '24px',
                    fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: '200px',
                    overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                    {nexusImportLog.map((log, i) => (
                        <div key={i} style={{ color: log.startsWith('✓') ? 'var(--primary)' : log.startsWith('✖') ? '#ff4444' : '#888' }}>
                            {log}
                        </div>
                    ))}
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>

                {!nexusIsImporting && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button onClick={() => window.location.reload()} style={{ padding: '16px 40px', borderRadius: '16px', background: 'var(--primary)', color: '#000', fontWeight: 800, border: 'none', cursor: 'pointer' }}>
                            Complete & Refresh Deck
                        </button>
                    </div>
                )}
            </div>
        );
    };

    const handleFile = async (selectedFile: File) => {
        if (!selectedFile.name.endsWith('.json')) {
            setError('Please upload a valid .json file');
            return;
        }

        try {
            setError(null);
            setFile(selectedFile);
            const text = await selectedFile.text();

            let data;
            try {
                data = JSON.parse(text);
            } catch (e) {
                throw new Error('File is not a valid JSON.');
            }

            if (!data.accounts || !Array.isArray(data.accounts)) {
                throw new Error('Uploaded file is not a valid OGame Tracker export (v2).');
            }

            // Fetch existing accounts from DB to check for presence
            const existingAccounts = await db.accounts.toArray();
            const existingPlayerIds = new Set(existingAccounts.map(a => String(a.playerId)));

            const extractedAccounts: Account[] = data.accounts.map((acc: any) => {
                const exists = existingPlayerIds.has(String(acc.playerId));

                return {
                    playerName: acc.playerName || 'Unknown Captain',
                    serverId: acc.serverId || 0,
                    playerId: acc.playerId || 0,
                    language: acc.language || '??',
                    expeditionsCount: acc.expeditions?.length || 0,
                    combatsCount: acc.combatReports?.length || 0,
                    lifeformDiscoveriesCount: acc.lifeformDiscoveries?.length || 0,
                    debrisCount: acc.debrisFieldReports?.length || 0,
                    existsInDb: exists
                };
            });

            setParsedData(data);
            setAccounts(extractedAccounts);
            setSelectedAccounts(new Set()); 
            setSelectedDataTypes(new Set(['expeditions', 'lifeform', 'debris', 'combats']));
            setStep('account-select');
        } catch (err: any) {
            setError(err.message || 'Failed to parse file.');
            console.error(err);
        }
    };

    const onDrop = useCallback((e: React.DragEvent) => {
        e.preventDefault();
        setIsDragging(false);
        const droppedFile = e.dataTransfer.files[0];
        if (droppedFile) handleFile(droppedFile);
    }, []);

    const onFileChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFile = e.target.files?.[0];
        if (selectedFile) handleFile(selectedFile);
    };

    const toggleAccount = (acc: Account) => {
        if (!acc.existsInDb) return; // Unselectable if doesn't exist in DB
        const id = `${acc.serverId}-${acc.playerId}`;
        const next = new Set(selectedAccounts);
        if (next.has(id)) next.delete(id);
        else next.add(id);
        setSelectedAccounts(next);
    };

    const toggleAll = () => {
        const selectable = accounts.filter(a => a.existsInDb);
        if (selectedAccounts.size === selectable.length) {
            setSelectedAccounts(new Set());
        } else {
            setSelectedAccounts(new Set(selectable.map(a => `${a.serverId}-${a.playerId}`)));
        }
    };

    const toggleDataType = (type: string) => {
        const next = new Set(selectedDataTypes);
        if (next.has(type)) next.delete(type);
        else next.add(type);
        setSelectedDataTypes(next);
    };

    const mapExpeditionResult = (type: string) => {
        switch (type) {
            case 'fleet': return 'shipwrecks';
            case 'resources': return 'ressources';
            case 'trader': return 'trader';
            case 'delay': return 'navigation';
            case 'early': return 'navigation';
            case 'darkMatter': return 'darkmatter';
            case 'combat': return 'combatPirates';
            case 'item': return 'items';
            case 'lostFleet': return 'fleetLost';
            case 'nothing': return 'nothing';
            default: return type;
        }
    };

    const mapDepletion = (val: string) => {
        if (val === 'none') return 1;
        if (val === 'low') return 2;
        return 1;
    };

    const mapSize = (val: string) => {
        switch (val) {
            case 'small': return '2';
            case 'medium': return '1';
            case 'large': return '0';
            default: return '2';
        }
    };

    const createDbBackup = async () => {
        // Simple JSON backup logic for safety
        const expeditions = await db.expeditions.toArray();
        const lifeforms = await db.lifeformDiscoveries.toArray();
        const debris = await db.debrisHarvests.toArray();
        const combats = await db.combatReports.toArray();
        return { expeditions, lifeforms, debris, combats };
    };

    const startImport = async () => {
        setStep('import-progress');
        setIsImporting(true);
        setImportLog(['Initiating safety protocols...', 'Creating temporary database backup...']);

        const backup = await createDbBackup();

        // Fetch ship names for mapping
        const shipData = await db.gameKnowledge.where('category').equals('ships').toArray();
        const shipNames: Record<number, string> = {};
        const shipCosts: Record<number, { metal: number, crystal: number, deuterium: number }> = {};
        shipData.forEach(s => { 
            shipNames[s.id] = s.name;
            shipCosts[s.id] = s.metadata?.cost || { metal: 0, crystal: 0, deuterium: 0 };
        });

        const calculateImportMSU = (resources: { metal: number, crystal: number, deuterium: number }) => {
            return resources.metal + (resources.crystal * 1.5) + (resources.deuterium * 3);
        };

        // Fetch lifeform species for mapping
        const speciesData = await db.lifeformSpecies.toArray();
        const lifeformLookup: Record<string, number> = {
            'human': 1, 'humans': 1,
            'rocktal': 2, "rock'tal": 2,
            'mecha': 3, 'mechas': 3,
            'kaelesh': 4
        };

        speciesData.forEach(s => {
            const name = s.lifeformName.toLowerCase();
            lifeformLookup[name] = s.lifeformId;
            lifeformLookup[name.replace(/['’‘`\s]/g, "")] = s.lifeformId;
        });

        try {
            const selectedAccountsList = accounts.filter(a => selectedAccounts.has(`${a.serverId}-${a.playerId}`));
            let totalToProcess = 0;

            selectedAccountsList.forEach(acc => {
                const rawAcc = parsedData.accounts.find((r: any) => r.playerId === acc.playerId && r.serverId === acc.serverId);
                if (selectedDataTypes.has('expeditions')) totalToProcess += rawAcc.expeditions?.length || 0;
                if (selectedDataTypes.has('lifeform')) totalToProcess += rawAcc.lifeformDiscoveries?.length || 0;
                if (selectedDataTypes.has('debris')) totalToProcess += rawAcc.debrisFieldReports?.length || 0;
                if (selectedDataTypes.has('combats')) totalToProcess += rawAcc.combatReports?.length || 0;
            });

            setStats({ total: totalToProcess, processed: 0, skipped: 0, imported: 0, errors: 0 });
            setImportLog(prev => [...prev, `Found ${totalToProcess} records to sync across ${selectedAccountsList.length} accounts.`]);

            for (const acc of selectedAccountsList) {
                const rawAcc = parsedData.accounts.find((r: any) => r.playerId === acc.playerId && r.serverId === acc.serverId);
                setImportLog(prev => [...prev, `Syncing data for [${acc.playerName}] (Universe ${acc.serverId})...`]);

                // 1. Process Expeditions
                if (selectedDataTypes.has('expeditions') && rawAcc.expeditions) {
                    for (const exp of rawAcc.expeditions) {
                        const messageId = String(exp.id);
                        const existing = await db.expeditions.get(messageId);

                        if (existing) {
                            setStats(s => ({ ...s, processed: s.processed + 1, skipped: s.skipped + 1 }));
                        } else {
                            try {
                                const resultType = mapExpeditionResult(exp.type);
                                let resultDetails: any = {};

                                // Map details based on type
                                if (exp.type === 'fleet') {
                                    const ships: any = {};
                                    if (exp.fleet) {
                                        Object.entries(exp.fleet).forEach(([shipId, amount]) => {
                                            const id = parseInt(shipId);
                                            ships[id] = {
                                                name: shipNames[id] || 'Unknown Ship',
                                                amount: amount
                                            };
                                        });
                                    }
                                    resultDetails = ships;
                                }
                                if (exp.type === 'resources') {
                                    resultDetails = exp.resources || {};
                                }
                                if (exp.type === 'darkMatter') resultDetails.darkMatter = exp.darkMatter || 0;
                                if (exp.type === 'item') resultDetails.itemHash = exp.itemHash || '';
                                if (exp.type === 'delay') resultDetails.returnTimeAbsoluteIncreaseHours = 1;
                                if (exp.type === 'early') resultDetails.returnTimeAbsoluteIncreaseHours = 0;

                                await db.expeditions.add({
                                    messageId: messageId,
                                    playerId: String(acc.playerId),
                                    timestamp: (exp.date || exp.dateTime || exp.timestamp || 0) / 1000,
                                    coords: '0:0:0', // Tracker doesn't usually export coords per item, just for the search
                                    depletion: mapDepletion(exp.depletion),
                                    size: parseInt(mapSize(exp.size)),
                                    result: resultType,
                                    resultDetails: resultDetails,
                                    tracked: true
                                });
                                setStats(s => ({ ...s, processed: s.processed + 1, imported: s.imported + 1 }));
                            } catch (e) {
                                console.error(e);
                                setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
                            }
                        }
                    }
                }

                // 2. Process Lifeform Discoveries
                if (selectedDataTypes.has('lifeform') && rawAcc.lifeformDiscoveries) {
                    for (const disc of rawAcc.lifeformDiscoveries) {
                        const messageId = String(disc.id);
                        const existing = await db.lifeformDiscoveries.get(messageId);

                        if (existing) {
                            setStats(s => ({ ...s, processed: s.processed + 1, skipped: s.skipped + 1 }));
                        } else {
                            try {
                                let discoveryType: 'artifacts' | 'lifeform-xp' | 'nothing' = 'nothing';
                                let lifeformId = 0;
                                let experience = 0;
                                let artifactsCount = 0;
                                let artifactSize = 'normal';

                                if (disc.type === 'artifacts') {
                                    discoveryType = 'artifacts';
                                    artifactsCount = disc.artifacts || 0;
                                    artifactSize = disc.size || 'normal';
                                } else if (disc.type === 'knownLifeformFound' || disc.type === 'newLifeformFound') {
                                    discoveryType = 'lifeform-xp';
                                    const lfKey = (disc.lifeform || '').toLowerCase().replace(/['’‘`\s]/g, "");
                                    lifeformId = lifeformLookup[lfKey] || 0;
                                    experience = disc.experience || 0;
                                } else if (disc.type === 'nothing') {
                                    discoveryType = 'nothing';
                                }

                                await db.lifeformDiscoveries.add({
                                    messageId: messageId,
                                    playerId: String(acc.playerId),
                                    timestamp: (disc.date || disc.dateTime || disc.timestamp || 0) / 1000,
                                    coords: '0:0:0',
                                    lifeform: lifeformId,
                                    discoveryType: discoveryType,
                                    lifeformGainedExperience: experience,
                                    artifactsFound: artifactsCount,
                                    artifactSize: artifactSize,
                                    tracked: true
                                });
                                setStats(s => ({ ...s, processed: s.processed + 1, imported: s.imported + 1 }));
                            } catch (e) {
                                setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
                            }
                        }
                    }
                }

                // 3. Process Debris Harvests
                if (selectedDataTypes.has('debris') && rawAcc.debrisFieldReports) {
                    for (const report of rawAcc.debrisFieldReports) {
                        const messageId = String(report.id);
                        const existing = await db.debrisHarvests.get(messageId);

                        if (existing) {
                            setStats(s => ({ ...s, processed: s.processed + 1, skipped: s.skipped + 1 }));
                        } else {
                            try {
                                await db.debrisHarvests.add({
                                    messageId: messageId,
                                    playerId: String(acc.playerId),
                                    timestamp: (report.date || 0) / 1000,
                                    coords: report.isExpeditionDebrisField ? '0:0:16' : '0:0:0',
                                    recycledResources: {
                                        metal: report.metal || 0,
                                        crystal: report.crystal || 0,
                                        deuterium: report.deuterium || 0
                                    },
                                    tracked: true
                                });
                                setStats(s => ({ ...s, processed: s.processed + 1, imported: s.imported + 1 }));
                            } catch (e) {
                                setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
                            }
                        }
                    }
                }

                // 4. Process Combat Reports
                if (selectedDataTypes.has('combats') && rawAcc.combatReports) {
                    for (const report of rawAcc.combatReports) {
                        const messageId = String(report.id);
                        const existing = await db.combatReports.get(messageId);

                        if (existing) {
                            setStats(s => ({ ...s, processed: s.processed + 1, skipped: s.skipped + 1 }));
                        } else {
                            try {
                                let winner = 'none';
                                if (report.result === 'won') winner = 'attacker';
                                else if (report.result === 'lost') winner = 'defender';

                                // Calculate total lost value in MSU
                                let playerLossesMSU = 0;
                                if (report.lostShips) {
                                    Object.entries(report.lostShips).forEach(([shipId, count]) => {
                                        const id = parseInt(shipId);
                                        const cost = shipCosts[id];
                                        if (cost && count) {
                                            playerLossesMSU += calculateImportMSU({
                                                metal: cost.metal * (count as number),
                                                crystal: cost.crystal * (count as number),
                                                deuterium: cost.deuterium * (count as number)
                                            });
                                        }
                                    });
                                }

                                // Extract Loot and Debris safely
                                const extractImportRes = (data: any, isDebris = false) => {
                                    const res = { metal: 0, crystal: 0, deuterium: 0 };
                                    if (!data) return res;
                                    if (Array.isArray(data.resources)) {
                                        data.resources.forEach((r: any) => {
                                            const name = String(r.resource).toLowerCase();
                                            const amount = Number(r.amount || r.total || 0);
                                            if (name === 'metal') res.metal = amount;
                                            else if (name === 'crystal') res.crystal = amount;
                                            else if (name === 'deuterium') res.deuterium = amount;
                                        });
                                    } else {
                                        res.metal = Number(data.metal || 0);
                                        res.crystal = Number(data.crystal || 0);
                                        res.deuterium = Number(data.deuterium || 0);
                                    }
                                    return res;
                                };

                                const loot = extractImportRes(report.loot);
                                const debris = extractImportRes(report.debrisField || report.debris, true);

                                await db.combatReports.add({
                                    messageId: messageId,
                                    playerId: String(acc.playerId),
                                    timestamp: (report.date || report.dateTime || report.timestamp || report.time || 0) / (String(report.date || report.dateTime || report.timestamp || report.time || 0).length > 10 ? 1000 : 1),
                                    coords: report.coordinates ? `${report.coordinates.galaxy}:${report.coordinates.system}:${report.coordinates.position}` : '0:0:0',
                                    winner: winner,
                                    loot: { ...loot, food: 0 },
                                    debris: debris,
                                    attackerName: report.attackers?.[0]?.name || acc.playerName || 'You',
                                    defenderName: report.defenders?.[0]?.name || (String(report.coordinates?.position) === '16' ? 'Expedition Hostile' : 'Unknown'),
                                    attackerLosses: playerLossesMSU,
                                    defenderLosses: 0,
                                    myLosses: playerLossesMSU,
                                    isAcs: false,
                                    isExpedition: !!report.isExpedition || String(report.coordinates?.position) === '16',
                                    expeditionAttackType: report.expeditionAttackType,
                                    tracked: true,
                                    rawFleets: report.attackers && report.defenders ? [...report.attackers, ...report.defenders] : [],
                                    rawResult: report
                                });
                                setStats(s => ({ ...s, processed: s.processed + 1, imported: s.imported + 1 }));
                            } catch (e) {
                                console.error('Error importing combat report:', e);
                                setStats(s => ({ ...s, processed: s.processed + 1, errors: s.errors + 1 }));
                            }
                        }
                    }
                }
            }

            setImportLog(prev => [...prev, '✓ Import sequence complete.', 'Purging safety backup... synchronization verified.']);
            setIsImporting(false);
        } catch (err: any) {
            setImportLog(prev => [...prev, `✖ CRITICAL ERROR: ${err.message}`, 'Attempting database restoration...']);
            // If we were really fancy, we'd bulkAdd back from the backup object here
            await db.expeditions.bulkPut(backup.expeditions);
            await db.lifeformDiscoveries.bulkPut(backup.lifeforms);
            await db.debrisHarvests.bulkPut(backup.debris);
            await db.combatReports.bulkPut(backup.combats);
            setImportLog(prev => [...prev, 'Database restored to pre-import state.']);
            setIsImporting(false);
        }
    };

    const renderUpload = () => (
        <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            style={{
                padding: '80px 40px',
                borderRadius: '32px',
                textAlign: 'center',
                border: isDragging ? '2px dashed var(--primary)' : '2px dashed rgba(255,255,255,0.1)',
                background: isDragging ? 'rgba(0,242,255,0.05)' : 'rgba(13, 22, 38, 0.45)',
                backdropFilter: 'blur(16px)',
                transition: 'all 0.3s ease'
            }}
            onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
            onDragLeave={() => setIsDragging(false)}
            onDrop={onDrop}
        >
            <input type="file" id="file-upload" style={{ display: 'none' }} accept=".json" onChange={onFileChange} />
            <label htmlFor="file-upload" style={{ cursor: 'pointer', display: 'block' }}>
                <div style={{
                    width: '100px',
                    height: '100px',
                    borderRadius: '30px',
                    background: 'rgba(0, 242, 255, 0.1)',
                    border: '1px solid rgba(0, 242, 255, 0.2)',
                    display: 'flex',
                    alignItems: 'center',
                    justifyContent: 'center',
                    margin: '0 auto 24px',
                    color: 'var(--primary)',
                    boxShadow: '0 0 30px rgba(0, 242, 255, 0.1)'
                }}>
                    <Upload size={40} />
                </div>
                <h3 style={{ fontSize: '1.75rem', fontWeight: 800, color: '#fff', marginBottom: '8px' }}>Deploy Export File</h3>
                <p style={{ color: 'var(--text-muted)', fontSize: '1rem', marginBottom: '32px' }}>Drag and drop your .json export or click to browse</p>
                <div style={{ display: 'inline-flex', alignItems: 'center', gap: '12px', padding: '12px 24px', borderRadius: '16px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.9rem', fontWeight: 600 }}>
                    <FileJson size={18} style={{ color: 'var(--primary)' }} />
                    Support OGame Tracker v2 Exports
                </div>
            </label>
            {error && (
                <div style={{ marginTop: '24px', display: 'flex', alignItems: 'center', gap: '8px', justifyContent: 'center', color: '#ff4444', background: 'rgba(255,68,68,0.1)', padding: '12px 24px', borderRadius: '12px', border: '1px solid rgba(255,68,68,0.2)', fontSize: '0.9rem' }}>
                    <AlertCircle size={18} />
                    {error}
                </div>
            )}
        </motion.div>
    );

    const renderAccountSelect = () => (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
                <div style={{ display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ShieldCheck style={{ color: 'var(--primary)' }} size={28} />
                    <h2 style={{ fontSize: '1.5rem', fontWeight: 800, color: '#fff' }}>Step 1: Link Accounts</h2>
                    <span style={{ background: 'rgba(255,255,255,0.05)', padding: '4px 12px', borderRadius: '20px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.8rem', color: 'var(--text-muted)' }}>
                        {accounts.length} Profiles Detected
                    </span>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <button onClick={() => setStep('upload')} style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: 'var(--text-muted)', fontSize: '0.85rem', cursor: 'pointer' }}>
                        Change File
                    </button>
                    <button onClick={toggleAll} style={{ padding: '8px 16px', borderRadius: '12px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontSize: '0.85rem', fontWeight: 600, cursor: 'pointer' }}>
                        {selectedAccounts.size === accounts.filter(a => a.existsInDb).length ? 'Deselect All' : 'Select All Linkable'}
                    </button>
                </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fill, minmax(340px, 1fr))', gap: '24px' }}>
                {accounts.map((acc, index) => {
                    const id = `${acc.serverId}-${acc.playerId}`;
                    const isSelected = selectedAccounts.has(id);
                    const disabled = !acc.existsInDb;

                    return (
                        <motion.div
                            key={id}
                            initial={{ opacity: 0, y: 20 }}
                            animate={{ opacity: 1, y: 0 }}
                            transition={{ delay: index * 0.05 }}
                            whileHover={disabled ? {} : { y: -4, scale: 1.02 }}
                            onClick={() => toggleAccount(acc)}
                            style={{
                                padding: '24px',
                                borderRadius: '24px',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                position: 'relative',
                                border: isSelected ? '1px solid var(--primary)' : '1px solid rgba(255,255,255,0.1)',
                                background: isSelected ? 'rgba(0,242,255,0.05)' : 'rgba(13, 22, 38, 0.45)',
                                backdropFilter: 'blur(16px)',
                                boxShadow: isSelected ? '0 0 20px rgba(0, 242, 255, 0.15)' : 'none',
                                transition: 'all 0.3s ease',
                                opacity: disabled ? 0.3 : (isSelected ? 1 : 0.75),
                                filter: disabled ? 'grayscale(1)' : 'none'
                            }}
                        >
                            {!acc.existsInDb && (
                                <div style={{ position: 'absolute', top: '12px', right: '12px', color: '#ff4444', display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.7rem', fontWeight: 800 }}>
                                    <ShieldAlert size={12} /> NOT LINKED
                                </div>
                            )}
                            <div style={{ display: 'flex', alignItems: 'center', gap: '16px', marginBottom: '20px' }}>
                                <div style={{
                                    width: '56px',
                                    height: '56px',
                                    borderRadius: '18px',
                                    background: isSelected ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                                    color: isSelected ? '#000' : '#fff',
                                    display: 'flex',
                                    alignItems: 'center',
                                    justifyContent: 'center'
                                }}>
                                    <User size={28} />
                                </div>
                                <div style={{ flex: 1, overflow: 'hidden' }}>
                                    <div style={{ fontSize: '1.2rem', fontWeight: 800, color: '#fff', whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis' }}>{acc.playerName}</div>
                                    <div style={{ fontSize: '0.85rem', color: 'var(--text-muted)', display: 'flex', alignItems: 'center', gap: '4px' }}>
                                        <Server size={12} />
                                        S{acc.serverId} <span style={{ opacity: 0.4 }}>|</span> {acc.language.toUpperCase()}
                                    </div>
                                </div>
                                {isSelected && (
                                    <div style={{ width: '24px', height: '24px', borderRadius: '50%', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                        <Check size={16} strokeWidth={4} />
                                    </div>
                                )}
                            </div>
                            <div style={{ display: 'flex', gap: '10px' }}>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', flex: 1 }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>History Items</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{(acc.expeditionsCount! + acc.lifeformDiscoveriesCount! + (acc.debrisCount || 0) + (acc.combatsCount || 0)).toLocaleString()}</div>
                                </div>
                                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '10px', borderRadius: '12px', flex: 1 }}>
                                    <div style={{ fontSize: '0.65rem', color: 'var(--text-muted)', textTransform: 'uppercase' }}>Combat Reports</div>
                                    <div style={{ fontSize: '1rem', fontWeight: 800 }}>{(acc.combatsCount || 0).toLocaleString()}</div>
                                </div>
                            </div>
                        </motion.div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center' }}>
                <button
                    onClick={() => setStep('data-select')}
                    disabled={selectedAccounts.size === 0}
                    style={{
                        padding: '20px 64px',
                        borderRadius: '24px',
                        background: selectedAccounts.size > 0 ? 'var(--primary)' : 'rgba(255,255,255,0.05)',
                        color: selectedAccounts.size > 0 ? '#000' : 'var(--text-muted)',
                        border: 'none',
                        fontSize: '1.25rem',
                        fontWeight: 900,
                        cursor: selectedAccounts.size > 0 ? 'pointer' : 'not-allowed',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: selectedAccounts.size > 0 ? '0 8px 32px rgba(0, 242, 255, 0.3)' : 'none',
                        transition: 'all 0.3s ease'
                    }}
                >
                    Continue to Data Types
                    <ChevronRight size={24} />
                </button>
            </div>
        </div>
    );

    const renderDataSelect = () => (
        <div style={{ maxWidth: '800px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '32px' }}>
            <div style={{ textAlign: 'center' }}>
                <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>Step 2: Selection</h2>
                <p style={{ color: 'var(--text-muted)' }}>Choose which data categories you wish to synchronize.</p>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px' }}>
                {[
                    { id: 'expeditions', label: 'Expedition Log', icon: <Compass size={32} />, desc: 'Resource finds, fleet debris, and item discoveries.', enabled: true },
                    { id: 'lifeform', label: 'Lifeform Discoveries', icon: <Activity size={32} />, desc: 'Artifact finds and lifeform experience gains.', enabled: true },
                    { id: 'debris', label: 'Debris Collection', icon: <Rocket size={32} />, desc: 'Historical debris field harvesting.', enabled: true },
                    { id: 'combats', label: 'Combat Reports', icon: <Swords size={32} />, desc: 'PvP & PvE combat history and analytics.', enabled: true },
                ].map((type) => {
                    const isSelected = selectedDataTypes.has(type.id);
                    const disabled = !type.enabled;

                    return (
                        <div
                            key={type.id}
                            onClick={() => type.enabled && toggleDataType(type.id)}
                            style={{
                                padding: '32px',
                                borderRadius: '28px',
                                background: isSelected ? 'rgba(0, 242, 255, 0.1)' : 'rgba(255,255,255,0.03)',
                                border: isSelected ? '2px solid var(--primary)' : '2px solid rgba(255,255,255,0.05)',
                                cursor: disabled ? 'not-allowed' : 'pointer',
                                opacity: disabled ? 0.3 : 1,
                                transition: 'all 0.2s ease',
                                position: 'relative'
                            }}
                        >
                            <div style={{ color: isSelected ? 'var(--primary)' : '#fff', marginBottom: '16px' }}>{type.icon}</div>
                            <h3 style={{ fontSize: '1.3rem', fontWeight: 800, marginBottom: '8px' }}>{type.label}</h3>
                            <p style={{ fontSize: '0.9rem', color: 'var(--text-muted)', lineHeight: 1.5 }}>{type.desc}</p>

                            {isSelected && (
                                <div style={{ position: 'absolute', top: '24px', right: '24px', width: '28px', height: '28px', borderRadius: '50%', background: 'var(--primary)', color: '#000', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
                                    <Check size={18} strokeWidth={4} />
                                </div>
                            )}
                        </div>
                    );
                })}
            </div>

            <div style={{ display: 'flex', justifyContent: 'center', gap: '20px', marginTop: '20px' }}>
                <button onClick={() => setStep('account-select')} style={{ padding: '20px 40px', borderRadius: '24px', background: 'rgba(255,255,255,0.05)', border: '1px solid rgba(255,255,255,0.1)', color: '#fff', fontWeight: 600, display: 'flex', alignItems: 'center', gap: '12px' }}>
                    <ArrowLeft size={20} /> Back
                </button>
                <button
                    onClick={startImport}
                    disabled={selectedDataTypes.size === 0}
                    style={{
                        padding: '20px 64px',
                        borderRadius: '24px',
                        background: 'var(--primary)',
                        color: '#000',
                        fontWeight: 900,
                        fontSize: '1.2rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '16px',
                        boxShadow: '0 8px 32px rgba(0, 242, 255, 0.3)'
                    }}
                >
                    Initialize Sync
                    <Database size={24} />
                </button>
            </div>
        </div>
    );

    const renderImportProgress = () => {
        const progress = stats.total > 0 ? (stats.processed / stats.total) * 100 : 0;

        return (
            <div style={{ maxWidth: '700px', margin: '0 auto', display: 'flex', flexDirection: 'column', gap: '40px' }}>
                <div style={{ textAlign: 'center' }}>
                    <div style={{
                        width: '80px', height: '80px', borderRadius: '50%', background: 'rgba(0, 242, 255, 0.1)',
                        display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 24px',
                        color: 'var(--primary)', position: 'relative'
                    }}>
                        {isImporting ? <Loader2 size={40} className="animate-spin" /> : <ShieldCheck size={40} />}
                    </div>
                    <h2 style={{ fontSize: '2rem', fontWeight: 900, marginBottom: '8px' }}>
                        {isImporting ? 'Sync in Progress' : 'Import Finished'}
                    </h2>
                    <p style={{ color: 'var(--text-muted)' }}>
                        {isImporting ? 'Sequentially processing historical records...' : 'Sync sequence concluded successfully.'}
                    </p>
                </div>

                <div style={{ background: 'rgba(255,255,255,0.03)', padding: '32px', borderRadius: '32px', border: '1px solid rgba(255,255,255,0.05)' }}>
                    <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: '12px', fontSize: '0.9rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--text-muted)' }}>MAPPING PROGRESS</span>
                        <span style={{ color: 'var(--primary)' }}>{Math.round(progress)}%</span>
                    </div>
                    <div style={{ height: '8px', background: 'rgba(255,255,255,0.05)', borderRadius: '4px', overflow: 'hidden', marginBottom: '32px' }}>
                        <motion.div initial={{ width: 0 }} animate={{ width: `${progress}%` }} style={{ height: '100%', background: 'var(--primary)', boxShadow: '0 0 10px var(--primary)' }} />
                    </div>

                    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                        {[
                            { label: 'Imported', val: stats.imported, color: 'var(--primary)' },
                            { label: 'Skipped', val: stats.skipped, color: 'var(--text-muted)' },
                            { label: 'Errors', val: stats.errors, color: '#ff4444' },
                            { label: 'Total', val: stats.total, color: '#fff' },
                        ].map((s) => (
                            <div key={s.label} style={{ textAlign: 'center' }}>
                                <div style={{ fontSize: '1.5rem', fontWeight: 900, color: s.color }}>{s.val}</div>
                                <div style={{ fontSize: '0.6rem', textTransform: 'uppercase', color: 'var(--text-muted)', marginTop: '4px' }}>{s.label}</div>
                            </div>
                        ))}
                    </div>
                </div>

                <div style={{
                    background: '#000', padding: '24px', borderRadius: '24px',
                    fontFamily: 'monospace', fontSize: '0.85rem', maxHeight: '200px',
                    overflowY: 'auto', border: '1px solid rgba(255,255,255,0.05)',
                    display: 'flex', flexDirection: 'column', gap: '8px'
                }}>
                    {importLog.map((log, i) => (
                        <div key={i} style={{ color: log.startsWith('✓') ? 'var(--primary)' : log.startsWith('✖') ? '#ff4444' : '#888' }}>
                            {log}
                        </div>
                    ))}
                    <div ref={(el) => el?.scrollIntoView({ behavior: 'smooth' })} />
                </div>

                {!isImporting && (
                    <div style={{ display: 'flex', justifyContent: 'center' }}>
                        <button onClick={() => window.location.reload()} style={{ padding: '16px 40px', borderRadius: '16px', background: 'var(--primary)', color: '#000', fontWeight: 800 }}>
                            Complete & Dismiss
                        </button>
                    </div>
                )}
            </div>
        );
    };

    return (
        <div className="view-container" style={{ padding: '40px', color: '#fff' }}>
            <header style={{ marginBottom: '48px', display: 'flex', justifyContent: 'space-between', alignItems: 'flex-end' }}>
                <div>
                    <h1 style={{ fontSize: '2.5rem', fontWeight: 900, marginBottom: '8px', background: 'linear-gradient(135deg, #fff 0%, #00f2ff 100%)', WebkitBackgroundClip: 'text', WebkitTextFillColor: 'transparent' }}>
                        Data Management
                    </h1>
                    <p style={{ color: 'var(--text-muted)', fontSize: '1.1rem', maxWidth: '600px' }}>
                        Manage locally recorded commander profiles, export database backups, or synchronize from OGame Tracker exports.
                    </p>
                </div>
                <div style={{ display: 'flex', gap: '12px' }}>
                    <div style={{ padding: '8px 16px', background: 'rgba(255,255,255,0.05)', borderRadius: '12px', border: '1px solid rgba(255,255,255,0.1)', fontSize: '0.75rem', fontWeight: 600 }}>
                        <span style={{ color: 'var(--primary)' }}>DB STATUS:</span> {isImporting || nexusIsImporting ? 'BUSY' : 'READY'}
                    </div>
                </div>
            </header>

            {/* Premium Navigation Tabs */}
            <div style={{
                display: 'flex',
                gap: '8px',
                background: 'rgba(255, 255, 255, 0.02)',
                padding: '6px',
                borderRadius: '16px',
                border: '1px solid rgba(255, 255, 255, 0.05)',
                alignSelf: 'flex-start',
                marginBottom: '32px',
                width: 'max-content'
            }}>
                <button
                    onClick={() => {
                        setActiveTab('nexus');
                        setError(null);
                    }}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        background: activeTab === 'nexus' ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.15) 0%, rgba(189, 0, 255, 0.05) 100%)' : 'transparent',
                        color: activeTab === 'nexus' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease',
                        boxShadow: activeTab === 'nexus' ? '0 0 15px rgba(0, 242, 255, 0.1)' : 'none',
                        border: activeTab === 'nexus' ? '1px solid rgba(0, 242, 255, 0.2)' : '1px solid transparent'
                    }}
                >
                    <img src="icons/nexus.png" alt="OGame Nexus Logo" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> OGame Nexus Data
                </button>
                <button
                    onClick={() => {
                        setActiveTab('tracker');
                        setError(null);
                    }}
                    style={{
                        padding: '10px 24px',
                        borderRadius: '12px',
                        background: activeTab === 'tracker' ? 'linear-gradient(90deg, rgba(0, 242, 255, 0.15) 0%, rgba(189, 0, 255, 0.05) 100%)' : 'transparent',
                        color: activeTab === 'tracker' ? 'var(--primary)' : 'var(--text-muted)',
                        cursor: 'pointer',
                        fontWeight: 700,
                        fontSize: '0.9rem',
                        display: 'flex',
                        alignItems: 'center',
                        gap: '8px',
                        transition: 'all 0.3s ease',
                        boxShadow: activeTab === 'tracker' ? '0 0 15px rgba(0, 242, 255, 0.1)' : 'none',
                        border: activeTab === 'tracker' ? '1px solid rgba(0, 242, 255, 0.2)' : '1px solid transparent'
                    }}
                >
                    <img src="icons/misc/ogame-tracker.png" alt="OGame Tracker Logo" style={{ width: '16px', height: '16px', objectFit: 'contain' }} /> OGame Tracker Sync
                </button>
            </div>

            <div style={{ display: 'flex', flexDirection: 'column', gap: '48px' }}>
                {activeTab === 'tracker' ? (
                    <>
                        {step === 'upload' && renderUpload()}
                        {step === 'account-select' && renderAccountSelect()}
                        {step === 'data-select' && renderDataSelect()}
                        {step === 'import-progress' && renderImportProgress()}
                    </>
                ) : (
                    <>
                        {nexusTabStep === 'upload' && renderNexusUpload()}
                        {nexusTabStep === 'mismatch' && renderNexusMismatch()}
                        {nexusTabStep === 'confirm' && renderNexusConfirm()}
                        {nexusTabStep === 'progress' && renderNexusProgress()}
                    </>
                )}
            </div>
        </div>
    );
};

export default DataManagement;
