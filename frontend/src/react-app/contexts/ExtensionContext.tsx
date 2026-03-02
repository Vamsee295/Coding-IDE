import React, { createContext, useContext, useState, useEffect, useCallback, ReactNode } from 'react';
import { Extension } from '@/types/extension';
import { extensionService } from '@/services/extensionService';

interface ExtensionContextType {
    extensions: Extension[];
    loading: boolean;
    error: string | null;
    refreshExtensions: () => Promise<void>;
    isExtensionEnabled: (id: string) => boolean;
}

const ExtensionContext = createContext<ExtensionContextType | undefined>(undefined);

export function ExtensionProvider({ children }: { children: ReactNode }) {
    const [extensions, setExtensions] = useState<Extension[]>([]);
    const [loading, setLoading] = useState(true);
    const [error, setError] = useState<string | null>(null);

    const refreshExtensions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const data = await extensionService.getAll();
            setExtensions(data);
        } catch (err) {
            console.error('Failed to load extensions:', err);
            setError('Failed to connect to extension service.');
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        refreshExtensions();
        // Optional: Poll every 30s to keep UI in sync if external changes occur
        const interval = setInterval(refreshExtensions, 30000);
        return () => clearInterval(interval);
    }, [refreshExtensions]);

    const isExtensionEnabled = useCallback((id: string) => {
        return extensions.find(e => e.id === id)?.enabled ?? false;
    }, [extensions]);

    return (
        <ExtensionContext.Provider value={{ extensions, loading, error, refreshExtensions, isExtensionEnabled }}>
            {children}
        </ExtensionContext.Provider>
    );
}

export function useExtensions() {
    const context = useContext(ExtensionContext);
    if (context === undefined) {
        throw new Error('useExtensions must be used within an ExtensionProvider');
    }
    return context;
}
