import React, { createContext, useContext, useState, useEffect, useMemo, ReactNode } from 'react';
import { en, LocaleTranslations } from './locales/en';
import { de } from './locales/de';
import { fr } from './locales/fr';
import { ro } from './locales/ro';
import { pl } from './locales/pl';
import { nl } from './locales/nl';
import { es } from './locales/es';
import { it } from './locales/it';
import { ru } from './locales/ru';
import { tr } from './locales/tr';
import { br } from './locales/br';
import { pt } from './locales/pt';
import {
    SupportedLanguage,
    getGameEntityName,
    getMissionName,
    getResourceName,
    getCurrentLanguage,
    detectLanguageFromServerLink,
    OFFICIAL_GAME_ENTITIES,
    OFFICIAL_MISSIONS
} from './gameData';

export type { SupportedLanguage };
export { detectLanguageFromServerLink, getCurrentLanguage };

export interface LanguageInfo {
    code: SupportedLanguage;
    label: string;
    nativeName: string;
    flagAlt: string;
}

export const SUPPORTED_LANGUAGES: Record<SupportedLanguage, LanguageInfo> = {
    en: { code: 'en', label: 'English', nativeName: 'English', flagAlt: 'UK' },
    ro: { code: 'ro', label: 'Romanian', nativeName: 'Română', flagAlt: 'RO' },
    de: { code: 'de', label: 'German', nativeName: 'Deutsch', flagAlt: 'DE' },
    fr: { code: 'fr', label: 'French', nativeName: 'Français', flagAlt: 'FR' },
    pl: { code: 'pl', label: 'Polish', nativeName: 'Polski', flagAlt: 'PL' },
    nl: { code: 'nl', label: 'Dutch', nativeName: 'Nederlands', flagAlt: 'NL' },
    es: { code: 'es', label: 'Spanish', nativeName: 'Español', flagAlt: 'ES' },
    it: { code: 'it', label: 'Italian', nativeName: 'Italiano', flagAlt: 'IT' },
    ru: { code: 'ru', label: 'Russian', nativeName: 'Русский', flagAlt: 'RU' },
    tr: { code: 'tr', label: 'Turkish', nativeName: 'Türkçe', flagAlt: 'TR' },
    br: { code: 'br', label: 'Portuguese (BR)', nativeName: 'Português (BR)', flagAlt: 'BR' },
    pt: { code: 'pt', label: 'Portuguese (PT)', nativeName: 'Português (PT)', flagAlt: 'PT' }
};

const LOCALES: Record<SupportedLanguage, LocaleTranslations> = {
    en,
    ro,
    de,
    fr,
    pl,
    nl,
    es,
    it,
    ru,
    tr,
    br,
    pt
};

