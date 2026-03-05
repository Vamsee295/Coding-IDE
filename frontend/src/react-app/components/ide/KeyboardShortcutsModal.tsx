import { useState } from 'react';
import { X, Search, Keyboard } from 'lucide-react';
import { Input } from '@/react-app/components/ui/input';
import { Button } from '@/react-app/components/ui/button';

const SHORTCUTS = [
    // File
    { category: "File", label: "New File", keys: ["Ctrl", "N"] },
    { category: "File", label: "Open Folder", keys: ["Ctrl", "K", "Ctrl", "O"] },
    { category: "File", label: "Save", keys: ["Ctrl", "S"] },
    { category: "File", label: "Save As", keys: ["Ctrl", "Shift", "S"] },
    { category: "File", label: "Save All", keys: ["Ctrl", "Alt", "S"] },
    { category: "File", label: "Close Editor", keys: ["Ctrl", "W"] },
    { category: "File", label: "Close Folder", keys: ["Ctrl", "K", "F"] },
    { category: "File", label: "New Window", keys: ["Ctrl", "Shift", "N"] },
    // Edit
    { category: "Edit", label: "Undo", keys: ["Ctrl", "Z"] },
    { category: "Edit", label: "Redo", keys: ["Ctrl", "Y"] },
    { category: "Edit", label: "Cut", keys: ["Ctrl", "X"] },
    { category: "Edit", label: "Copy", keys: ["Ctrl", "C"] },
    { category: "Edit", label: "Paste", keys: ["Ctrl", "V"] },
    { category: "Edit", label: "Find", keys: ["Ctrl", "F"] },
    { category: "Edit", label: "Replace", keys: ["Ctrl", "H"] },
    { category: "Edit", label: "Find in Files", keys: ["Ctrl", "Shift", "F"] },
    { category: "Edit", label: "Replace in Files", keys: ["Ctrl", "Shift", "H"] },
    { category: "Edit", label: "Toggle Line Comment", keys: ["Ctrl", "/"] },
    { category: "Edit", label: "Toggle Block Comment", keys: ["Shift", "Alt", "A"] },
    // Selection
    { category: "Selection", label: "Select All", keys: ["Ctrl", "A"] },
    { category: "Selection", label: "Expand Selection", keys: ["Shift", "Alt", "Right"] },
    { category: "Selection", label: "Shrink Selection", keys: ["Shift", "Alt", "Left"] },
    { category: "Selection", label: "Copy Line Up", keys: ["Shift", "Alt", "Up"] },
    { category: "Selection", label: "Copy Line Down", keys: ["Shift", "Alt", "Down"] },
    { category: "Selection", label: "Add Cursor Above", keys: ["Ctrl", "Alt", "Up"] },
    { category: "Selection", label: "Add Cursor Below", keys: ["Ctrl", "Alt", "Down"] },
    { category: "Selection", label: "Add Next Occurrence", keys: ["Ctrl", "D"] },
    // View
    { category: "View", label: "Command Palette", keys: ["Ctrl", "Shift", "P"] },
    { category: "View", label: "Toggle Explorer", keys: ["Ctrl", "Shift", "E"] },
    { category: "View", label: "Toggle Search", keys: ["Ctrl", "Shift", "G"] },
    { category: "View", label: "Toggle Terminal", keys: ["Ctrl", "`"] },
    { category: "View", label: "Toggle AI Chat", keys: ["Ctrl", "Shift", "A"] },
    { category: "View", label: "Word Wrap", keys: ["Alt", "Z"] },
    // Go
    { category: "Go", label: "Go to File", keys: ["Ctrl", "P"] },
    { category: "Go", label: "Go to Definition", keys: ["F12"] },
    { category: "Go", label: "Go to Line", keys: ["Ctrl", "G"] },
    { category: "Go", label: "Go to Symbol in Editor", keys: ["Ctrl", "Shift", "O"] },
    { category: "Go", label: "Next Problem", keys: ["F8"] },
    { category: "Go", label: "Previous Problem", keys: ["Shift", "F8"] },
    // Run / Debug
    { category: "Debug", label: "Start Debugging", keys: ["F5"] },
    { category: "Debug", label: "Run Without Debugging", keys: ["Ctrl", "F5"] },
    { category: "Debug", label: "Stop Debugging", keys: ["Shift", "F5"] },
    { category: "Debug", label: "Step Over", keys: ["F10"] },
    { category: "Debug", label: "Step Into", keys: ["F11"] },
    { category: "Debug", label: "Step Out", keys: ["Shift", "F11"] },
    { category: "Debug", label: "Toggle Breakpoint", keys: ["F9"] },
    // Terminal
    { category: "Terminal", label: "New Terminal", keys: ["Ctrl", "Shift", "`"] },
    { category: "Terminal", label: "Split Terminal", keys: ["Ctrl", "Shift", "5"] },
    { category: "Terminal", label: "Kill Terminal", keys: ["Ctrl", "Shift", "K"] },
];

