import { useState, useEffect } from 'react';
import { Search, Replace, X, Loader2, FileText, ChevronRight, CheckCircle, AlertCircle } from 'lucide-react';
import { Button } from '@/react-app/components/ui/button';
import { Input } from '@/react-app/components/ui/input';
import { fsService } from '@/services/fsService';

interface ReplaceModalProps {
    isOpen: boolean;
    onClose: () => void;
    rootPath: string;
    onOpenFile: (path: string, line?: number) => void;
}

type ReplaceStatus = 'idle' | 'loading' | 'done' | 'error';

export default function ReplaceModal({ isOpen, onClose, rootPath, onOpenFile }: ReplaceModalProps) {
    const [query, setQuery] = useState('');
    const [replaceText, setReplaceText] = useState('');
    const [results, setResults] = useState<Array<{ path: string, line: number, content: string }>>([]);
    const [selected, setSelected] = useState<Set<string>>(new Set());
    const [loading, setLoading] = useState(false);
    const [searched, setSearched] = useState(false);
    const [replaceStatus, setReplaceStatus] = useState<ReplaceStatus>('idle');
    const [replaceMessage, setReplaceMessage] = useState('');

    useEffect(() => {
        if (isOpen) {
            setQuery('');
            setReplaceText('');
            setResults([]);
            setSearched(false);
            setSelected(new Set());
            setReplaceStatus('idle');
            setReplaceMessage('');
        }
    }, [isOpen]);

    const handleSearch = async () => {
        if (!query.trim() || !rootPath) return;
        setLoading(true);
        setSearched(true);
        setReplaceStatus('idle');
        try {
            const res = await fsService.search(query, rootPath);
            setResults(res || []);
            // Select all by default
            const allKeys = new Set((res || []).map((r, i) => `${r.path}:${r.line}:${i}`));
            setSelected(allKeys);
        } catch (e) {
            console.error("Search failed:", e);
            setResults([]);
        } finally {
            setLoading(false);
        }
    };

    const toggleSelect = (key: string) => {
        setSelected(prev => {
            const next = new Set(prev);
            if (next.has(key)) next.delete(key);
            else next.add(key);
            return next;
        });
    };

    const handleReplaceAll = async () => {
        if (!query || !replaceText && replaceText !== '') return;
        setReplaceStatus('loading');

        // Group selected results by file path
        const byFile = new Map<string, typeof results>();
        results.forEach((r, i) => {
            const key = `${r.path}:${r.line}:${i}`;
            if (!selected.has(key)) return;
            if (!byFile.has(r.path)) byFile.set(r.path, []);
            byFile.get(r.path)!.push(r);
        });

        let failCount = 0;
        let successCount = 0;

        for (const [path] of byFile) {
            try {
                const content = await fsService.readFile(path);
                // Simple global string replace
                const updated = content.split(query).join(replaceText);
                await fsService.writeFile(path, updated);
                successCount++;
            } catch (e) {
                console.error(`Failed to replace in ${path}`, e);
                failCount++;
            }
        }

        if (failCount === 0) {
            setReplaceStatus('done');
            setReplaceMessage(`✅ Replaced in ${successCount} file(s) successfully.`);
        } else {
            setReplaceStatus('error');
            setReplaceMessage(`Replaced in ${successCount} files. ${failCount} file(s) failed.`);
        }
        // Re-search to show updated state
        await handleSearch();
    };

    if (!isOpen) return null;

    return (
        <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 bg-black/50 backdrop-blur-sm" onClick={onClose}>
            <div
                className="w-full max-w-2xl bg-ide-sidebar border border-ide-border rounded-xl shadow-2xl flex flex-col overflow-hidden animate-in fade-in zoom-in-95 duration-200"
                onClick={e => e.stopPropagation()}
            >
                {/* Header */}
                <div className="p-4 border-b border-ide-border">
                    <div className="flex items-center gap-3 mb-3">
                        <Search className="w-5 h-5 text-indigo-400 shrink-0" />
                        <Input
                            value={query}
                            onChange={e => setQuery(e.target.value)}
                            onKeyDown={e => e.key === 'Enter' && handleSearch()}
                            placeholder="Search workspace..."
                            className="flex-1 bg-ide-bg border-ide-border/50 h-9 text-ide-text-primary"
                            autoFocus
                        />
                        <Button onClick={handleSearch} disabled={loading || !query.trim()} size="sm" className="bg-indigo-600 hover:bg-indigo-700 text-white">
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : "Find"}
                        </Button>
                    </div>
                    <div className="flex items-center gap-3">
                        <Replace className="w-5 h-5 text-amber-400 shrink-0" />
                        <Input
                            value={replaceText}
                            onChange={e => setReplaceText(e.target.value)}
                            placeholder="Replace with..."
                            className="flex-1 bg-ide-bg border-ide-border/50 h-9 text-ide-text-primary"
                        />
                        <Button
                            onClick={handleReplaceAll}
                            disabled={replaceStatus === 'loading' || !query.trim() || results.length === 0 || selected.size === 0}
                            size="sm"
                            className="bg-amber-600 hover:bg-amber-700 text-white whitespace-nowrap"
                        >
                            {replaceStatus === 'loading' ? <Loader2 className="w-4 h-4 animate-spin" /> : `Replace (${selected.size})`}
                        </Button>
                        <Button variant="ghost" size="icon" onClick={onClose} className="text-ide-text-secondary hover:text-white shrink-0">
                            <X className="w-4 h-4" />
                        </Button>
                    </div>
                </div>

                {/* Status message */}
                {(replaceStatus === 'done' || replaceStatus === 'error') && (
                    <div className={`flex items-center gap-2 px-4 py-2 text-sm border-b border-ide-border ${replaceStatus === 'done' ? 'text-green-400 bg-green-500/10' : 'text-red-400 bg-red-500/10'}`}>
                        {replaceStatus === 'done' ? <CheckCircle className="w-4 h-4" /> : <AlertCircle className="w-4 h-4" />}
                        {replaceMessage}
                    </div>
                )}

                {/* Results */}
                <div className="flex-1 max-h-[55vh] overflow-y-auto">
                    {!loading && !searched && (
                        <div className="flex flex-col items-center justify-center p-10 text-ide-text-secondary opacity-60">
                            <Replace className="w-10 h-10 mb-3 opacity-40" />
                            <p className="text-sm">Search for text to replace across your workspace</p>
                        </div>
                    )}
                    {loading && (
                        <div className="flex flex-col items-center justify-center p-10 gap-3 text-ide-text-secondary">
                            <Loader2 className="w-8 h-8 animate-spin text-indigo-500" />
                            <p>Searching workspace...</p>
                        </div>
                    )}
                    {!loading && searched && results.length === 0 && (
                        <div className="p-10 text-center text-ide-text-secondary">
                            No results found for "{query}"
                        </div>
                    )}
                    {!loading && results.length > 0 && (
                        <div className="p-2 space-y-1">
                            <div className="px-3 py-2 flex items-center justify-between text-xs font-semibold text-ide-text-secondary uppercase tracking-wider sticky top-0 bg-ide-sidebar z-10 border-b border-ide-border/50">
                                <span>{results.length} results</span>
                                <div className="flex gap-2 normal-case font-normal">
                                    <button onClick={() => setSelected(new Set(results.map((r, i) => `${r.path}:${r.line}:${i}`)))} className="text-indigo-400 hover:underline">All</button>
                                    <span>/</span>
                                    <button onClick={() => setSelected(new Set())} className="text-indigo-400 hover:underline">None</button>
                                </div>
                            </div>
                            {results.map((res, i) => {
                                const key = `${res.path}:${res.line}:${i}`;
                                const relPath = res.path.replace(rootPath, '').replace(/^[/\\]/, '');
                                const isChecked = selected.has(key);
                                return (
                                    <div
                                        key={key}
                                        className={`flex flex-col px-3 py-2.5 rounded-lg cursor-pointer group transition-colors ${isChecked ? 'bg-indigo-500/10' : 'hover:bg-ide-hover'}`}
                                        onClick={() => toggleSelect(key)}
                                    >
                                        <div className="flex items-center justify-between gap-3 mb-1">
                                            <div className="flex items-center gap-2 overflow-hidden flex-1">
                                                <input type="checkbox" checked={isChecked} onChange={() => toggleSelect(key)} className="w-3.5 h-3.5 accent-indigo-500" onClick={e => e.stopPropagation()} />
                                                <FileText className="w-3.5 h-3.5 text-indigo-400 shrink-0" />
                                                <span className="text-xs font-medium text-ide-text-primary truncate">{relPath}</span>
                                            </div>
                                            <div className="flex items-center gap-2">
                                                <span className="text-[10px] text-ide-text-secondary/50 font-mono bg-ide-bg px-1.5 py-0.5 rounded border border-ide-border/50">Line {res.line}</span>
                                                <button
                                                    onClick={e => { e.stopPropagation(); onOpenFile(res.path, res.line); onClose(); }}
                                                    className="text-[10px] text-indigo-400 hover:underline opacity-0 group-hover:opacity-100"
                                                >Open</button>
                                            </div>
                                        </div>
                                        <div className="flex items-start gap-2 pl-7">
                                            <ChevronRight className="w-3 h-3 text-ide-text-secondary/50 shrink-0 mt-0.5" />
                                            <p className="text-xs text-ide-text-secondary font-mono truncate opacity-80">
                                                {res.content.trim()}
                                            </p>
                                        </div>
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}