// High-fidelity vector flag badges for consistent cross-platform display (avoiding Windows emoji font limitations)
export const FlagIcon: React.FC<{ code: SupportedLanguage; size?: number; rounded?: boolean }> = ({
    code,
    size = 20,
    rounded = true
}) => {
    const width = size;
    const height = Math.round(size * 0.7);
    const radius = rounded ? 3 : 0;

    switch (code) {
        case 'en':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <clipPath id="uk-clip">
                        <rect width="60" height="42" rx={radius * 2} />
                    </clipPath>
                    <g clipPath="url(#uk-clip)">
                        <rect width="60" height="42" fill="#012169" />
                        <path d="M0,0 L60,42 M60,0 L0,42" stroke="#fff" strokeWidth="8" />
                        <path d="M0,0 L60,42 M60,0 L0,42" stroke="#C8102E" strokeWidth="4" />
                        <path d="M30,0 v42 M0,21 h60" stroke="#fff" strokeWidth="12" />
                        <path d="M30,0 v42 M0,21 h60" stroke="#C8102E" strokeWidth="7" />
                    </g>
                </svg>
            );
        case 'de':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="14" y="0" fill="#212529" />
                    <rect width="60" height="14" y="14" fill="#DD0000" />
                    <rect width="60" height="14" y="28" fill="#FFCE00" />
                </svg>
            );
        case 'fr':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="20" height="42" x="0" fill="#002395" />
                    <rect width="20" height="42" x="20" fill="#FFFFFF" />
                    <rect width="20" height="42" x="40" fill="#ED2939" />
                </svg>
            );
        case 'ro':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="20" height="42" x="0" fill="#002B7F" />
                    <rect width="20" height="42" x="20" fill="#FCD116" />
                    <rect width="20" height="42" x="40" fill="#CE1126" />
                </svg>
            );
        case 'pl':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="21" y="0" fill="#FFFFFF" />
                    <rect width="60" height="21" y="21" fill="#DC143C" />
                </svg>
            );
        case 'nl':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="14" y="0" fill="#AE1C28" />
                    <rect width="60" height="14" y="14" fill="#FFFFFF" />
                    <rect width="60" height="14" y="28" fill="#21468B" />
                </svg>
            );
        case 'es':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="42" fill="#AA151B" />
                    <rect width="60" height="21" y="10.5" fill="#F1BF00" />
                </svg>
            );
        case 'it':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="20" height="42" x="0" fill="#009246" />
                    <rect width="20" height="42" x="20" fill="#FFFFFF" />
                    <rect width="20" height="42" x="40" fill="#CE2B37" />
                </svg>
            );
        case 'ru':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="14" y="0" fill="#FFFFFF" />
                    <rect width="60" height="14" y="14" fill="#0039A6" />
                    <rect width="60" height="14" y="28" fill="#D52B1E" />
                </svg>
            );
        case 'tr':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="42" fill="#E30A17" />
                    <circle cx="23" cy="21" r="10" fill="#FFFFFF" />
                    <circle cx="26" cy="21" r="8" fill="#E30A17" />
                    <polygon points="34,16.5 35.8,20.2 39.8,20.2 36.6,22.6 37.8,26.5 34.5,24 31.2,26.5 32.4,22.6 29.2,20.2 33.2,20.2" fill="#FFFFFF" />
                </svg>
            );
        case 'br':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="60" height="42" fill="#009739" />
                    <polygon points="30,5 55,21 30,37 5,21" fill="#FEDD00" />
                    <circle cx="30" cy="21" r="8" fill="#012169" />
                    <path d="M22,23 Q30,17 38,21" stroke="#FFFFFF" strokeWidth="1.5" fill="none" />
                </svg>
            );
        case 'pt':
            return (
                <svg width={width} height={height} viewBox="0 0 60 42" style={{ borderRadius: `${radius}px`, overflow: 'hidden', display: 'inline-block', verticalAlign: 'middle', flexShrink: 0, boxShadow: '0 1px 3px rgba(0,0,0,0.3)' }}>
                    <rect width="24" height="42" x="0" fill="#006600" />
                    <rect width="36" height="42" x="24" fill="#FF0000" />
                    <circle cx="24" cy="21" r="7.5" fill="#FFCC00" stroke="#000000" strokeWidth="0.5" />
                    <path d="M20,16 h8 v7 a4,4 0 0,1 -8,0 z" fill="#FFFFFF" stroke="#000000" strokeWidth="0.5" />
                    <path d="M21,17 h6 v5 a3,3 0 0,1 -6,0 z" fill="#FF0000" />
                    <rect width="3" height="4" x="22.5" y="18" fill="#FFFFFF" />
                </svg>
            );
        default:
            return null;
    }
};

interface TranslationContextType {
    language: SupportedLanguage;
    setLanguage: (lang: SupportedLanguage) => void;
    t: (path: string, fallbackOrParams?: string | Record<string, string | number>, maybeParams?: Record<string, string | number>) => string;
    getEntityName: (id: number | string) => string;
    getMission: (id: number | string) => string;
    getResource: (resource: string) => string;
}

const TranslationContext = createContext<TranslationContextType>({
    language: 'en',
    setLanguage: () => {},
    t: (path: string, fallbackOrParams?: string | Record<string, string | number>) => typeof fallbackOrParams === 'string' ? fallbackOrParams : path,
    getEntityName: (id) => String(id),
    getMission: (id) => String(id),
    getResource: (res) => res
});

const STORAGE_KEY = 'ognexus_selected_language';

