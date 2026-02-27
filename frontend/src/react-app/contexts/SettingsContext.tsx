import { createContext, useContext, useState, useEffect, ReactNode } from 'react';

// Define the shape of our settings
export interface AppSettings {
    // General
    theme: string;

    // Editor
    minimap: boolean;
    lineNumbers: boolean;
    bracketPairColorization: boolean;
    formatOnSave: boolean;
    fontFamily: string;
    fontSize: number;
    wordWrap: boolean;

    // AI Assistant
    aiModel: string;
    aiTemperature: number;
    inlineSuggestions: boolean;
    contextualAwareness: boolean;
    streamingResponse: boolean;

    // Ollama
    ollamaEndpoint: string;
}

// Default settings
const defaultSettings: AppSettings = {
    theme: 'deep-night',
    minimap: true,
    lineNumbers: true,
    bracketPairColorization: true,
    formatOnSave: true,
    fontFamily: "'JetBrains Mono', 'Fira Code', monospace",
    fontSize: 14,
    wordWrap: true,
    aiModel: 'qwen2.5-coder:7b', // Defaulting to the one in Navbar
    aiTemperature: 0.7,
    inlineSuggestions: true,
    contextualAwareness: true,
    streamingResponse: true,
    ollamaEndpoint: 'http://localhost:11434'
};

interface SettingsContextType {
    settings: AppSettings;
    updateSettings: (newSettings: Partial<AppSettings>) => void;
    resetSettings: () => void;
    isSettingsOpen: boolean;
    setIsSettingsOpen: (isOpen: boolean) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: ReactNode }) {
    // Load initial settings from localStorage or use defaults
    const [settings, setSettings] = useState<AppSettings>(() => {
        try {
            const savedSettings = localStorage.getItem('ide-settings');
            if (savedSettings) {
                return { ...defaultSettings, ...JSON.parse(savedSettings) };
            }
        } catch (error) {
            console.error('Failed to parse settings from localStorage:', error);
        }
        return defaultSettings;
    });

    const [isSettingsOpen, setIsSettingsOpen] = useState(false);

    // Save to localStorage whenever settings change
    useEffect(() => {
        try {
            localStorage.setItem('ide-settings', JSON.stringify(settings));
        } catch (error) {
            console.error('Failed to save settings to localStorage:', error);
        }
    }, [settings]);

    // Apply theme class to document based on setting (placeholder for now)
    useEffect(() => {
        if (settings.theme === 'deep-night') {
            document.documentElement.classList.add('dark');
        } else {
            // Logic for other themes later
        }
    }, [settings.theme]);

    const updateSettings = (newSettings: Partial<AppSettings>) => {
        setSettings((prev) => ({ ...prev, ...newSettings }));
    };

    const resetSettings = () => {
        setSettings(defaultSettings);
    };

    return (
        <SettingsContext.Provider value={{ settings, updateSettings, resetSettings, isSettingsOpen, setIsSettingsOpen }}>
            {children}
        </SettingsContext.Provider>
    );
}

// Custom hook to use settings
export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}
