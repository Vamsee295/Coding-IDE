import { createContext, useContext, useState, useCallback, ReactNode } from 'react';

export interface StatusBarItem {
    id: string;
    alignment: 'left' | 'right';
    priority?: number; 
    text: string;
    tooltip?: string;
    icon?: ReactNode;
    command?: string; 
    color?: string;
}

interface StatusBarContextType {
    items: StatusBarItem[];
    registerItem: (item: StatusBarItem) => void;
    unregisterItem: (id: string) => void;
}

const StatusBarContext = createContext<StatusBarContextType | undefined>(undefined);

export function StatusBarProvider({ children }: { children: ReactNode }) {
    const [items, setItems] = useState<StatusBarItem[]>([]);

    const registerItem = useCallback((newItem: StatusBarItem) => {
        setItems(prev => {
            const exists = prev.find(i => i.id === newItem.id);
            if (exists) {
                return prev.map(i => i.id === newItem.id ? newItem : i);
            }
            return [...prev, newItem];
        });
    }, []);

    const unregisterItem = useCallback((id: string) => {
        setItems(prev => prev.filter(i => i.id !== id));
    }, []);

    return (
        <StatusBarContext.Provider value={{ items, registerItem, unregisterItem }}>
            {children}
        </StatusBarContext.Provider>
    );
}

export function useStatusBar() {
    const context = useContext(StatusBarContext);
    if (context === undefined) {
        throw new Error('useStatusBar must be used within a StatusBarProvider');
    }
    return context;
}
