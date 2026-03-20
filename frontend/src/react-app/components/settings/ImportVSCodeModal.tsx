import { useState, useEffect, useCallback } from 'react';
import {
    X, Search, Download, Check, CheckCheck, Loader2,
    Package, AlertCircle, Puzzle
} from 'lucide-react';
import { VSCodeExtension } from '@/types/extension';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { cn } from '@/react-app/lib/utils';

import { CONFIG } from '@/react-app/lib/config';

const API_URL = CONFIG.TERMINAL_API_URL;

interface ImportVSCodeModalProps {
    isOpen: boolean;
    onClose: () => void;
    onImported: () => void;
}

export default function ImportVSCodeModal({ isOpen, onClose, onImported }: ImportVSCodeModalProps) {
    const [extensions, setExtensions] = useState<VSCodeExtension[]>([]);
    const [loading, setLoading] = useState(false);
    const [importing, setImporting] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const [searchQuery, setSearchQuery] = useState('');
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [vscodePath, setVscodePath] = useState('');
    const [toast, setToast] = useState<string | null>(null);

    const scanExtensions = useCallback(async () => {
        setLoading(true);
        setError(null);
        try {
            const res = await fetch(`${API_URL}/vscode-extensions`);
            const data = await res.json();
            setExtensions(data.extensions || []);
            setVscodePath(data.path || '');
            if (data.info) setError(data.info);
        } catch (e: any) {
            setError(`Failed to scan: ${e.message}. Is the terminal server running?`);
        } finally {
            setLoading(false);
        }
    }, []);

    useEffect(() => {
        if (isOpen) {
            scanExtensions();
            setSelected(new Set());
            setSearchQuery('');
        }
    }, [isOpen, scanExtensions]);

    useEffect(() => {
        if (toast) {
            const t = setTimeout(() => setToast(null), 3000);
            return () => clearTimeout(t);
        }
    }, [toast]);

    if (!isOpen) return null;

    const q = searchQuery.toLowerCase();
    const filtered = extensions.filter(ext =>
        ext.name.toLowerCase().includes(q) ||
        ext.publisher.toLowerCase().includes(q) ||
        ext.description.toLowerCase().includes(q) ||
        ext.categories.some(c => c.toLowerCase().includes(q))
    );

    const notImported = filtered.filter(e => !e.imported);
    const alreadyImported = filtered.filter(e => e.imported);

    const toggleSelect = (id: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            next.has(id) ? next.delete(id) : next.add(id);
            return next;
        });
    };

    const selectAll = () => {
        const allIds = notImported.map(e => e.id);
        setSelected(prev => {
            const allSelected = allIds.every(id => prev.has(id));
            if (allSelected) return new Set();
            return new Set([...prev, ...allIds]);
        });
    };

    const handleImport = async () => {
        if (selected.size === 0) return;
        setImporting(true);
        try {
            const res = await fetch(`${API_URL}/vscode-extensions/import`, {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ ids: [...selected] }),
            });
            await res.json();
            // setImportedCount removed
            setToast(`✅ Imported ${selected.size} extension(s) successfully!`);
            setSelected(new Set());
            onImported();
            await scanExtensions(); // Refresh to show updated imported status
        } catch (e: any) {
            setToast(`❌ Import failed: ${e.message}`);
        } finally {
            setImporting(false);
        }
    };

    return (
        <div className="fixed inset-0 z-[60] flex items-center justify-center bg-black/60 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-3xl max-h-[85vh] flex flex-col rounded-xl border border-ide-border bg-ide-sidebar shadow-2xl overflow-hidden"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="flex items-center gap-3 px-5 py-4 border-b border-ide-border bg-[rgba(15,17,26,0.5)] flex-shrink-0">
                    <div className="w-9 h-9 rounded-lg bg-indigo-500/15 flex items-center justify-center">
                        <Download className="w-5 h-5 text-indigo-400" />
                    </div>
                    <div className="flex-1 min-w-0">
                        <h2 className="text-sm font-semibold text-ide-text-primary">Import VS Code Extensions</h2>
                        <p className="text-[11px] text-ide-text-secondary mt-0.5 truncate">
                            {vscodePath ? `Scanning: ${vscodePath}` : 'Scanning local VS Code installation…'}
                        </p>
                    </div>
                    <Button variant="ghost" size="icon" onClick={onClose} className="h-7 w-7 text-ide-text-secondary hover:text-white">
                        <X className="w-4 h-4" />
                    </Button>
                </div>

                {/* Search + Actions */}
                <div className="flex items-center gap-2 px-5 py-3 border-b border-ide-border/50 flex-shrink-0">
                    <div className="relative flex-1">
                        <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-ide-text-secondary" />
                        <Input
                            value={searchQuery}
                            onChange={e => setSearchQuery(e.target.value)}
                            placeholder="Search extensions by name, publisher, or category…"
                            className="h-8 pl-8 text-xs bg-[rgba(15,17,26,0.5)] border-ide-border/50"
                        />
                    </div>
                    {notImported.length > 0 && (
                        <Button variant="ghost" onClick={selectAll} className="h-8 px-3 text-xs text-ide-text-secondary hover:text-ide-text-primary gap-1.5">
                            <CheckCheck className="w-3.5 h-3.5" />
                            {notImported.every(e => selected.has(e.id)) ? 'Deselect All' : 'Select All'}
                        </Button>
                    )}
                </div>

                {/* Stats bar */}
                <div className="flex items-center gap-4 px-5 py-2 border-b border-ide-border/30 text-[10px] text-ide-text-secondary bg-[rgba(15,17,26,0.3)] flex-shrink-0">
                    <span className="flex items-center gap-1"><Package className="w-3 h-3" /> {extensions.length} found</span>
                    <span className="flex items-center gap-1"><Check className="w-3 h-3 text-green-400" /> {extensions.filter(e => e.imported).length} imported</span>
                    {selected.size > 0 && (
                        <span className="flex items-center gap-1 text-indigo-400 font-medium">
                            <Puzzle className="w-3 h-3" /> {selected.size} selected
                        </span>
                    )}
                </div>

                {/* Extension List */}
                <div className="flex-1 overflow-y-auto px-3 py-2">
                    {loading && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <Loader2 className="w-8 h-8 text-indigo-400 animate-spin" />
                            <span className="text-sm text-ide-text-secondary">Scanning VS Code extensions…</span>
                        </div>
                    )}

                    {!loading && error && extensions.length === 0 && (
                        <div className="flex flex-col items-center justify-center gap-3 py-16">
                            <AlertCircle className="w-10 h-10 text-yellow-400/50" />
                            <div className="text-center max-w-sm">
                                <p className="text-sm font-medium text-yellow-400">{error}</p>
                                <p className="text-xs text-ide-text-secondary mt-2">
                                    Make sure VS Code is installed and has extensions.
                                </p>
                            </div>
                        </div>
                    )}

                    {!loading && filtered.length === 0 && extensions.length > 0 && (
                        <div className="flex flex-col items-center justify-center gap-2 py-16 text-ide-text-secondary">
                            <Search className="w-8 h-8 opacity-30" />
                            <span className="text-sm">No extensions match "{searchQuery}"</span>
                        </div>
                    )}

                    {/* Not imported yet */}
                    {notImported.length > 0 && (
                        <div className="mb-4">
                            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ide-text-secondary mb-2 px-2">
                                Available to Import ({notImported.length})
                            </h3>
                            <div className="space-y-1">
                                {notImported.map(ext => (
                                    <ExtensionRow
                                        key={ext.id}
                                        ext={ext}
                                        isSelected={selected.has(ext.id)}
                                        onToggle={() => toggleSelect(ext.id)}
                                    />
                                ))}
                            </div>
                        </div>
                    )}

                    {/* Already imported */}
                    {alreadyImported.length > 0 && (
                        <div>
                            <h3 className="text-[10px] font-semibold uppercase tracking-widest text-ide-text-secondary mb-2 px-2 flex items-center gap-1.5">
                                <Check className="w-3 h-3 text-green-400" />
                                Already Imported ({alreadyImported.length})
                            </h3>
                            <div className="space-y-1 opacity-60">
                                {alreadyImported.map(ext => (
                                    <ExtensionRow key={ext.id} ext={ext} isSelected={false} onToggle={() => { }} imported />
                                ))}
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="flex items-center justify-between px-5 py-3 border-t border-ide-border bg-[rgba(15,17,26,0.5)] flex-shrink-0">
                    <span className="text-[11px] text-ide-text-secondary">
                        {selected.size > 0
                            ? `${selected.size} extension(s) selected for import`
                            : 'Select extensions to import them into OLLAMA AI'}
                    </span>
                    <div className="flex items-center gap-2">
                        <Button variant="ghost" onClick={onClose} className="h-8 px-4 text-xs text-ide-text-secondary">
                            Cancel
                        </Button>
                        <Button
                            onClick={handleImport}
                            disabled={selected.size === 0 || importing}
                            className="h-8 px-5 text-xs bg-indigo-600 hover:bg-indigo-700 text-white disabled:opacity-40 gap-1.5"
                        >
                            {importing ? (
                                <><Loader2 className="w-3.5 h-3.5 animate-spin" /> Importing…</>
                            ) : (
                                <><Download className="w-3.5 h-3.5" /> Import {selected.size > 0 ? `(${selected.size})` : ''}</>
                            )}
                        </Button>
                    </div>
                </div>

                {/* Toast */}
                {toast && (
                    <div className="absolute top-4 right-4 z-50 px-4 py-2.5 rounded-lg bg-green-900/90 border border-green-500/30 text-green-300 text-sm font-medium shadow-xl animate-in slide-in-from-top-2">
                        {toast}
                    </div>
                )}
            </div>
        </div>
    );
}