const CATEGORIES = Array.from(new Set(SHORTCUTS.map(s => s.category)));

interface KeyboardShortcutsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function KeyboardShortcutsModal({ isOpen, onClose }: KeyboardShortcutsModalProps) {
    const [query, setQuery] = useState('');
    const [activeCategory, setActiveCategory] = useState('All');

    if (!isOpen) return null;

    const filtered = SHORTCUTS.filter(s => {
        const matchesCategory = activeCategory === 'All' || s.category === activeCategory;
        const matchesQuery = !query || s.label.toLowerCase().includes(query.toLowerCase()) || s.keys.join('+').toLowerCase().includes(query.toLowerCase());
        return matchesCategory && matchesQuery;
    });

    const grouped = filtered.reduce<Record<string, typeof SHORTCUTS>>((acc, s) => {
        if (!acc[s.category]) acc[s.category] = [];
        acc[s.category].push(s);
        return acc;
    }, {});

    return (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-sm flex items-center justify-center p-6" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-[85vh] bg-ide-sidebar border border-ide-border rounded-2xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 p-4 border-b border-ide-border">
                    <Keyboard className="w-5 h-5 text-indigo-400" />
                    <h2 className="text-sm font-semibold text-ide-text-primary flex-1">Keyboard Shortcuts</h2>
                    <Input
                        value={query}
                        onChange={e => setQuery(e.target.value)}
                        placeholder="Search shortcuts..."
                        className="w-56 bg-ide-bg border-ide-border/50 h-8 text-ide-text-primary text-xs"
                        autoFocus
                    />
                    <Button variant="ghost" size="icon" onClick={onClose} className="text-ide-text-secondary hover:text-white h-7 w-7">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Category pills */}
                <div className="flex items-center gap-2 px-4 py-2 border-b border-ide-border overflow-x-auto">
                    {['All', ...CATEGORIES].map(cat => (
                        <button
                            key={cat}
                            onClick={() => setActiveCategory(cat)}
                            className={`text-xs px-3 py-1 rounded-full whitespace-nowrap transition-colors ${activeCategory === cat
                                    ? 'bg-indigo-600 text-white'
                                    : 'text-ide-text-secondary hover:text-ide-text-primary hover:bg-ide-hover'
                                }`}
                        >
                            {cat}
                        </button>
                    ))}
                </div>

                {/* Shortcuts list */}
                <div className="flex-1 overflow-y-auto divide-y divide-ide-border/40">
                    {Object.entries(grouped).map(([cat, items]) => (
                        <div key={cat}>
                            <div className="px-4 py-2 text-[10px] font-semibold text-ide-text-secondary uppercase tracking-widest bg-ide-bg/50 sticky top-0 z-10">{cat}</div>
                            {items.map((s, i) => (
                                <div key={i} className="flex items-center justify-between px-4 py-2.5 hover:bg-ide-hover transition-colors">
                                    <span className="text-sm text-ide-text-primary">{s.label}</span>
                                    <div className="flex items-center gap-1">
                                        {s.keys.map((k, ki) => (
                                            <span key={ki} className="flex items-center gap-1">
                                                <kbd className="text-[11px] text-ide-text-primary bg-ide-bg px-2 py-0.5 rounded border border-ide-border font-mono shadow-sm">
                                                    {k}
                                                </kbd>
                                                {ki < s.keys.length - 1 && <span className="text-ide-text-secondary/50 text-[10px]">+</span>}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}
                    {filtered.length === 0 && (
                        <div className="flex flex-col items-center justify-center p-12 text-ide-text-secondary">
                            <Search className="w-8 h-8 mb-3 opacity-30" />
                            <p>No shortcuts match "{query}"</p>
                        </div>
                    )}
                </div>

                <div className="px-4 py-2 border-t border-ide-border text-center text-xs text-ide-text-secondary">
                    {filtered.length} shortcut{filtered.length !== 1 ? 's' : ''}
                </div>
            </div>
        </div>
    );
}