export const LanguageProvider: React.FC<{ children: ReactNode }> = ({ children }) => {
    const [language, setLanguageState] = useState<SupportedLanguage>(() => {
        return getCurrentLanguage();
    });

    const setLanguage = (newLang: SupportedLanguage) => {
        setLanguageState(newLang);
        try {
            localStorage.setItem('ognexus_language_manual', 'true');
            localStorage.setItem(STORAGE_KEY, newLang);
            if (typeof chrome !== 'undefined' && chrome.storage?.local) {
                chrome.storage.local.set({ [STORAGE_KEY]: newLang, 'ognexus_language_manual': true });
            }
            window.dispatchEvent(new CustomEvent('ognexus_language_changed', { detail: { language: newLang } }));
        } catch (e) {
            console.warn('[i18n] Failed to persist language:', e);
        }
    };

    useEffect(() => {
        // Sync with chrome.storage.local if available
        if (typeof chrome !== 'undefined' && chrome.storage?.local) {
            chrome.storage.local.get([STORAGE_KEY, 'ognexus_language_manual', 'ognexus_server_detected_language'], (res) => {
                const isManual = res?.['ognexus_language_manual'] === true;
                const stored = res?.[STORAGE_KEY];
                const detected = res?.['ognexus_server_detected_language'];

                if (isManual && stored && (stored in LOCALES) && stored !== language) {
                    setLanguageState(stored as SupportedLanguage);
                } else if (!isManual && detected && (detected in LOCALES) && detected !== language) {
                    setLanguageState(detected as SupportedLanguage);
                }
            });

            const handleStorageChange = (changes: { [key: string]: chrome.storage.StorageChange }, areaName: string) => {
                if (areaName === 'local') {
                    if (changes[STORAGE_KEY]?.newValue) {
                        const next = changes[STORAGE_KEY].newValue;
                        if (next && (next in LOCALES)) {
                            setLanguageState(next as SupportedLanguage);
                        }
                    } else if (changes['ognexus_server_detected_language']?.newValue) {
                        const isManual = localStorage.getItem('ognexus_language_manual') === 'true';
                        if (!isManual) {
                            const next = changes['ognexus_server_detected_language'].newValue;
                            if (next && (next in LOCALES)) {
                                setLanguageState(next as SupportedLanguage);
                            }
                        }
                    }
                }
            };
            chrome.storage.onChanged.addListener(handleStorageChange);
            return () => chrome.storage.onChanged.removeListener(handleStorageChange);
        }
    }, [language]);

    useEffect(() => {
        const handleLangEvent = (e: Event) => {
            const detail = (e as CustomEvent).detail;
            if (detail?.language && detail.language !== language && (detail.language in LOCALES)) {
                setLanguageState(detail.language);
            }
        };
        window.addEventListener('ognexus_language_changed', handleLangEvent);
        return () => window.removeEventListener('ognexus_language_changed', handleLangEvent);
    }, [language]);

    // Translate helper function
    const t = useMemo(() => {
        return (path: string, fallbackOrParams?: string | Record<string, string | number>, maybeParams?: Record<string, string | number>): string => {
            const defaultFallback = typeof fallbackOrParams === 'string' ? fallbackOrParams : undefined;
            const params = typeof fallbackOrParams === 'object' ? fallbackOrParams : maybeParams;
            const keys = path.split('.');
            let current: any = LOCALES[language];
            let fallback: any = LOCALES['en'];

            for (const key of keys) {
                if (current && typeof current === 'object' && key in current) {
                    current = current[key];
                } else {
                    current = undefined;
                    break;
                }
            }

            // Fallback to English or defaultFallback if translation is missing in chosen language
            if (current === undefined || typeof current !== 'string') {
                for (const key of keys) {
                    if (fallback && typeof fallback === 'object' && key in fallback) {
                        fallback = fallback[key];
                    } else {
                        fallback = undefined;
                        break;
                    }
                }
                current = typeof fallback === 'string' ? fallback : (defaultFallback ?? path);
            }

            // Interpolate dynamic parameters like {level}, {cost}
            if (params && typeof current === 'string') {
                Object.entries(params).forEach(([paramKey, paramValue]) => {
                    current = current.replace(new RegExp(`\\{${paramKey}\\}`, 'g'), String(paramValue));
                });
            }

            return current;
        };
    }, [language]);

    const getEntityName = useMemo(() => {
        return (id: number | string) => getGameEntityName(id, language);
    }, [language]);

    const getMission = useMemo(() => {
        return (id: number | string) => getMissionName(id, language);
    }, [language]);

    const getResource = useMemo(() => {
        return (resource: string) => getResourceName(resource, language);
    }, [language]);

    const value = useMemo(() => ({
        language,
        setLanguage,
        t,
        getEntityName,
        getMission,
        getResource
    }), [language, t, getEntityName, getMission, getResource]);

    return (
        <TranslationContext.Provider value={value}>
            {children}
        </TranslationContext.Provider>
    );
};

export const useTranslation = () => useContext(TranslationContext);
export { getGameEntityName, getMissionName, getResourceName, OFFICIAL_GAME_ENTITIES, OFFICIAL_MISSIONS };