// ─── Extension Row ──────────────────────────────────────────────────────────

function ExtensionRow({
    ext,
    isSelected,
    onToggle,
    imported = false,
}: {
    ext: VSCodeExtension;
    isSelected: boolean;
    onToggle: () => void;
    imported?: boolean;
}) {
    return (
        <div
            onClick={!imported ? onToggle : undefined}
            className={cn(
                'flex items-center gap-3 px-3 py-2.5 rounded-lg border transition-all',
                imported
                    ? 'border-ide-border/30 bg-transparent cursor-default'
                    : isSelected
                        ? 'border-indigo-500/40 bg-indigo-500/10 cursor-pointer shadow-sm shadow-indigo-500/5'
                        : 'border-ide-border/30 bg-ide-sidebar/30 hover:border-ide-border/60 hover:bg-ide-sidebar/60 cursor-pointer'
            )}
        >
            {/* Checkbox / Status */}
            <div className="flex-shrink-0">
                {imported ? (
                    <div className="w-5 h-5 rounded bg-green-500/15 flex items-center justify-center">
                        <Check className="w-3 h-3 text-green-400" />
                    </div>
                ) : (
                    <div className={cn(
                        'w-5 h-5 rounded border-2 flex items-center justify-center transition-colors',
                        isSelected ? 'bg-indigo-600 border-indigo-600' : 'border-ide-border/60 bg-transparent'
                    )}>
                        {isSelected && <Check className="w-3 h-3 text-white" />}
                    </div>
                )}
            </div>

            {/* Icon */}
            <div className="w-8 h-8 rounded-lg bg-[rgba(15,17,26,0.5)] flex items-center justify-center flex-shrink-0 overflow-hidden">
                {ext.icon ? (
                    <img src={ext.icon} alt="" className="w-6 h-6 object-contain" />
                ) : (
                    <Puzzle className="w-4 h-4 text-ide-text-secondary" />
                )}
            </div>

            {/* Info */}
            <div className="flex-1 min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                    <span className="text-[13px] font-medium text-ide-text-primary truncate">{ext.name}</span>
                    <span className="text-[10px] px-1.5 py-0.5 rounded border border-ide-border/40 text-ide-text-secondary font-mono">
                        v{ext.version}
                    </span>
                </div>
                <div className="flex items-center gap-2 mt-0.5">
                    <span className="text-[11px] text-ide-text-secondary">{ext.publisher}</span>
                    {ext.categories.length > 0 && (
                        <span className="text-[10px] text-ide-text-secondary opacity-60">
                            · {ext.categories.slice(0, 2).join(', ')}
                        </span>
                    )}
                </div>
                {ext.description && (
                    <p className="text-[11px] text-ide-text-secondary opacity-70 mt-0.5 truncate">{ext.description}</p>
                )}
            </div>
        </div>
    );
}
